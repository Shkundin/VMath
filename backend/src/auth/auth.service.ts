import { HttpStatus, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Role, UserProfile } from "@vm/shared";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";
import type { VerifiedExternalIdentity } from "./external-auth.types";
import { GoogleIdentityService } from "./google-identity.service";
import { JwtTokenService } from "./jwt-token.service";
import { PasswordService } from "./password.service";
import { VkIdentityService } from "./vk-identity.service";

const DEFAULT_STUDENT_GROUP = "BPI-248";

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

interface TeacherCredentialLoginRow extends QueryResultRow {
  user_id: string;
  login: string;
  password_hash: string;
  credential_is_active: boolean;
  id: string;
  full_name: string;
  role: UserProfile["role"];
  group_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  last_seen_at: string | null;
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
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
};

type AuthenticatedUserRecord = UserRow & {
  auth_password_hash: string;
  auth_source: "users" | "teacher_credentials";
};

interface ExternalIdentityRow extends QueryResultRow {
  user_id: string;
  provider: "google" | "vk";
  provider_subject: string;
  email: string | null;
  display_name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly passwordService: PasswordService,
    private readonly googleIdentityService: GoogleIdentityService,
    private readonly vkIdentityService: VkIdentityService
  ) {}

  async login(params: {
    login: string;
    password: string;
    role?: Role;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await this.findAuthUser(params.login, params.role);

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
      user.auth_password_hash
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

  async registerStudent(input: {
    login: string;
    password: string;
    fullName: string;
    groupName?: string | null;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserProfile> {
    const normalizedLogin = input.login.trim().toLowerCase();
    const normalizedFullName = input.fullName.trim();
    const normalizedGroupName = input.groupName?.trim() || "BPI-248";

    if (normalizedLogin.length < 3) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "Login must be at least 3 characters"
      );
    }

    if (input.password.trim().length < 4) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "Password must be at least 4 characters"
      );
    }

    if (!normalizedFullName) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "fullName is required"
      );
    }

    if (!normalizedGroupName) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "groupName is required for students"
      );
    }

    const existingUser = await this.database.maybeOne<{ id: string; role: Role }>(
      `
        select id, role
        from users
        where lower(login) = lower($1)
      `,
      [normalizedLogin]
    );

    if (existingUser) {
      throw new AppException("CONFLICT", HttpStatus.CONFLICT, "Login already exists");
    }

    const existingTeacherCredential = await this.database.maybeOne<{ user_id: string }>(
      `
        select user_id
        from teacher_credentials
        where lower(login) = lower($1)
      `,
      [normalizedLogin]
    );

    if (existingTeacherCredential) {
      throw new AppException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "Login is reserved for a teacher account"
      );
    }

    const passwordHash = await this.passwordService.hashPassword(input.password.trim());
    const created = await this.database.one<UserRow>(
      `
        insert into users (
          id,
          login,
          password_hash,
          full_name,
          role,
          group_name,
          is_active,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, 'student', $5, true, now(), now())
        returning id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
      `,
      [randomUUID(), normalizedLogin, passwordHash, normalizedFullName, normalizedGroupName]
    );

    return {
      id: created.id,
      login: created.login,
      fullName: created.full_name,
      role: created.role,
      group: created.group_name ?? undefined,
      groupName: created.group_name,
      isActive: created.is_active,
      lastLoginAt: created.last_login_at,
      lastSeenAt: created.last_seen_at
    };
  }

  async loginWithGoogleIdToken(
    idToken: string,
    params: { ipAddress?: string; userAgent?: string }
  ) {
    const identity = await this.googleIdentityService.verifyIdToken(idToken);
    return this.loginWithExternalIdentity(identity, params);
  }

  async loginWithVkCode(
    input: {
      code: string;
      codeVerifier: string;
      deviceId: string;
      redirectUri: string;
      state: string;
    },
    params: { ipAddress?: string; userAgent?: string }
  ) {
    const identity = await this.vkIdentityService.exchangeCode(input);
    return this.loginWithExternalIdentity(identity, params);
  }

  async loginWithVkAccessToken(
    accessToken: string,
    params: { ipAddress?: string; userAgent?: string }
  ) {
    const identity = await this.vkIdentityService.resolveAccessToken(accessToken);
    return this.loginWithExternalIdentity(identity, params);
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

  private async loginWithExternalIdentity(
    identity: VerifiedExternalIdentity,
    params: { ipAddress?: string; userAgent?: string }
  ) {
    const normalizedIdentity = this.normalizeExternalIdentity(identity);

    return this.database.tx(async (client) => {
      let user = await this.findUserByExternalIdentity(
        client,
        normalizedIdentity.provider,
        normalizedIdentity.subject
      );

      if (!user && normalizedIdentity.email) {
        user = await this.findStudentUserByLogin(client, normalizedIdentity.email);
      }

      if (!user) {
        user = await this.createStudentUserFromExternalIdentity(client, normalizedIdentity);
      }

      if (!user.is_active) {
        throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "User is inactive");
      }

      await this.ensureProviderLinkAvailable(client, user.id, normalizedIdentity);
      await this.upsertExternalIdentity(client, user.id, normalizedIdentity);

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
        userAgent: params.userAgent,
        metadata: {
          authMethod: "social",
          provider: normalizedIdentity.provider,
          providerSubject: normalizedIdentity.subject
        }
      });

      return issued;
    });
  }

  private normalizeExternalIdentity(identity: VerifiedExternalIdentity): VerifiedExternalIdentity {
    const email = identity.email?.trim().toLowerCase() || null;
    const fullName =
      identity.fullName.trim() ||
      email ||
      `${identity.provider.toUpperCase()} user ${identity.subject}`;

    return {
      ...identity,
      email,
      fullName
    };
  }

  private async findUserByExternalIdentity(
    client: PoolClient,
    provider: "google" | "vk",
    subject: string
  ): Promise<UserRow | null> {
    const result = await client.query<UserRow>(
      `
        select
          u.id,
          u.login,
          u.password_hash,
          u.full_name,
          u.role,
          u.group_name,
          u.is_active,
          u.last_login_at,
          u.last_seen_at
        from external_identities ei
        inner join users u on u.id = ei.user_id
        where ei.provider = $1 and ei.provider_subject = $2
        limit 1
      `,
      [provider, subject]
    );

    return result.rows[0] ?? null;
  }

  private async findStudentUserByLogin(client: PoolClient, login: string): Promise<UserRow | null> {
    const result = await client.query<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
        from users
        where lower(login) = lower($1)
          and role = 'student'
        limit 1
      `,
      [login]
    );

    return result.rows[0] ?? null;
  }

  private async createStudentUserFromExternalIdentity(
    client: PoolClient,
    identity: VerifiedExternalIdentity
  ): Promise<UserRow> {
    const loginBase = identity.email || `${identity.provider}_${identity.subject}`;
    const resolvedLogin = await this.resolveAvailableLogin(client, loginBase);
    const passwordHash = await this.passwordService.hashPassword(randomUUID());

    const created = await client.query<UserRow>(
      `
        insert into users (
          id,
          login,
          password_hash,
          full_name,
          role,
          group_name,
          is_active,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, 'student', $5, true, now(), now())
        returning id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
      `,
      [
        randomUUID(),
        resolvedLogin,
        passwordHash,
        identity.fullName,
        DEFAULT_STUDENT_GROUP
      ]
    );

    return created.rows[0] as UserRow;
  }

  private async ensureProviderLinkAvailable(
    client: PoolClient,
    userId: string,
    identity: VerifiedExternalIdentity
  ) {
    const existing = await client.query<ExternalIdentityRow>(
      `
        select user_id, provider, provider_subject, email, display_name
        from external_identities
        where user_id = $1 and provider = $2
        limit 1
      `,
      [userId, identity.provider]
    );

    const currentLink = existing.rows[0] ?? null;
    if (currentLink && currentLink.provider_subject !== identity.subject) {
      throw new AppException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        `This ${identity.provider} account is already linked to another profile`
      );
    }
  }

  private async upsertExternalIdentity(
    client: PoolClient,
    userId: string,
    identity: VerifiedExternalIdentity
  ) {
    await client.query(
      `
        insert into external_identities (
          id,
          user_id,
          provider,
          provider_subject,
          email,
          display_name,
          profile_json,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
        on conflict (provider, provider_subject) do update
        set
          email = excluded.email,
          display_name = excluded.display_name,
          profile_json = excluded.profile_json,
          updated_at = now()
      `,
      [
        randomUUID(),
        userId,
        identity.provider,
        identity.subject,
        identity.email ?? null,
        identity.fullName,
        JSON.stringify(identity.profile)
      ]
    );
  }

  private async resolveAvailableLogin(client: PoolClient, rawBase: string): Promise<string> {
    const base = this.sanitizeLoginCandidate(rawBase);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
      const candidate = `${base}${suffix}`.slice(0, 120);

      if (!(await this.isLoginTaken(client, candidate))) {
        return candidate;
      }
    }

    const fallback = `${base.slice(0, 111)}-${randomUUID().slice(0, 8)}`;
    if (await this.isLoginTaken(client, fallback)) {
      throw new AppException("CONFLICT", HttpStatus.CONFLICT, "Could not allocate a login");
    }

    return fallback;
  }

  private sanitizeLoginCandidate(value: string): string {
    const normalized = value.trim().toLowerCase();
    const sanitized = normalized
      .replace(/[^a-z0-9@._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (sanitized.length >= 3) {
      return sanitized.slice(0, 120);
    }

    return `user-${randomUUID().slice(0, 8)}`;
  }

  private async isLoginTaken(client: PoolClient, login: string): Promise<boolean> {
    const result = await client.query<{ exists: number }>(
      `
        select 1 as exists
        from users
        where lower(login) = lower($1)
        union all
        select 1 as exists
        from teacher_credentials
        where lower(login) = lower($1)
        limit 1
      `,
      [login]
    );

    return result.rows.length > 0;
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

  private async findAuthUser(
    login: string,
    requestedRole?: Role
  ): Promise<AuthenticatedUserRecord | null> {
    const normalizedLogin = login.trim().toLowerCase();

    const teacherUser = await this.database.maybeOne<TeacherCredentialLoginRow>(
      `
        select
          tc.user_id,
          tc.login,
          tc.password_hash,
          tc.is_active as credential_is_active,
          u.id,
          u.full_name,
          u.role,
          u.group_name,
          u.is_active,
          u.last_login_at,
          u.last_seen_at
        from teacher_credentials tc
        inner join users u on u.id = tc.user_id
        where lower(tc.login) = lower($1)
      `,
      [normalizedLogin]
    );

    if (teacherUser) {
      if (requestedRole && requestedRole !== "teacher") {
        return null;
      }

      return {
        id: teacherUser.id,
        login: teacherUser.login,
        password_hash: `teacher-credentials-only$${teacherUser.id}`,
        auth_password_hash: teacherUser.password_hash,
        auth_source: "teacher_credentials",
        full_name: teacherUser.full_name,
        role: teacherUser.role,
        group_name: teacherUser.group_name,
        is_active: teacherUser.is_active && teacherUser.credential_is_active,
        last_login_at: teacherUser.last_login_at,
        last_seen_at: teacherUser.last_seen_at
      };
    }

    if (requestedRole === "teacher") {
      return null;
    }

    const user = await this.database.maybeOne<UserRow>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active, last_login_at, last_seen_at
        from users
        where lower(login) = lower($1)
          and role <> 'teacher'
          ${requestedRole ? "and role = $2" : ""}
      `,
      requestedRole ? [normalizedLogin, requestedRole] : [normalizedLogin]
    );

    if (!user) {
      return null;
    }

    return {
      ...user,
      auth_password_hash: user.password_hash,
      auth_source: "users"
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
