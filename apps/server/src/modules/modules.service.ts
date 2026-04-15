import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AssetMetadata,
  ModuleDetails,
  ModuleSummary,
  ModuleType,
  QuizOption,
  QuizQuestion
} from "@vm/shared";
import { randomUUID } from "crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";

interface ModuleRow extends QueryResultRow {
  id: string;
  title: string;
  description: string | null;
  module_type: ModuleType;
  subject_id: string | null;
  subject_code: string | null;
  author_id: string;
  author_name: string;
  tags: string[] | null;
  content: Record<string, unknown>;
  illustration_metadata: AssetMetadata | null;
  asset_metadata: AssetMetadata[] | null;
  updated_at: string;
}

interface QuestionRow extends QueryResultRow {
  id: string;
  questionnaire_id: string | null;
  prompt: string;
  question_type: QuizQuestion["type"];
  correct_answer_text: string | null;
  allow_formula_answer: boolean;
  explanation: string | null;
  position_index: number;
}

interface OptionRow extends QueryResultRow {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  position_index: number;
}

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags
        .map((value) => String(value).trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
}

function toUuidOrRandom(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : randomUUID();
}

function normalizeQuestion(input: Record<string, unknown>, order: number): QuizQuestion {
  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const optionIdMap = new Map<string, string>();
  const options = rawOptions.map((option, index) => {
    const rawId = String((option as { id?: unknown }).id ?? "");
    const nextId = toUuidOrRandom(rawId);
    if (rawId) {
      optionIdMap.set(rawId, nextId);
    }

    return {
      id: nextId,
      text: String((option as { text?: unknown }).text ?? "").trim(),
      isCorrect: Boolean((option as { isCorrect?: unknown }).isCorrect),
      order: index
    };
  });

  const rawCorrectOptionId = typeof input.correctOptionId === "string" ? input.correctOptionId : undefined;
  const rawCorrectOptionIds = Array.isArray(input.correctOptionIds)
    ? input.correctOptionIds.map((value) => String(value))
    : undefined;

  return {
    id: toUuidOrRandom(input.id),
    type:
      input.type === "multi" || input.type === "short" || input.type === "numeric"
        ? input.type
        : "single",
    text: String(input.text ?? input.prompt ?? "").trim(),
    options,
    correctOptionId: rawCorrectOptionId
      ? optionIdMap.get(rawCorrectOptionId) ?? rawCorrectOptionId
      : undefined,
    correctOptionIds: rawCorrectOptionIds
      ? rawCorrectOptionIds.map((value) => optionIdMap.get(value) ?? value)
      : undefined,
    correctAnswerText:
      typeof input.correctAnswerText === "string" ? input.correctAnswerText : undefined,
    correctAnswerHint:
      typeof input.correctAnswerHint === "string" ? input.correctAnswerHint : undefined,
    allowFormulaAnswer: Boolean(input.allowFormulaAnswer),
    explanation: typeof input.explanation === "string" ? input.explanation : undefined,
    order
  };
}

@Injectable()
export class ModulesService {
  constructor(private readonly database: DatabaseService) {}

  async listModules(currentUser: AuthenticatedUser, filters: { moduleType?: ModuleType; q?: string }) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (currentUser.role !== "admin") {
      params.push(currentUser.userId);
      where.push(`m.author_id = $${params.length}`);
    }

