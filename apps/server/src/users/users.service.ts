import { HttpStatus, Injectable } from "@nestjs/common";
import type { Role, UserProfile } from "@vm/shared";
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
  created_at: string;
  updated_at: string;
}

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
      where.push(`(lower(login) like $${params.length} or lower(full_name) like $${params.length})`);
    }

    if (filters.role) {
      params.push(filters.role);
      where.push(`role = $${params.length}`);
    }

    if (filters.groupName) {
      params.push(filters.groupName);
      where.push(`group_name = $${params.length}`);
    }

    if (typeof filters.isActive === "boolean") {
      params.push(filters.isActive);
      where.push(`is_active = $${params.length}`);
    }

    const result = await this.database.query<UserRow>(
      `
        select id, login, full_name, role, group_name, is_active, created_at, updated_at
        from users
        ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
        order by created_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapUser(row));
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
    await this.ensureLoginIsUnique(input.login);

    const passwordHash = await this.passwordService.hashPassword(input.password);
    const user = await this.database.one<UserRow>(
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
        returning id, login, full_name, role, group_name, is_active, created_at, updated_at
      `,
      [
        randomUUID(),
        input.login.trim().toLowerCase(),
        passwordHash,
        input.fullName.trim(),
        input.role,
        input.groupName?.trim() || null,
        input.isActive ?? true
      ]
    );

    return this.mapUser(user);
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
    const current = await this.database.maybeOne<UserRow & { password_hash: string }>(
      `
        select id, login, password_hash, full_name, role, group_name, is_active, created_at, updated_at
        from users
        where id = $1
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

    const passwordHash =
      input.password && input.password.trim().length > 0
        ? await this.passwordService.hashPassword(input.password)
        : current.password_hash;

    const updated = await this.database.one<UserRow>(
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
        returning id, login, full_name, role, group_name, is_active, created_at, updated_at
      `,
      [
        current.id,
        (input.login ?? current.login).trim().toLowerCase(),
        passwordHash,
        (input.fullName ?? current.full_name).trim(),
        nextRole,
        nextGroupName?.trim() || null,
        input.isActive ?? current.is_active
      ]
    );

    return this.mapUser(updated);
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
      updatedAt: row.updated_at
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
}
