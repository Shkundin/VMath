import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  QuizQuestion,
  Role,
  SessionState,
  SessionStatus,
  WsEvent
} from "@vm/shared";
import { randomUUID } from "crypto";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";
import { ResultsService } from "../results/results.service";
import type { SubmissionAnswerInput } from "../results/grading.service";

interface SessionRow extends QueryResultRow {
  id: string;
  lecture_id: string;
  session_code: string;
  teacher_id: string;
  status: SessionStatus;
  current_block_id: string | null;
  event_sequence: number;
  visual_state_schema_version: number | null;
  visual_state: Record<string, unknown> | null;
  updated_at: string;
  started_at: string | null;
  stopped_at: string | null;
}

interface ParticipantRow extends QueryResultRow {
  user_id: string;
  full_name: string;
  role: "student" | "teacher" | "admin";
  status: "connected" | "disconnected" | "idle" | "working" | "submitted";
  connection_status: "connected" | "reconnecting" | "disconnected";
  last_seen_at: string | null;
  joined_at: string;
  left_at: string | null;
}

interface LectureBlockRow extends QueryResultRow {
  id: string;
  lecture_id: string;
  block_type: "text" | "formula" | "image" | "video" | "visual" | "visual_module" | "quiz" | "checking_block";
  title: string | null;
  payload: Record<string, unknown>;
  position_index: number;
}

type SessionPublisher = (sessionId: string, event: WsEvent) => void;

function randomSessionCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class SessionsService {
  private publisher: SessionPublisher | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly resultsService: ResultsService
  ) {}

  attachPublisher(publisher: SessionPublisher) {
    this.publisher = publisher;
  }

  async listActiveSessions(currentUser: AuthenticatedUser) {
    const params: unknown[] = [];
    const where: string[] = [`ls.status = 'active'`];

    if (currentUser.role === "student") {
      params.push("student");
      where.push(`$${params.length} = any(l.available_for_roles)`);
      where.push(`l.status = 'published'`);
    } else if (currentUser.role === "teacher") {
      params.push(currentUser.userId);
      where.push(`ls.teacher_id = $${params.length}`);
    }

    const result = await this.database.query<
      SessionRow & {
        lecture_title: string;
      }
    >(
      `
        select
          ls.id,
          ls.lecture_id,
          ls.session_code,
          ls.teacher_id,
          ls.status,
          ls.current_block_id,
          ls.event_sequence,
          ls.visual_state_schema_version,
          ls.visual_state,
          ls.updated_at,
          ls.started_at,
          ls.stopped_at,
          l.title as lecture_title
        from lesson_sessions ls
        join lectures l on l.id = ls.lecture_id
        where ${where.join(" and ")}
        order by ls.updated_at desc
      `,
      params
    );

    return result.rows.map((row) => ({
      sessionId: row.id,
      sessionCode: row.session_code,
      lectureId: row.lecture_id,
      lectureTitle: row.lecture_title,
      status: row.status,
      updatedAt: row.updated_at
    }));
  }

  async createSession(currentUser: AuthenticatedUser, lectureId: string) {
    this.assertTeacherLike(currentUser);

    const lecture = await this.database.one<{ id: string }>(
      `select id from lectures where id = $1`,
      [lectureId]
    );
    void lecture;

    const firstBlock = await this.database.maybeOne<{ id: string }>(
      `
        select id
        from lecture_blocks
        where lecture_id = $1
        order by position_index asc
        limit 1
      `,
      [lectureId]
    );

    const sessionId = randomUUID();
    const sessionCode = randomSessionCode();

    await this.database.tx(async (client) => {
      await client.query(
        `
          insert into lesson_sessions (
            id,
            lecture_id,
            teacher_id,
            session_code,
            status,
            current_block_id,
            event_sequence,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, 'draft', $5, 0, now(), now())
        `,
        [sessionId, lectureId, currentUser.userId, sessionCode, firstBlock?.id ?? null]
      );

      await client.query(
        `
          insert into session_participants (
            id,
            session_id,
            user_id,
            role,
            status,
            connection_status,
            joined_at,
            last_seen_at,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, 'connected', 'connected', now(), now(), now(), now())
          on conflict (session_id, user_id)
          do update set
            role = excluded.role,
            status = excluded.status,
            connection_status = excluded.connection_status,
            last_seen_at = now(),
            updated_at = now()
        `,
        [randomUUID(), sessionId, currentUser.userId, currentUser.role]
      );
    });

    return this.getSession(currentUser, sessionId);
  }

  async startSession(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);

    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          update lesson_sessions
          set status = 'active', started_at = coalesce(started_at, now()), updated_at = now()
          where id = $1
        `,
        [session.id]
      );

      const state = await this.loadSessionState(session.id, client);
      return this.appendEvent(client, session.id, "SESSION_STARTED", { state }, currentUser.userId);
    });

    const nextState = await this.getSession(currentUser, sessionId);
    this.publish(session.id, {
      type: "SESSION_STARTED",
      payload: {
        sessionId: session.id,
        state: nextState,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return nextState;
  }

  async stopSession(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);

    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          update lesson_sessions
          set status = 'stopped', stopped_at = now(), updated_at = now()
          where id = $1
        `,
        [session.id]
      );

      const state = await this.loadSessionState(session.id, client);
      return this.appendEvent(client, session.id, "SESSION_STOPPED", { state }, currentUser.userId);
    });

    const nextState = await this.getSession(currentUser, sessionId);
    this.publish(session.id, {
      type: "SESSION_STOPPED",
      payload: {
        sessionId: session.id,
        state: nextState,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return nextState;
  }

  async joinSession(
    currentUser: AuthenticatedUser,
    input: { sessionId?: string; sessionCode?: string }
  ): Promise<SessionState> {
    const session = await this.resolveSession(input);

    if (!session) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found");
    }

    if (session.status !== "active" && currentUser.role === "student") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Session is not active");
    }

    await this.assertLectureAccess(currentUser, session.lecture_id);

    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          insert into session_participants (
            id,
            session_id,
            user_id,
            role,
            status,
            connection_status,
            joined_at,
            last_seen_at,
            left_at,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, 'connected', now(), now(), null, now(), now())
          on conflict (session_id, user_id)
          do update set
            role = excluded.role,
            status = case
              when session_participants.status = 'submitted' then session_participants.status
              else excluded.status
            end,
            connection_status = 'connected',
            last_seen_at = now(),
            left_at = null,
            updated_at = now()
        `,
        [
          randomUUID(),
          session.id,
          currentUser.userId,
          currentUser.role,
          currentUser.role === "student" ? "idle" : "connected"
        ]
      );

      const state = await this.loadSessionState(session.id, client);
      return this.appendEvent(client, session.id, "PARTICIPANT_JOINED", { userId: currentUser.userId, state }, currentUser.userId);
    });

    const state = await this.getSession(currentUser, session.id);
    this.publish(session.id, {
      type: "PARTICIPANT_JOINED",
      payload: {
        sessionId: session.id,
        userId: currentUser.userId,
        state,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return state;
  }

  async getSession(currentUser: AuthenticatedUser, sessionIdOrLectureId: string): Promise<SessionState> {
    const session = await this.resolveSession({ sessionId: sessionIdOrLectureId });
    if (!session) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found");
    }

    await this.assertLectureAccess(currentUser, session.lecture_id);
    await this.assertSessionReadAccess(currentUser, session.id, session.teacher_id);
    return this.loadSessionState(session.id);
  }

  async listParticipants(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertTeacherLike(currentUser, session.teacher_id);
    const state = await this.loadSessionState(session.id);
    return state.participants;
  }

  async setCurrentBlock(currentUser: AuthenticatedUser, sessionId: string, blockId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);

    const block = await this.database.maybeOne<LectureBlockRow>(
      `
        select id, lecture_id, block_type, title, payload, position_index
        from lecture_blocks
        where id = $1 and lecture_id = $2
      `,
      [blockId, session.lecture_id]
    );

    if (!block) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Lecture block not found");
    }

    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          update lesson_sessions
          set current_block_id = $2, updated_at = now()
          where id = $1
        `,
        [session.id, block.id]
      );

      return this.appendEvent(
        client,
        session.id,
        "BLOCK_CHANGED",
        { activeBlockId: block.id },
        currentUser.userId
      );
    });

    const state = await this.getSession(currentUser, session.id);
    this.publish(session.id, {
      type: "BLOCK_CHANGED",
      payload: {
        sessionId: session.id,
        activeBlockId: block.id,
        stateVersion: event.sequence,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return state;
  }

  async updateVisualState(
    currentUser: AuthenticatedUser,
    sessionId: string,
    blockId: string,
    schemaVersion: number,
    state: Record<string, unknown>
  ) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);

    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          update lesson_sessions
          set
            visual_state_schema_version = $2,
            visual_state = $3::jsonb,
            updated_at = now()
          where id = $1
        `,
        [session.id, schemaVersion, JSON.stringify(state)]
      );

      return this.appendEvent(
        client,
        session.id,
        "VISUAL_MODULE_STATE_UPDATED",
        {
          blockId,
          visualState: {
            schemaVersion,
            state,
            updatedAt: new Date().toISOString()
          }
        },
        currentUser.userId
      );
    });

    this.publish(session.id, {
      type: "VISUAL_MODULE_STATE_UPDATED",
      payload: {
        sessionId: session.id,
        blockId,
        visualState: {
          schemaVersion,
          state,
          updatedAt: event.ts
        },
        stateVersion: event.sequence,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return this.getSession(currentUser, session.id);
  }

  async markParticipantConnection(
    sessionId: string,
    currentUser: AuthenticatedUser,
    connectionStatus: "connected" | "reconnecting" | "disconnected"
  ) {
    const session = await this.getSessionRow(sessionId);
    const event = await this.database.tx(async (client) => {
      await client.query(
        `
          update session_participants
          set
            connection_status = $3,
            status = case
              when status = 'submitted' then status
              when $3 = 'disconnected' then 'disconnected'
              when $3 = 'connected' then 'idle'
              else status
            end,
            last_seen_at = now(),
            updated_at = now()
          where session_id = $1 and user_id = $2
        `,
        [session.id, currentUser.userId, connectionStatus]
      );

      return this.appendEvent(
        client,
        session.id,
        "PARTICIPANT_STATUS",
        {
          userId: currentUser.userId,
          status: connectionStatus === "disconnected" ? "disconnected" : "idle",
          connectionStatus
        },
        currentUser.userId
      );
    });

    this.publish(session.id, {
      type: "PARTICIPANT_STATUS",
      payload: {
        sessionId: session.id,
        userId: currentUser.userId,
        status: connectionStatus === "disconnected" ? "disconnected" : "idle",
        connectionStatus,
        sequence: event.sequence,
        ts: event.ts
      }
    });
  }

  async startCheckingBlock(
    currentUser: AuthenticatedUser,
    sessionId: string,
    blockId: string,
    timeLimitSec?: number
  ) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);

    const event = await this.database.tx(async (client) =>
      this.appendEvent(
        client,
        session.id,
        "CHECKING_BLOCK_STARTED",
        { blockId, timeLimitSec },
        currentUser.userId
      )
    );

    this.publish(session.id, {
      type: "CHECKING_BLOCK_STARTED",
      payload: {
        sessionId: session.id,
        blockId,
        timeLimitSec,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return { ok: true };
  }

  async submitAnswers(
    currentUser: AuthenticatedUser,
    sessionId: string,
    blockId: string,
    answers: SubmissionAnswerInput[],
    finalize = false
  ) {
    const session = await this.getSessionRow(sessionId);
    if (currentUser.role !== "student") {
      throw new AppException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only students can submit answers"
      );
    }

    await this.assertLectureAccess(currentUser, session.lecture_id);
    await this.assertStudentMembership(session.id, currentUser.userId);

    const block = await this.getBlockForSession(session.lecture_id, blockId);
    const questions = this.extractQuestionsFromBlock(block);

    const submission = await this.database.tx(async (client) => {
      const created = await client.query<{ id: string }>(
        `
          insert into submissions (
            id,
            session_id,
            user_id,
            lecture_block_id,
            status,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, now(), now())
          on conflict (session_id, user_id, lecture_block_id)
          do update set updated_at = now()
          returning id
        `,
        [
          randomUUID(),
          session.id,
          currentUser.userId,
          block.id,
          finalize ? "submitted" : "in_progress"
        ]
      );
      const submissionId = created.rows[0]?.id;
      if (!submissionId) {
        throw new AppException("UNKNOWN", HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create submission");
      }

      for (const answer of answers) {
        await client.query(
          `
            insert into submission_answers (
              id,
              submission_id,
              question_id,
              selected_option_ids,
              answer_text,
              formula_answer,
              is_refused,
              created_at,
              updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, now(), now())
            on conflict (submission_id, question_id)
            do update set
              selected_option_ids = excluded.selected_option_ids,
              answer_text = excluded.answer_text,
              formula_answer = excluded.formula_answer,
              is_refused = excluded.is_refused,
              updated_at = now()
          `,
          [
            randomUUID(),
            submissionId,
            answer.questionId,
            answer.selectedOptionIds ?? [],
            answer.answerText ?? null,
            answer.formulaAnswer ?? null,
            answer.isRefused ?? false
          ]
        );
      }

      await client.query(
        `
          update submissions
          set
            status = $2,
            submitted_at = case when $2 = 'submitted' then now() else submitted_at end,
            updated_at = now()
          where id = $1
        `,
        [submissionId, finalize ? "submitted" : "in_progress"]
      );

      await client.query(
        `
          update session_participants
          set
            status = $3,
            connection_status = 'connected',
            last_seen_at = now(),
            updated_at = now()
          where session_id = $1 and user_id = $2
        `,
        [session.id, currentUser.userId, finalize ? "submitted" : "working"]
      );

      return this.appendEvent(
        client,
        session.id,
        "ANSWER_SUBMITTED",
        { blockId, userId: currentUser.userId, submissionId },
        currentUser.userId
      );
    });

    this.publish(session.id, {
      type: "ANSWER_SUBMITTED",
      payload: {
        sessionId: session.id,
        blockId: block.id,
        userId: currentUser.userId,
        submissionId: submission.payload.submissionId as string,
        sequence: submission.sequence,
        ts: submission.ts
      }
    });

    return {
      ok: true,
      questionsCount: questions.length,
      finalized: finalize
    };
  }

  async finishCheckingBlock(currentUser: AuthenticatedUser, sessionId: string, blockId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertSessionOwner(currentUser, session);
    const block = await this.getBlockForSession(session.lecture_id, blockId);
    const questions = this.extractQuestionsFromBlock(block);

    const summaries = await this.resultsService.publishResults(session.id, block.id, questions);
    const event = await this.database.tx(async (client) =>
      this.appendEvent(
        client,
        session.id,
        "RESULTS_PUBLISHED",
        { blockId: block.id, resultsCount: summaries.length },
        currentUser.userId
      )
    );

    this.publish(session.id, {
      type: "CHECKING_BLOCK_FINISHED",
      payload: {
        sessionId: session.id,
        blockId: block.id,
        sequence: event.sequence,
        ts: event.ts
      }
    });
    this.publish(session.id, {
      type: "RESULTS_PUBLISHED",
      payload: {
        sessionId: session.id,
        blockId: block.id,
        results: summaries,
        sequence: event.sequence,
        ts: event.ts
      }
    });

    return summaries;
  }

  async getResults(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    await this.assertSessionReadAccess(currentUser, session.id, session.teacher_id);
    return this.resultsService.getResults(currentUser, session.id);
  }

  async getStats(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertTeacherLike(currentUser, session.teacher_id);
    return this.resultsService.getStats(currentUser, session.id);
  }

  async exportResults(currentUser: AuthenticatedUser, sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    this.assertTeacherLike(currentUser, session.teacher_id);
    return this.resultsService.exportResultsCsv(currentUser, session.id);
  }

  private async resolveSession(input: { sessionId?: string; sessionCode?: string }) {
    if (input.sessionId) {
      const byId = await this.database.maybeOne<SessionRow>(
        `
          select id, lecture_id, session_code, teacher_id, status, current_block_id, event_sequence,
                 visual_state_schema_version, visual_state, updated_at, started_at, stopped_at
          from lesson_sessions
          where id = $1
        `,
        [input.sessionId]
      );

      if (byId) {
        return byId;
      }

      return this.database.maybeOne<SessionRow>(
        `
          select id, lecture_id, session_code, teacher_id, status, current_block_id, event_sequence,
                 visual_state_schema_version, visual_state, updated_at, started_at, stopped_at
          from lesson_sessions
          where lecture_id = $1
          order by created_at desc
          limit 1
        `,
        [input.sessionId]
      );
    }

    if (input.sessionCode) {
      return this.database.maybeOne<SessionRow>(
        `
          select id, lecture_id, session_code, teacher_id, status, current_block_id, event_sequence,
                 visual_state_schema_version, visual_state, updated_at, started_at, stopped_at
          from lesson_sessions
          where session_code = $1
          order by created_at desc
          limit 1
        `,
        [input.sessionCode.toUpperCase()]
      );
    }

    return null;
  }

  private async getSessionRow(sessionId: string): Promise<SessionRow> {
    const session = await this.database.maybeOne<SessionRow>(
      `
        select id, lecture_id, session_code, teacher_id, status, current_block_id, event_sequence,
               visual_state_schema_version, visual_state, updated_at, started_at, stopped_at
        from lesson_sessions
        where id = $1
      `,
      [sessionId]
    );

    if (!session) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found");
    }

    return session;
  }

  private async loadSessionState(sessionId: string, client?: PoolClient): Promise<SessionState> {
    const runner: {
      query: <T extends QueryResultRow>(text: string, params?: unknown[]) => Promise<QueryResult<T>>;
    } = client
      ? {
          query: (text, params = []) => client.query(text, params)
        }
      : {
          query: (text, params = []) => this.database.query(text, params)
        };
    const session = await runner.query<SessionRow>(
      `
        select id, lecture_id, session_code, teacher_id, status, current_block_id, event_sequence,
               visual_state_schema_version, visual_state, updated_at, started_at, stopped_at
        from lesson_sessions
        where id = $1
      `,
      [sessionId]
    );
    const participants = await runner.query<ParticipantRow>(
      `
        select sp.user_id, u.full_name, sp.role, sp.status, sp.connection_status, sp.last_seen_at, sp.joined_at, sp.left_at
        from session_participants sp
        join users u on u.id = sp.user_id
        where sp.session_id = $1
        order by sp.joined_at asc
      `,
      [sessionId]
    );

    const current = session.rows[0];
    if (!current) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found");
    }

    return {
      sessionId: current.id,
      sessionCode: current.session_code,
      lectureId: current.lecture_id,
      status: current.status,
      activeBlockId: current.current_block_id ?? "",
      participants: participants.rows.map((participant) => ({
        userId: participant.user_id,
        fullName: participant.full_name,
        role: participant.role,
        status: participant.status,
        connectionStatus: participant.connection_status,
        lastSeenAt: participant.last_seen_at ?? undefined,
        joinedAt: participant.joined_at,
        leftAt: participant.left_at
      })),
      updatedAt: current.updated_at,
      startedAt: current.started_at,
      stoppedAt: current.stopped_at,
      stateVersion: current.event_sequence,
      visualState:
        current.visual_state && current.visual_state_schema_version
          ? {
              schemaVersion: current.visual_state_schema_version,
              state: current.visual_state,
              updatedAt: current.updated_at
            }
          : null
    };
  }

  private async appendEvent(
    client: PoolClient,
    sessionId: string,
    eventType: string,
    payload: Record<string, unknown>,
    actorUserId?: string
  ) {
    const ts = new Date().toISOString();
    const sequenceResult = await client.query<{ event_sequence: number }>(
      `
        update lesson_sessions
        set event_sequence = event_sequence + 1, updated_at = now()
        where id = $1
        returning event_sequence
      `,
      [sessionId]
    );
    const sequence = sequenceResult.rows[0]?.event_sequence ?? 0;

    await client.query(
      `
        insert into session_events (
          id,
          session_id,
          sequence,
          event_type,
          actor_user_id,
          payload,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7)
      `,
      [randomUUID(), sessionId, sequence, eventType, actorUserId ?? null, JSON.stringify(payload), ts]
    );

    return {
      sequence,
      ts,
      payload
    };
  }

  private publish(sessionId: string, event: WsEvent) {
    this.publisher?.(sessionId, event);
  }

  private async getBlockForSession(lectureId: string, blockId: string): Promise<LectureBlockRow> {
    const block = await this.database.maybeOne<LectureBlockRow>(
      `
        select id, lecture_id, block_type, title, payload, position_index
        from lecture_blocks
        where id = $1 and lecture_id = $2
      `,
      [blockId, lectureId]
    );

    if (!block) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Session block not found");
    }

    return block;
  }

  private extractQuestionsFromBlock(block: LectureBlockRow): QuizQuestion[] {
    const rawQuestions = Array.isArray(block.payload.questions)
      ? (block.payload.questions as Array<Record<string, unknown>>)
      : [];

    return rawQuestions.map((question) => ({
      id: String(question.id),
      type:
        question.type === "multi" || question.type === "short" || question.type === "numeric"
          ? question.type
          : "single",
      text: String(question.text ?? ""),
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            id: String((option as { id?: unknown }).id ?? ""),
            text: String((option as { text?: unknown }).text ?? ""),
            isCorrect: Boolean((option as { isCorrect?: unknown }).isCorrect)
          }))
        : [],
      correctOptionId:
        typeof question.correctOptionId === "string" ? question.correctOptionId : undefined,
      correctOptionIds: Array.isArray(question.correctOptionIds)
        ? question.correctOptionIds.map((value) => String(value))
        : undefined,
      correctAnswerText:
        typeof question.correctAnswerText === "string" ? question.correctAnswerText : undefined,
      allowFormulaAnswer: Boolean(question.allowFormulaAnswer)
    }));
  }

  private async assertLectureAccess(currentUser: AuthenticatedUser, lectureId: string) {
    const lecture = await this.database.maybeOne<{
      author_id: string;
      status: string;
      available_for_roles: Role[];
    }>(
      `
        select author_id, status, available_for_roles
        from lectures
        where id = $1
      `,
      [lectureId]
    );

    if (!lecture) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Lecture not found");
    }

    if (currentUser.role === "admin") {
      return;
    }

    if (lecture.author_id === currentUser.userId) {
      return;
    }

    if (lecture.status !== "published" || !lecture.available_for_roles.includes(currentUser.role)) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Lecture is not available");
    }
  }

  private assertTeacherLike(currentUser: AuthenticatedUser, ownerId?: string) {
    if (currentUser.role === "admin") {
      return;
    }

    if (currentUser.role !== "teacher") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Teacher permissions required");
    }

    if (ownerId && ownerId !== currentUser.userId) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Session belongs to another teacher");
    }
  }

  private assertSessionOwner(currentUser: AuthenticatedUser, session: SessionRow) {
    this.assertTeacherLike(currentUser, session.teacher_id);
  }

  private async assertSessionReadAccess(
    currentUser: AuthenticatedUser,
    sessionId: string,
    teacherId: string
  ) {
    if (currentUser.role === "admin" || teacherId === currentUser.userId) {
      return;
    }

    if (currentUser.role === "student") {
      await this.assertStudentMembership(sessionId, currentUser.userId);
      return;
    }

    throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Session access denied");
  }

  private async assertStudentMembership(sessionId: string, userId: string) {
    const participant = await this.database.maybeOne<{ user_id: string }>(
      `
        select user_id
        from session_participants
        where session_id = $1 and user_id = $2
      `,
      [sessionId, userId]
    );

    if (!participant) {
      throw new AppException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Join the session before reading its state or submitting answers"
      );
    }
  }
}
