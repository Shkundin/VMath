import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  LectureBlock,
  LectureDetails,
  LectureLevel,
  LectureSummary,
  ModuleType,
  Role
} from "@vm/shared";
import { randomUUID } from "crypto";
import type { QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";

interface LectureRow extends QueryResultRow {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  subject_code: string | null;
  subject_name: string | null;
  author_id: string;
  author_login: string;
  author_name: string;
  semester: number | null;
  level: LectureLevel | null;
  tags: string[] | null;
  status: "draft" | "published" | "archived";
  available_for_roles: Role[] | null;
  updated_at: string;
}

interface LectureBlockRow extends QueryResultRow {
  id: string;
  lecture_id: string;
  module_id: string | null;
  block_type: LectureBlock["type"];
  title: string | null;
  position_index: number;
  payload: Record<string, unknown>;
}

interface ModuleReferenceRow extends QueryResultRow {
  id: string;
  author_id: string;
  module_type: ModuleType;
  content: Record<string, unknown>;
}

function mapModuleTypeToBlockType(moduleType: ModuleType): LectureBlock["type"] {
  if (moduleType === "text") {
    return "text";
  }

  if (moduleType === "visual_module") {
    return "visual_module";
  }

  if (moduleType === "questionnaire") {
    return "quiz";
  }

  return "checking_block";
}

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags.map((value) => String(value).trim()).filter(Boolean)
    : [];
}

@Injectable()
export class LecturesService {
  constructor(private readonly database: DatabaseService) {}

