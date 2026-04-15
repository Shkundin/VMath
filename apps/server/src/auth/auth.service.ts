import { HttpStatus, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { UserProfile } from "@vm/shared";
import type { QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { JwtTokenService } from "./jwt-token.service";
import { PasswordService } from "./password.service";

interface UserRow extends QueryResultRow {
  id: string;
  login: string;
  password_hash: string;
  full_name: string;
  role: UserProfile["role"];
  group_name: string | null;
  is_active: boolean;
}

interface RefreshTokenRow extends QueryResultRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_token_id: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly passwordService: PasswordService
  ) {}

  async login(params: {
    login: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await this.database.maybeOne<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active
        from users
        where lower(login) = lower($1)
      `,
      [params.login]
    );

    if (!user || !user.is_active) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      params.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    return this.issueTokens(user, params);
  }

  async refresh(refreshToken: string, params: { ipAddress?: string; userAgent?: string }) {
    const payload = this.jwtTokenService.verifyRefreshToken(refreshToken);
    const tokenHash = this.passwordService.hashToken(refreshToken);

    const currentSession = await this.database.maybeOne<RefreshTokenRow>(
      `
        select id, user_id, token_hash, expires_at, revoked_at, replaced_by_token_id
        from refresh_tokens
        where id = $1
      `,
      [payload.sid]
    );

    if (!currentSession || currentSession.user_id !== payload.sub) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Refresh session not found");
    }

    if (currentSession.revoked_at) {
      await this.database.query(
        `
          update refresh_tokens
          set revoked_at = coalesce(revoked_at, now())
          where user_id = $1 and revoked_at is null
        `,
        [payload.sub]
      );

      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Refresh token already revoked");
    }

    if (currentSession.token_hash !== tokenHash) {
      await this.database.query(
        `
          update refresh_tokens
          set revoked_at = coalesce(revoked_at, now())
          where user_id = $1 and revoked_at is null
        `,
        [payload.sub]
      );

      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Refresh token mismatch");
    }

    const user = await this.database.one<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active
        from users
        where id = $1
      `,
      [payload.sub]
    );

    if (!user.is_active) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "User is inactive");
    }

    return this.database.tx(async (client) => {
      await client.query(
        `
          update refresh_tokens
          set revoked_at = now(), last_used_at = now()
          where id = $1
        `,
        [currentSession.id]
      );

      const next = await this.issueTokens(
        user,
        params,
        async (values) => {
          await client.query(
            `
              insert into refresh_tokens (
                id,
                user_id,
                token_hash,
                user_agent,
                ip_address,
                expires_at,
                replaced_by_token_id,
                created_at,
                updated_at
              ) values ($1, $2, $3, $4, $5, $6, $7, now(), now())
            `,
            values
          );
        },
        currentSession.id
      );

      await client.query(
        `
          update refresh_tokens
          set replaced_by_token_id = $2, updated_at = now()
          where id = $1
        `,
        [currentSession.id, next.refreshSessionId]
      );

      return next;
    });
  }

  async logout(params: { currentUser?: AuthenticatedUser; refreshToken?: string; allSessions?: boolean }) {
    if (params.allSessions && params.currentUser) {
      await this.database.query(
        `
          update refresh_tokens
          set revoked_at = coalesce(revoked_at, now()), updated_at = now()
          where user_id = $1 and revoked_at is null
        `,
        [params.currentUser.userId]
      );

      return { ok: true };
    }

    if (params.refreshToken) {
      try {
        const payload = this.jwtTokenService.verifyRefreshToken(params.refreshToken);
        const tokenHash = this.passwordService.hashToken(params.refreshToken);

        await this.database.query(
          `
            update refresh_tokens
            set revoked_at = coalesce(revoked_at, now()), updated_at = now()
            where id = $1 and user_id = $2 and token_hash = $3 and revoked_at is null
          `,
          [payload.sid, payload.sub, tokenHash]
        );
      } catch {
        return { ok: true };
      }
    } else if (params.currentUser?.sessionId) {
      await this.database.query(
        `
          update refresh_tokens
          set revoked_at = coalesce(revoked_at, now()), updated_at = now()
          where id = $1 and user_id = $2 and revoked_at is null
        `,
        [params.currentUser.sessionId, params.currentUser.userId]
      );
    }

    return { ok: true };
  }

  async getProfile(currentUser: AuthenticatedUser): Promise<UserProfile> {
    const user = await this.database.maybeOne<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active
        from users
        where id = $1 and is_active = true
      `,
      [currentUser.userId]
    );

    if (!user) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "User not found");
    }

    return {
      id: user.id,
      login: user.login,
      fullName: user.full_name,
      role: user.role,
      group: user.group_name ?? undefined,
      groupName: user.group_name,
      isActive: user.is_active
    };
  }

  private async issueTokens(
    user: UserRow,
    params: { ipAddress?: string; userAgent?: string },
    insertOverride?: (values: unknown[]) => Promise<void>,
    replacedByTokenId?: string | null
  ) {
    const refreshSessionId = randomUUID();
    const accessToken = this.jwtTokenService.issueAccessToken({
      id: user.id,
      login: user.login,
      role: user.role,
      refreshSessionId
    });
    const refreshToken = this.jwtTokenService.issueRefreshToken({
      id: user.id,
      login: user.login,
      role: user.role,
      refreshSessionId
    });
    const tokenHash = this.passwordService.hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.jwtTokenService.refreshTokenTtlSec * 1000
    ).toISOString();

    const values = [
      refreshSessionId,
      user.id,
      tokenHash,
      params.userAgent ?? null,
      params.ipAddress ?? null,
      expiresAt,
      replacedByTokenId ?? null
    ];

    if (insertOverride) {
      await insertOverride(values);
    } else {
      await this.database.query(
        `
          insert into refresh_tokens (
            id,
            user_id,
            token_hash,
            user_agent,
            ip_address,
            expires_at,
            replaced_by_token_id,
            created_at,
            updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, now(), now())
        `,
        values
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresInSec: this.jwtTokenService.accessTokenTtlSec,
      refreshSessionId
    };
  }
}
