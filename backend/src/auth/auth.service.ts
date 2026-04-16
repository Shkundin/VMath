import { HttpStatus, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Role, UserProfile } from "@vm/shared";
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
  last_login_at: string | null;
  last_seen_at: string | null;
}

interface RefreshTokenRow extends QueryResultRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_token_id: string | null;
}

interface UserAuthEventInsert {
  userId?: string | null;
  login: string;
  role?: Role | null;
  fullName?: string | null;
  eventType: "login" | "refresh" | "logout" | "login_failed";
  status: "success" | "failed";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

type QueryRunner = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

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
        select id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
        from users
        where lower(login) = lower($1)
      `,
      [params.login]
    );

    if (!user || !user.is_active) {
      await this.recordAuthEvent(this.database, {
        userId: user?.id ?? null,
        login: params.login.trim().toLowerCase(),
        role: user?.role ?? null,
        fullName: user?.full_name ?? null,
        eventType: "login_failed",
        status: "failed",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          reason: user ? "inactive_user" : "user_not_found"
        }
      });
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      params.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      await this.recordAuthEvent(this.database, {
        userId: user.id,
        login: user.login,
        role: user.role,
        fullName: user.full_name,
        eventType: "login_failed",
        status: "failed",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          reason: "password_mismatch"
        }
      });
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    return this.database.tx(async (client) => {
      const issued = await this.issueTokens(
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
        }
      );

      await this.touchUserActivity(client, user.id, { updateLoginAt: true });
      await this.recordAuthEvent(client, {
        userId: user.id,
        login: user.login,
        role: user.role,
        fullName: user.full_name,
        eventType: "login",
        status: "success",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      return issued;
    });
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
        select id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
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
          set revoked_at = now(), last_used_at = now(), updated_at = now()
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

      await this.touchUserActivity(client, user.id);
      await this.recordAuthEvent(client, {
        userId: user.id,
        login: user.login,
        role: user.role,
        fullName: user.full_name,
        eventType: "refresh",
        status: "success",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          previousSessionId: currentSession.id,
          nextSessionId: next.refreshSessionId
        }
      });

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

      await this.touchUserActivity(this.database, params.currentUser.userId);
      await this.recordAuthEvent(this.database, {
        userId: params.currentUser.userId,
        login: params.currentUser.login,
        role: params.currentUser.role,
        eventType: "logout",
        status: "success",
        metadata: {
          allSessions: true
        }
      });

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

    if (params.currentUser) {
      await this.touchUserActivity(this.database, params.currentUser.userId);
      await this.recordAuthEvent(this.database, {
        userId: params.currentUser.userId,
        login: params.currentUser.login,
        role: params.currentUser.role,
        eventType: "logout",
        status: "success",
        metadata: {
          allSessions: Boolean(params.allSessions),
          sessionId: params.currentUser.sessionId ?? null
        }
      });
    }

    return { ok: true };
  }

  async getProfile(currentUser: AuthenticatedUser): Promise<UserProfile> {
    const user = await this.database.maybeOne<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
        from users
        where id = $1 and is_active = true
      `,
      [currentUser.userId]
    );

    if (!user) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "User not found");
    }

    await this.touchUserActivity(this.database, user.id);

    return {
      id: user.id,
      login: user.login,
      fullName: user.full_name,
      role: user.role,
      group: user.group_name ?? undefined,
      groupName: user.group_name,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      lastSeenAt: new Date().toISOString()
    };
  }

  private async touchUserActivity(
    database: QueryRunner,
    userId: string,
    options: { updateLoginAt?: boolean } = {}
  ) {
    await database.query(
      `
        update users
        set
          last_seen_at = now(),
          last_login_at = case when $2::boolean then now() else last_login_at end,
          updated_at = now()
        where id = $1
      `,
      [userId, options.updateLoginAt ?? false]
    );
  }

  private async recordAuthEvent(database: QueryRunner, event: UserAuthEventInsert) {
    await database.query(
      `
        insert into user_auth_events (
          id,
          user_id,
          login,
          role,
          full_name,
          event_type,
          status,
          ip_address,
          user_agent,
          metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, now())
      `,
      [
        randomUUID(),
        event.userId ?? null,
        event.login.trim().toLowerCase(),
        event.role ?? null,
        event.fullName ?? null,
        event.eventType,
        event.status,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        JSON.stringify(event.metadata ?? {})
      ]
    );
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