  async listLectures(
    currentUser: AuthenticatedUser,
    query: {
      q?: string;
      subjectId?: string;
      subjectCode?: string;
      semester?: number;
      level?: LectureLevel;
      authorId?: string;
      tag?: string;
    }
  ): Promise<LectureSummary[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    this.applyVisibilityFilter(currentUser, where, params);

    if (query.q) {
      params.push(`%${query.q.trim().toLowerCase()}%`);
      where.push(
        `(lower(l.title) like $${params.length} or lower(coalesce(l.description, '')) like $${params.length} or lower(coalesce(u.full_name, '')) like $${params.length} or exists (select 1 from unnest(l.tags) tag where lower(tag) like $${params.length}))`
      );
    }

    if (query.subjectId) {
      params.push(query.subjectId);
      where.push(`l.subject_id = $${params.length}`);
    }

    if (query.subjectCode) {
      params.push(query.subjectCode);
      where.push(`s.code = $${params.length}`);
    }

    if (query.semester) {
      params.push(query.semester);
      where.push(`l.semester = $${params.length}`);
    }

    if (query.level) {
      params.push(query.level);
      where.push(`l.level = $${params.length}`);
    }

    if (query.authorId) {
      params.push(query.authorId);
      where.push(`l.author_id = $${params.length}`);
    }

    if (query.tag) {
      params.push(query.tag);
      where.push(`$${params.length} = any(l.tags)`);
    }

    const result = await this.database.query<LectureRow>(
      `
        select
          l.id,
          l.title,
          l.description,
          l.subject_id,
          s.code as subject_code,
          s.title as subject_name,
          l.author_id,
          u.login as author_login,
          u.full_name as author_name,
          l.semester,
          l.level,
          l.tags,
          l.status,
          l.available_for_roles,
          l.updated_at
        from lectures l
        join users u on u.id = l.author_id
        left join subjects s on s.id = l.subject_id
        ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
        order by l.updated_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapLectureSummary(row));
  }

  async getLecture(currentUser: AuthenticatedUser, lectureId: string): Promise<LectureDetails> {
    const lecture = await this.getLectureRow(currentUser, lectureId);
    const blocks = await this.getLectureBlocksRows(lectureId);

    return {
      ...this.mapLectureSummary(lecture),
      blocks: blocks.map((block) => this.mapBlock(block))
    };
  }

  async getLectureBlocks(currentUser: AuthenticatedUser, lectureId: string): Promise<LectureBlock[]> {
    await this.getLectureRow(currentUser, lectureId);
    const blocks = await this.getLectureBlocksRows(lectureId);
    return blocks.map((block) => this.mapBlock(block));
  }

  async createLecture(
    currentUser: AuthenticatedUser,
    input: {
      title: string;
      description?: string;
      subjectId?: string;
      semester?: number;
      level?: LectureLevel;
      tags?: string[];
      status?: "draft" | "published" | "archived";
      availableForRoles?: Role[];
      blocks: Array<{
        title?: string;
        type?: LectureBlock["type"];
        moduleId?: string;
        payload?: Record<string, unknown>;
      }>;
    }
  ): Promise<LectureDetails> {
    this.assertCanManage(currentUser);

    if (!input.title.trim()) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Lecture title is required");
    }

    const lectureId = randomUUID();
    const status = input.status ?? "draft";
    const roles = input.availableForRoles?.length ? input.availableForRoles : ["student", "teacher"];

    await this.database.tx(async (client) => {
      await client.query(
        `
          insert into lectures (
            id,
            title,
            description,
            subject_id,
            author_id,
            semester,
            level,
            tags,
            status,
            available_for_roles,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        `,
        [
          lectureId,
          input.title.trim(),
          input.description?.trim() || null,
          input.subjectId ?? null,
          currentUser.userId,
          input.semester ?? null,
          input.level ?? "basic",
          normalizeTags(input.tags),
          status,
          roles
        ]
      );

      await this.replaceLectureBlocks(client, currentUser, lectureId, input.blocks);
    });

    return this.getLecture(currentUser, lectureId);
  }

  async updateLecture(
    currentUser: AuthenticatedUser,
    lectureId: string,
    input: {
      title?: string;
      description?: string;
      subjectId?: string | null;
      semester?: number | null;
      level?: LectureLevel;
      tags?: string[];
      status?: "draft" | "published" | "archived";
      availableForRoles?: Role[];
      blocks?: Array<{
        title?: string;
        type?: LectureBlock["type"];
        moduleId?: string;
        payload?: Record<string, unknown>;
      }>;
    }
  ): Promise<LectureDetails> {
    const current = await this.getLectureRow(currentUser, lectureId, true);
    this.assertCanManage(currentUser, current.author_id);

    if (input.blocks) {
      const usage = await this.database.one<{ total: string }>(
        `
          select count(*)::text as total
          from lesson_sessions
          where lecture_id = $1
        `,
        [lectureId]
      );

      if (Number(usage.total) > 0) {
        throw new AppException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          "Lecture blocks cannot be replaced after sessions have been created"
        );
      }
    }

    await this.database.tx(async (client) => {
      await client.query(
        `
          update lectures
          set
            title = $2,
            description = $3,
            subject_id = $4,
            semester = $5,
            level = $6,
            tags = $7,
            status = $8,
            available_for_roles = $9,
            updated_at = now()
          where id = $1
        `,
        [
          lectureId,
          input.title?.trim() || current.title,
          input.description !== undefined ? input.description?.trim() || null : current.description,
          input.subjectId !== undefined ? input.subjectId : current.subject_id,
          input.semester !== undefined ? input.semester : current.semester,
          input.level ?? current.level,
          normalizeTags(input.tags ?? current.tags ?? []),
          input.status ?? current.status,
          input.availableForRoles ?? current.available_for_roles ?? ["student", "teacher"]
        ]
      );

      if (input.blocks) {
        await client.query(`delete from lecture_blocks where lecture_id = $1`, [lectureId]);
        await this.replaceLectureBlocks(client, currentUser, lectureId, input.blocks);
      }
    });

    return this.getLecture(currentUser, lectureId);
  }

  private async replaceLectureBlocks(
    client: {
      query: (text: string, params?: unknown[]) => Promise<unknown>;
    },
    currentUser: AuthenticatedUser,
    lectureId: string,
    blocks: Array<{
      title?: string;
      type?: LectureBlock["type"];
      moduleId?: string;
      payload?: Record<string, unknown>;
    }>
  ) {
    for (const [index, block] of blocks.entries()) {
      const resolved = await this.resolveBlockInput(currentUser, block);
      await client.query(
        `
          insert into lecture_blocks (
            id,
            lecture_id,
            module_id,
            block_type,
            title,
            position_index,
            payload,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
        `,
        [
          randomUUID(),
          lectureId,
          resolved.moduleId,
          resolved.type,
          block.title?.trim() || null,
          index,
          JSON.stringify(resolved.payload)
        ]
      );
    }
  }

  private async resolveBlockInput(
    currentUser: AuthenticatedUser,
    block: {
      type?: LectureBlock["type"];
      moduleId?: string;
      payload?: Record<string, unknown>;
    }
  ): Promise<{ moduleId: string | null; type: LectureBlock["type"]; payload: Record<string, unknown> }> {
    if (block.moduleId) {
      const moduleRef = await this.database.maybeOne<ModuleReferenceRow>(
        `
          select id, author_id, module_type, content
          from modules
          where id = $1
        `,
        [block.moduleId]
      );

      if (!moduleRef) {
        throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Referenced module not found");
      }

      if (currentUser.role !== "admin" && moduleRef.author_id !== currentUser.userId) {
        throw new AppException(
          "FORBIDDEN",
          HttpStatus.FORBIDDEN,
          "Cannot use another teacher's module"
        );
      }

      return {
        moduleId: moduleRef.id,
        type: mapModuleTypeToBlockType(moduleRef.module_type),
        payload: moduleRef.content
      };
    }

    if (!block.type || !block.payload) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "Block type and payload are required for direct lecture blocks"
      );
    }

    return {
      moduleId: null,
      type: block.type,
      payload: block.payload
    };
  }

  private mapLectureSummary(row: LectureRow): LectureSummary {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      tags: row.tags ?? [],
      updatedAt: row.updated_at,
      authorId: row.author_id,
      authorLogin: row.author_login,
      authorName: row.author_name,
      subjectId: row.subject_id ?? undefined,
      subjectCode: row.subject_code ?? undefined,
      subjectName: row.subject_name ?? undefined,
      semester: row.semester ?? undefined,
      level: row.level ?? undefined,
      status: row.status,
      availableForRoles: row.available_for_roles ?? ["student", "teacher"]
    };
  }

  private mapBlock(row: LectureBlockRow): LectureBlock {
    return {
      id: row.id,
      moduleId: row.module_id ?? undefined,
      type: row.block_type,
      title: row.title ?? undefined,
      order: row.position_index,
      payload: row.payload
    } as LectureBlock;
  }

  private async getLectureRow(
    currentUser: AuthenticatedUser,
    lectureId: string,
    allowManagement = false
  ): Promise<LectureRow> {
    const params: unknown[] = [lectureId];
    const where: string[] = [`l.id = $1`];

    if (!allowManagement) {
      this.applyVisibilityFilter(currentUser, where, params);
    }

    const lecture = await this.database.maybeOne<LectureRow>(
      `
        select
          l.id,
          l.title,
          l.description,
          l.subject_id,
          s.code as subject_code,
          s.title as subject_name,
          l.author_id,
          u.login as author_login,
          u.full_name as author_name,
          l.semester,
          l.level,
          l.tags,
          l.status,
          l.available_for_roles,
          l.updated_at
        from lectures l
        join users u on u.id = l.author_id
        left join subjects s on s.id = l.subject_id
        where ${where.join(" and ")}
      `,
      params
    );

    if (!lecture) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Lecture not found");
    }

    return lecture;
  }

  private async getLectureBlocksRows(lectureId: string): Promise<LectureBlockRow[]> {
    const result = await this.database.query<LectureBlockRow>(
      `
        select id, lecture_id, module_id, block_type, title, position_index, payload
        from lecture_blocks
        where lecture_id = $1
        order by position_index asc
      `,
      [lectureId]
    );

    return result.rows;
  }

  private applyVisibilityFilter(
    currentUser: AuthenticatedUser,
    where: string[],
    params: unknown[]
  ) {
    if (currentUser.role === "admin") {
      return;
    }

    params.push(currentUser.userId);
    const authorIndex = params.length;

    if (currentUser.role === "teacher") {
      params.push("teacher");
      params.push("student");
      where.push(
        `(
          l.author_id = $${authorIndex}
          or (
            l.status = 'published'
            and (
              $${authorIndex + 1} = any(l.available_for_roles)
              or $${authorIndex + 2} = any(l.available_for_roles)
            )
          )
        )`
      );
      return;
    }

    params.push("student");
    where.push(
      `(l.status = 'published' and $${authorIndex + 1} = any(l.available_for_roles))`
    );
  }

  private assertCanManage(currentUser: AuthenticatedUser, ownerId?: string) {
    if (currentUser.role === "admin") {
      return;
    }

    if (currentUser.role !== "teacher") {
      throw new AppException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only teachers and admins can manage lectures"
      );
    }

    if (ownerId && ownerId !== currentUser.userId) {
      throw new AppException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Lecture belongs to another teacher"
      );
    }
  }
}
