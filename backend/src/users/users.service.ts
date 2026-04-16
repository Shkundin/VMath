import { HttpStatus, Injectable } from "@nestjs/common";
import type { Role, UserAuthEventView, UserProfile } from "@vm/shared";
import { randomUUID } from "crypto";
import type { QueryResultRow } from "pg";
import { AppException } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { PasswordService } from "../auth/password.service";

interface UserRow extends QueryResultRow {
  id: string;
  login: string;
  full_name: string;
  role: Role;
  group_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  last_seen_at: string | null;
  active_session_count: number;
  created_at: string;
  updated_at: string;
}

interface UserAuthEventRow extends QueryResultRow {
  id: string;
  user_id: string | null;
  login: string;
  full_name: string | null;
  role: Role | null;
  event_type: UserAuthEventView["eventType"];
  status: UserAuthEventView["status"];
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UserWithCredentialRow extends UserRow {
  password_hash: string;
  teacher_password_hash: string | null;
}

type QueryRunner = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwordService: PasswordService
  ) {}

  async listUsers(filters: {
    q?: string;
    role?: Role;
    groupName?: string;
    isActive?: boolean;
  }): Promise<UserProfile[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      where.push(
        `(lower(u.login) like $${params.length} or lower(u.full_name) like $${params.length})`
      );
    }

    if (filters.role) {
      params.push(filters.role);
      where.push(`u.role = $${params.length}`);
    }

    if (filters.groupName) {
      params.push(filters.groupName);
      where.push(`u.group_name = $${params.length}`);
    }

    if (typeof filters.isActive === "boolean") {
      params.push(filters.isActive);
      where.push(`u.is_active = $${params.length}`);
    }

    const result = await this.database.query<UserRow>(
      `
        select
          u.id,
          u.login,
          u.full_name,
          u.role,
          u.group_name,
          u.is_active,
          u.last_login_at,
          u.last_seen_at,
          coalesce(rt.active_session_count, 0)::int as active_session_count,
          u.created_at,
          u.updated_at
        from users u
        left join (
          select user_id, count(*)::int as active_session_count
          from refresh_tokens
          where revoked_at is null
            and expires_at > now()
          group by user_id
        ) rt on rt.user_id = u.id
        ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
        order by u.created_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapUser(row));
  }

  async listAuthEvents(filters: {
    q?: string;
    userId?: string;
    eventType?: UserAuthEventView["eventType"];
    status?: UserAuthEventView["status"];
    limit?: number;
  }): Promise<UserAuthEventView[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      where.push(
        `(lower(login) like $${params.length} or lower(coalesce(full_name, '')) like $${params.length})`
      );
    }

    if (filters.userId) {
      params.push(filters.userId);
      where.push(`user_id = $${params.length}`);
    }

    if (filters.eventType) {
      params.push(filters.eventType);
      where.push(`event_type = $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }

    params.push(Math.min(Math.max(filters.limit ?? 100, 1), 500));

    const result = await this.database.query<UserAuthEventRow>(
      `
        select
          id,
          user_id,
          login,
          full_name,
          role,
          event_type,
          status,
          ip_address,
          user_agent,
          created_at
        from user_auth_events
        ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
        order by created_at desc
        limit $${params.length}
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      login: row.login,
      fullName: row.full_name,
      role: row.role,
      eventType: row.event_type,
      status: row.status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));
  }

  async createUser(input: {
    login: string;
    password: string;
    fullName: string;
    role: Role;
    groupName?: string | null;
    isActive?: boolean;
  }): Promise<UserProfile> {
    this.assertStudentGroupRule(input.role, input.groupName);
    const normalizedLogin = input.login.trim().toLowerCase();
    await this.ensureLoginIsUnique(normalizedLogin);

    const passwordHash = await this.passwordService.hashPassword(input.password);

    return this.database.tx(async (client) => {
      const user = await this.oneWithRunner<UserRow>(
        client,
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
          values ($1, $2, $3, $4, $5, $6, $7, now(), now())
          returning
            id,
            login,
            full_name,
            role,
            group_name,
            is_active,
            last_login_at,
            last_seen_at,
            0::int as active_session_count,
            created_at,
            updated_at
        `,
        [
          randomUUID(),
          normalizedLogin,
          input.role === "teacher" ? this.createTeacherPasswordPlaceholder(normalizedLogin) : passwordHash,
          input.fullName.trim(),
          input.role,
          input.groupName?.trim() || null,
          input.isActive ?? true
        ]
      );

      if (input.role === "teacher") {
        await this.upsertTeacherCredential(client, {
          userId: user.id,
          login: normalizedLogin,
          passwordHash,
          isActive: input.isActive ?? true
        });
      }

      return this.mapUser(user);
    });
  }

  async updateUser(
    userId: string,
    input: {
      login?: string;
      password?: string;
      fullName?: string;
      role?: Role;
      groupName?: string | null;
      isActive?: boolean;
    }
  ): Promise<UserProfile> {
    const current = await this.database.maybeOne<UserWithCredentialRow>(
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
          u.last_seen_at,
          tc.password_hash as teacher_password_hash,
          0::int as active_session_count,
          u.created_at,
          u.updated_at
        from users u
        left join teacher_credentials tc on tc.user_id = u.id
        where u.id = $1
      `,
      [userId]
    );

    if (!current) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "User not found");
    }

    const nextRole = input.role ?? current.role;
    const nextGroupName = input.groupName !== undefined ? input.groupName : current.group_name;
    this.assertStudentGroupRule(nextRole, nextGroupName);

    if (input.login && input.login.trim().toLowerCase() !== current.login.toLowerCase()) {
      await this.ensureLoginIsUnique(input.login, current.id);
    }

    const nextLogin = (input.login ?? current.login).trim().toLowerCase();
    const nextIsActive = input.isActive ?? current.is_active;
    const nextFullName = (input.fullName ?? current.full_name).trim();
    const nextTeacherPasswordHash =
      input.password && input.password.trim().length > 0
        ? await this.passwordService.hashPassword(input.password)
        : current.teacher_password_hash ?? current.password_hash;
    const nextPasswordHash =
      nextRole === "teacher"
        ? this.createTeacherPasswordPlaceholder(nextLogin)
        : input.password && input.password.trim().length > 0
          ? await this.passwordService.hashPassword(input.password)
          : current.role === "teacher"
            ? current.teacher_password_hash ?? current.password_hash
            : current.password_hash;

    return this.database.tx(async (client) => {
      const updated = await this.oneWithRunner<UserRow>(
        client,
        `
          update users
          set
            login = $2,
            password_hash = $3,
            full_name = $4,
            role = $5,
            group_name = $6,
            is_active = $7,
            updated_at = now()
          where id = $1
          returning
            id,
            login,
            full_name,
            role,
            group_name,
            is_active,
            last_login_at,
            last_seen_at,
            0::int as active_session_count,
            created_at,
            updated_at
        `,
        [
          current.id,
          nextLogin,
          nextPasswordHash,
          nextFullName,
          nextRole,
          nextGroupName?.trim() || null,
          nextIsActive
        ]
      );

      if (nextRole === "teacher") {
        await this.upsertTeacherCredential(client, {
          userId: current.id,
          login: nextLogin,
          passwordHash: nextTeacherPasswordHash,
          isActive: nextIsActive
        });
      } else if (current.role === "teacher") {
        await client.query(`delete from teacher_credentials where user_id = $1`, [current.id]);
      }

      return this.mapUser(updated);
    });
  }

  private mapUser(row: UserRow): UserProfile {
    return {
      id: row.id,
      login: row.login,
      fullName: row.full_name,
      role: row.role,
      group: row.group_name ?? undefined,
      groupName: row.group_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      lastSeenAt: row.last_seen_at,
      activeSessionCount: Number(row.active_session_count ?? 0)
    };
  }

  private assertStudentGroupRule(role: Role, groupName?: string | null) {
    if (role === "student" && !(groupName?.trim())) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "groupName is required for students"
      );
    }
  }

  private async ensureLoginIsUnique(login: string, excludeUserId?: string) {
    const existing = await this.database.maybeOne<{ id: string }>(
      `
        select id
        from users
        where lower(login) = lower($1)
          ${excludeUserId ? "and id <> $2" : ""}
      `,
      excludeUserId ? [login.trim(), excludeUserId] : [login.trim()]
    );

    if (existing) {
      throw new AppException("CONFLICT", HttpStatus.CONFLICT, "Login already exists");
    }
  }

  private createTeacherPasswordPlaceholder(login: string): string {
    return `teacher-credentials-only$${login}`;
  }

  private async upsertTeacherCredential(
    runner: QueryRunner,
    input: { userId: string; login: string; passwordHash: string; isActive: boolean }
  ) {
    await runner.query(
      `
        insert into teacher_credentials (
          user_id,
          login,
          password_hash,
          is_active,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, now(), now())
        on conflict (user_id) do update
        set
          login = excluded.login,
          password_hash = excluded.password_hash,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [input.userId, input.login, input.passwordHash, input.isActive]
    );
  }

  private async oneWithRunner<T extends QueryResultRow = QueryResultRow>(
    runner: QueryRunner,
    text: string,
    params: unknown[] = []
  ): Promise<T> {
    const result = await runner.query<T>(text, params);
    if (!result.rows[0]) {
      throw new Error(`Expected one row for query: ${text}`);
    }

    return result.rows[0];
  }
}