    if (filters.moduleType) {
      params.push(filters.moduleType);
      where.push(`m.module_type = $${params.length}`);
    }

    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      where.push(`(lower(m.title) like $${params.length} or lower(coalesce(m.description, '')) like $${params.length})`);
    }

    const result = await this.database.query<ModuleRow>(
      `
        select
          m.id,
          m.title,
          m.description,
          m.module_type,
          m.subject_id,
          s.code as subject_code,
          m.author_id,
          u.full_name as author_name,
          m.tags,
          m.content,
          m.illustration_metadata,
          m.asset_metadata,
          m.updated_at
        from modules m
        join users u on u.id = m.author_id
        left join subjects s on s.id = m.subject_id
        ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
        order by m.updated_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapModuleSummary(row));
  }

  async getModule(currentUser: AuthenticatedUser, moduleId: string): Promise<ModuleDetails> {
    const row = await this.getModuleRow(currentUser, moduleId);
    return this.mapModuleDetails(row);
  }

  async createModule(
    currentUser: AuthenticatedUser,
    input: {
      title: string;
      description?: string;
      moduleType: ModuleType;
      subjectId?: string;
      tags?: string[];
      content: Record<string, unknown>;
      illustration?: AssetMetadata | null;
      assetMetadata?: AssetMetadata[];
    }
  ): Promise<ModuleDetails> {
    this.assertCanManage(currentUser);
    this.validateModuleInput(input);

    const moduleId = randomUUID();
    const content = await this.normalizeAndPersistModuleContent(
      currentUser,
      moduleId,
      input.moduleType,
      input.content
    );

    const row = await this.database.one<ModuleRow>(
      `
        insert into modules (
          id,
          title,
          description,
          module_type,
          subject_id,
          author_id,
          tags,
          content,
          illustration_metadata,
          asset_metadata,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, now(), now())
        returning
          id,
          title,
          description,
          module_type,
          subject_id,
          null::text as subject_code,
          author_id,
          (select full_name from users where id = $6) as author_name,
          tags,
          content,
          illustration_metadata,
          asset_metadata,
          updated_at
      `,
      [
        moduleId,
        input.title.trim(),
        input.description?.trim() || null,
        input.moduleType,
        input.subjectId ?? null,
        currentUser.userId,
        normalizeTags(input.tags),
        JSON.stringify(content),
        JSON.stringify(input.illustration ?? null),
        JSON.stringify(input.assetMetadata ?? [])
      ]
    );

    return this.mapModuleDetails(row);
  }

  async updateModule(
    currentUser: AuthenticatedUser,
    moduleId: string,
    input: {
      title?: string;
      description?: string;
      subjectId?: string | null;
      tags?: string[];
      content?: Record<string, unknown>;
      illustration?: AssetMetadata | null;
      assetMetadata?: AssetMetadata[];
    }
  ): Promise<ModuleDetails> {
    const current = await this.getModuleRow(currentUser, moduleId);
    this.assertCanManage(currentUser, current.author_id);

    if (input.content) {
      const usage = await this.database.one<{ total: string }>(
        `select count(*)::text as total from lecture_blocks where module_id = $1`,
        [moduleId]
      );

      if (Number(usage.total) > 0) {
        throw new AppException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          "Cannot structurally update a module that is already attached to lecture blocks"
        );
      }
    }

    const nextContent = input.content
      ? await this.normalizeAndPersistModuleContent(
          currentUser,
          moduleId,
          current.module_type,
          input.content,
          true
        )
      : current.content;

    const updated = await this.database.one<ModuleRow>(
      `
        update modules
        set
          title = $2,
          description = $3,
          subject_id = $4,
          tags = $5,
          content = $6::jsonb,
          illustration_metadata = $7::jsonb,
          asset_metadata = $8::jsonb,
          updated_at = now()
        where id = $1
        returning
          id,
          title,
          description,
          module_type,
          subject_id,
          null::text as subject_code,
          author_id,
          (select full_name from users where id = author_id) as author_name,
          tags,
          content,
          illustration_metadata,
          asset_metadata,
          updated_at
      `,
      [
        moduleId,
        input.title?.trim() || current.title,
        input.description !== undefined ? input.description?.trim() || null : current.description,
        input.subjectId !== undefined ? input.subjectId : current.subject_id,
        normalizeTags(input.tags ?? current.tags ?? []),
        JSON.stringify(nextContent),
        JSON.stringify(input.illustration ?? current.illustration_metadata ?? null),
        JSON.stringify(input.assetMetadata ?? current.asset_metadata ?? [])
      ]
    );

    return this.mapModuleDetails(updated);
  }

  private async getModuleRow(currentUser: AuthenticatedUser, moduleId: string): Promise<ModuleRow> {
    const row = await this.database.maybeOne<ModuleRow>(
      `
        select
          m.id,
          m.title,
          m.description,
          m.module_type,
          m.subject_id,
          s.code as subject_code,
          m.author_id,
          u.full_name as author_name,
          m.tags,
          m.content,
          m.illustration_metadata,
          m.asset_metadata,
          m.updated_at
        from modules m
        join users u on u.id = m.author_id
        left join subjects s on s.id = m.subject_id
        where m.id = $1
      `,
      [moduleId]
    );

    if (!row) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Module not found");
    }

    this.assertCanManage(currentUser, row.author_id, true);
    return row;
  }

  private mapModuleSummary(row: ModuleRow): ModuleSummary {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      moduleType: row.module_type,
      subjectId: row.subject_id ?? undefined,
      subjectCode: row.subject_code ?? undefined,
      authorId: row.author_id,
      authorName: row.author_name,
      tags: row.tags ?? [],
      updatedAt: row.updated_at
    };
  }

  private mapModuleDetails(row: ModuleRow): ModuleDetails {
    return {
      ...this.mapModuleSummary(row),
      content: row.content,
      illustration: row.illustration_metadata,
      assetMetadata: row.asset_metadata ?? []
    };
  }

  private assertCanManage(
    currentUser: AuthenticatedUser,
    ownerId?: string,
    allowRead = false
  ) {
    if (currentUser.role === "admin") {
      return;
    }

    if (currentUser.role !== "teacher") {
      throw new AppException(
        allowRead ? "FORBIDDEN" : "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only teachers and admins can manage modules"
      );
    }

    if (ownerId && ownerId !== currentUser.userId) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Module belongs to another teacher");
    }
  }

  private validateModuleInput(input: {
    title: string;
    moduleType: ModuleType;
    content: Record<string, unknown>;
  }) {
    if (!input.title.trim()) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Module title is required");
    }

    if (!input.content || typeof input.content !== "object") {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Module content is required");
    }
  }

  private async normalizeAndPersistModuleContent(
    currentUser: AuthenticatedUser,
    moduleId: string,
    moduleType: ModuleType,
    content: Record<string, unknown>,
    clearPrevious = false
  ): Promise<Record<string, unknown>> {
    if (clearPrevious) {
      await this.clearModuleRelations(moduleId);
    }

    if (moduleType === "text") {
      return {
        markdown: String(content.markdown ?? "").trim()
      };
    }

    if (moduleType === "visual_module") {
      await this.database.query(
        `
          insert into visual_modules (
            id,
            module_id,
            schema_version,
            config,
            state,
            asset_metadata,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, now(), now())
          on conflict (module_id)
          do update set
            schema_version = excluded.schema_version,
            config = excluded.config,
            state = excluded.state,
            asset_metadata = excluded.asset_metadata,
            updated_at = now()
        `,
        [
          randomUUID(),
          moduleId,
          Number(content.schemaVersion ?? 1),
          JSON.stringify(content.scene ?? {}),
          JSON.stringify(content.state ?? null),
          JSON.stringify(content.assetMetadata ?? [])
        ]
      );

      return {
        scene: content.scene ?? {},
        caption: typeof content.caption === "string" ? content.caption : "",
        schemaVersion: Number(content.schemaVersion ?? 1),
        state: content.state ?? null,
        assetMetadata: Array.isArray(content.assetMetadata) ? content.assetMetadata : []
      };
    }

    if (moduleType === "questionnaire") {
      const questionnaireId = randomUUID();
      const questions = Array.isArray(content.questions)
        ? content.questions.map((item, index) => normalizeQuestion(item as Record<string, unknown>, index))
        : [];

      await this.persistQuestionnaire({
        authorId: currentUser.userId,
        moduleId,
        questionnaireId,
        title: String(content.title ?? content.name ?? "Questionnaire").trim(),
        description: String(content.description ?? "").trim(),
        questions
      });

      return {
        questionnaireId,
        title: String(content.title ?? content.name ?? "Questionnaire").trim(),
        description: String(content.description ?? "").trim(),
        questions
      };
    }

    const questions = await this.resolveCheckingBlockQuestions(content);
    const checkingBlockId = randomUUID();

    await this.persistCheckingBlock({
      checkingBlockId,
      moduleId,
      title: String(content.title ?? "Checking block").trim(),
      description: String(content.description ?? "").trim(),
      timeLimitSec: content.timeLimitSec ? Number(content.timeLimitSec) : null,
      allowRefuseToAnswer: Boolean(content.allowRefuseToAnswer),
      questions
    });

    return {
      checkingBlockId,
      title: String(content.title ?? "Checking block").trim(),
      description: String(content.description ?? "").trim(),
      timeLimitSec: content.timeLimitSec ? Number(content.timeLimitSec) : undefined,
      allowRefuseToAnswer: Boolean(content.allowRefuseToAnswer),
      scoring: {
        correct: 1,
        incorrectPenaltyDivisor: 4,
        skip: 0
      },
      questions
    };
  }

  private async clearModuleRelations(moduleId: string) {
    await this.database.query(`delete from visual_modules where module_id = $1`, [moduleId]);
    await this.database.query(`delete from checking_block_items where checking_block_id in (select id from checking_blocks where module_id = $1)`, [moduleId]);
    await this.database.query(`delete from checking_blocks where module_id = $1`, [moduleId]);
    await this.database.query(`delete from question_options where question_id in (select id from questions where questionnaire_id in (select id from questionnaires where module_id = $1))`, [moduleId]);
    await this.database.query(`delete from questions where questionnaire_id in (select id from questionnaires where module_id = $1)`, [moduleId]);
    await this.database.query(`delete from questionnaires where module_id = $1`, [moduleId]);
  }

  private async persistQuestionnaire(input: {
    authorId: string;
    moduleId: string;
    questionnaireId: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
  }) {
    await this.database.tx(async (client) => {
      await client.query(
        `
          insert into questionnaires (
            id,
            module_id,
            title,
            description,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, now(), now())
        `,
        [input.questionnaireId, input.moduleId, input.title, input.description ?? null]
      );

      for (const [index, question] of input.questions.entries()) {
        const questionId = question.id || randomUUID();
        await client.query(
          `
            insert into questions (
              id,
              questionnaire_id,
              author_id,
              prompt,
              question_type,
              correct_answer_text,
              allow_formula_answer,
              explanation,
              position_index,
              created_at,
              updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
          `,
          [
            questionId,
            input.questionnaireId,
            input.authorId,
            question.text,
            question.type,
            question.correctAnswerText ?? null,
            question.allowFormulaAnswer ?? false,
            question.explanation ?? question.correctAnswerHint ?? null,
            index
          ]
        );

        for (const [optionIndex, option] of (question.options ?? []).entries()) {
          await client.query(
            `
              insert into question_options (
                id,
                question_id,
                option_text,
                is_correct,
                position_index,
                created_at,
                updated_at
              )
              values ($1, $2, $3, $4, $5, now(), now())
            `,
            [
              option.id || randomUUID(),
              questionId,
              option.text,
              this.isCorrectOption(question, option),
              optionIndex
            ]
          );
        }
      }
    });
  }

  private async persistCheckingBlock(input: {
    checkingBlockId: string;
    moduleId: string;
    title: string;
    description?: string;
    timeLimitSec: number | null;
    allowRefuseToAnswer: boolean;
    questions: QuizQuestion[];
  }) {
    await this.database.tx(async (client) => {
      await client.query(
        `
          insert into checking_blocks (
            id,
            module_id,
            title,
            description,
            timer_sec,
            allow_refuse_to_answer,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, now(), now())
        `,
        [
          input.checkingBlockId,
          input.moduleId,
          input.title,
          input.description ?? null,
          input.timeLimitSec,
          input.allowRefuseToAnswer
        ]
      );

      for (const [index, question] of input.questions.entries()) {
        await client.query(
          `
            insert into checking_block_items (
              id,
              checking_block_id,
              question_id,
              position_index,
              created_at,
              updated_at
            )
            values ($1, $2, $3, $4, now(), now())
          `,
          [randomUUID(), input.checkingBlockId, question.id, index]
        );
      }
    });
  }

  private async resolveCheckingBlockQuestions(content: Record<string, unknown>): Promise<QuizQuestion[]> {
    const inlineQuestions = Array.isArray(content.questions)
      ? content.questions.map((item, index) => normalizeQuestion(item as Record<string, unknown>, index))
      : [];

    const questionIds = Array.isArray(content.questionIds)
      ? content.questionIds.map((value) => String(value))
      : [];
    const questionnaireIds = Array.isArray(content.questionnaireIds)
      ? content.questionnaireIds.map((value) => String(value))
      : [];

    const linkedQuestions =
      questionIds.length > 0 || questionnaireIds.length > 0
        ? await this.loadQuestionsFromReferences(questionIds, questionnaireIds)
        : [];

    if (inlineQuestions.length === 0 && linkedQuestions.length === 0) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "Checking block requires at least one question"
      );
    }

    return [...linkedQuestions, ...inlineQuestions];
  }

  private async loadQuestionsFromReferences(
    questionIds: string[],
    questionnaireIds: string[]
  ): Promise<QuizQuestion[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    if (questionIds.length > 0) {
      params.push(questionIds);
      where.push(`q.id = any($${params.length}::uuid[])`);
    }

    if (questionnaireIds.length > 0) {
      params.push(questionnaireIds);
      where.push(`q.questionnaire_id = any($${params.length}::uuid[])`);
    }

    const questions = await this.database.query<QuestionRow>(
      `
        select
          q.id,
          q.questionnaire_id,
          q.prompt,
          q.question_type,
          q.correct_answer_text,
          q.allow_formula_answer,
          q.explanation,
          q.position_index
        from questions q
        where ${where.join(" or ")}
        order by q.position_index asc, q.created_at asc
      `,
      params
    );

    if (questions.rows.length === 0) {
      return [];
    }

    const options = await this.database.query<OptionRow>(
      `
        select id, question_id, option_text, is_correct, position_index
        from question_options
        where question_id = any($1::uuid[])
        order by position_index asc
      `,
      [questions.rows.map((question) => question.id)]
    );

    const optionsByQuestionId = new Map<string, QuizOption[]>();
    for (const option of options.rows) {
      const current = optionsByQuestionId.get(option.question_id) ?? [];
      current.push({
        id: option.id,
        text: option.option_text,
        isCorrect: option.is_correct,
        order: option.position_index
      });
      optionsByQuestionId.set(option.question_id, current);
    }

    return questions.rows.map((question) => {
      const questionOptions = optionsByQuestionId.get(question.id) ?? [];
      return {
        id: question.id,
        type: question.question_type,
        text: question.prompt,
        options: questionOptions,
        correctOptionId: question.question_type === "single"
          ? questionOptions.find((option) => option.isCorrect)?.id
          : undefined,
        correctOptionIds:
          question.question_type === "multi"
            ? questionOptions.filter((option) => option.isCorrect).map((option) => option.id)
            : undefined,
        correctAnswerText: question.correct_answer_text ?? undefined,
        allowFormulaAnswer: question.allow_formula_answer,
        explanation: question.explanation ?? undefined,
        order: question.position_index
      };
    });
  }

  private isCorrectOption(question: QuizQuestion, option: QuizOption): boolean {
    if (question.type === "single") {
      return option.id === question.correctOptionId || option.isCorrect === true;
    }

    if (question.type === "multi") {
      return question.correctOptionIds?.includes(option.id) || option.isCorrect === true;
    }

    return option.isCorrect === true;
  }
}
