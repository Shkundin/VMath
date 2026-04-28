import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  ClassroomHomeworkSubmissionView,
  ClassroomHomeworkView,
  ClassroomMeetingView,
  ClassroomResourceKind,
  ClassroomResourceView,
  ClassroomTestingAnswerKey,
  ClassroomTestingQuestionView,
  ClassroomTestingSessionView,
  ClassroomTestingSubmissionView,
  TeacherBranchSummary
} from "@vm/shared";
import { randomUUID } from "crypto";
import type { QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";

interface TeacherRow extends QueryResultRow {
  id: string;
  login: string;
  full_name: string;
  lecture_count: string;
}

interface MeetingRow extends QueryResultRow {
  id: string;
  title: string;
  platform: string;
  url: string;
  scheduled_at: string;
  duration_min: number;
  description: string;
  created_at: string;
  teacher_login: string;
  teacher_name: string;
}

interface HomeworkRow extends QueryResultRow {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  due_at: string;
  allowed_formats: string[];
  max_score: string | number;
  created_at: string;
  teacher_login: string;
  teacher_name: string;
}

interface HomeworkSubmissionRow extends QueryResultRow {
  id: string;
  homework_id: string;
  teacher_id: string;
  teacher_login: string;
  student_id: string;
  student_login: string;
  student_name: string;
  file_name: string;
  file_type: string;
  file_data: string;
  submitted_at: string;
  teacher_comment: string;
  score: string | number | null;
}

interface ResourceRow extends QueryResultRow {
  id: string;
  teacher_id: string;
  teacher_login: string;
  teacher_name: string;
  kind: ClassroomResourceKind;
  title: string;
  url: string;
  note: string;
  file_name: string | null;
  file_type: string | null;
  file_data: string | null;
  mime_type: string | null;
  created_at: string;
}

interface TestingSessionRow extends QueryResultRow {
  id: string;
  teacher_id: string;
  teacher_login: string;
  teacher_name: string;
  title: string;
  duration_min: number;
  status: "active" | "finished";
  started_at: string;
  finished_at: string | null;
  questions_json: ClassroomTestingQuestionView[];
}

interface TestingSubmissionRow extends QueryResultRow {
  id: string;
  testing_session_id: string;
  teacher_id: string;
  teacher_login: string;
  student_id: string;
  student_login: string;
  student_name: string;
  answers_json: Record<string, ClassroomTestingAnswerKey>;
  submitted_at: string;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  total_questions: number;
  percent: number;
}

function normalizeTeacherJoinCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatTeacherJoinCode(value: string): string {
  const parts = value.match(/.{1,4}/g) ?? [value];
  return parts.join("-");
}

function createTeacherJoinCode(teacherLogin: string): string {
  const normalizedLogin = teacherLogin.trim().toLowerCase();
  const cleanedLogin = normalizeTeacherJoinCode(normalizedLogin) || "VMCLASS";
  let hash = 0;

  for (const symbol of normalizedLogin) {
    hash = (hash * 31 + symbol.charCodeAt(0)) % 1679616;
  }

  const suffix = hash.toString(36).toUpperCase().padStart(4, "0");
  const rawCode = `${cleanedLogin}${suffix}`.slice(0, 8);
  return formatTeacherJoinCode(rawCode);
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTestingQuestions(value: unknown): ClassroomTestingQuestionView[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const question = item as {
        id?: unknown;
        text?: unknown;
        options?: unknown;
        correctAnswerKey?: unknown;
        explanation?: unknown;
      };

      const options = Array.isArray(question.options)
        ? question.options
            .map((option) => {
              if (typeof option !== "object" || option === null) {
                return null;
              }

              const safeOption = option as { key?: unknown; text?: unknown };
              const key = String(safeOption.key ?? "").trim() as ClassroomTestingAnswerKey;
              const text = String(safeOption.text ?? "").trim();

              if (!key || !text) {
                return null;
              }

              return { key, text };
            })
            .filter((option): option is { key: ClassroomTestingAnswerKey; text: string } => option !== null)
        : [];

      const id = String(question.id ?? "").trim();
      const text = String(question.text ?? "").trim();
      const correctAnswerKey = String(
        question.correctAnswerKey ?? ""
      ).trim() as ClassroomTestingAnswerKey;

      if (!id || !text || options.length === 0 || !correctAnswerKey) {
        return null;
      }

      return {
        id,
        text,
        options,
        correctAnswerKey,
        explanation: String(question.explanation ?? "").trim()
      } satisfies ClassroomTestingQuestionView;
    })
    .filter((item): item is ClassroomTestingQuestionView => item !== null);
}

@Injectable()
export class ClassroomService {
  constructor(private readonly database: DatabaseService) {}

  async listTeacherBranches(): Promise<TeacherBranchSummary[]> {
    const result = await this.database.query<TeacherRow>(
      `
        select
          u.id,
          u.login,
          u.full_name,
          count(distinct l.id)::text as lecture_count
        from users u
        left join lectures l on l.author_id = u.id and l.status in ('draft', 'published')
        where u.role = 'teacher' and u.is_active = true
        group by u.id, u.login, u.full_name
        order by u.full_name asc
      `
    );

    return result.rows.map((row) => ({
      teacherLogin: row.login,
      teacherName: row.full_name,
      title: row.full_name,
      description: `Материалы преподавателя ${row.full_name}`,
      joinCode: createTeacherJoinCode(row.login),
      lectureCount: Number(row.lecture_count)
    }));
  }

  async listMeetings(_currentUser: AuthenticatedUser, teacherLogin: string): Promise<ClassroomMeetingView[]> {
    const teacher = await this.requireTeacherByLogin(teacherLogin);

    const result = await this.database.query<MeetingRow>(
      `
        select
          m.id,
          m.title,
          m.platform,
          m.url,
          m.scheduled_at,
          m.duration_min,
          m.description,
          m.created_at,
          u.login as teacher_login,
          u.full_name as teacher_name
        from teacher_meetings m
        join users u on u.id = m.teacher_id
        where m.teacher_id = $1
        order by m.scheduled_at asc
      `,
      [teacher.id]
    );

    return result.rows.map((row) => this.mapMeeting(row));
  }

  async createMeeting(
    currentUser: AuthenticatedUser,
    input: {
      title: string;
      platform: string;
      url: string;
      scheduledAt: string;
      durationMin: number;
      description?: string;
    }
  ): Promise<ClassroomMeetingView> {
    this.assertTeacher(currentUser);

    const created = await this.database.one<MeetingRow>(
      `
        insert into teacher_meetings (
          id,
          teacher_id,
          title,
          platform,
          url,
          scheduled_at,
          duration_min,
          description,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
        returning
          id,
          title,
          platform,
          url,
          scheduled_at,
          duration_min,
          description,
          created_at,
          $9::text as teacher_login,
          $10::text as teacher_name
      `,
      [
        randomUUID(),
        currentUser.userId,
        input.title.trim(),
        input.platform.trim(),
        input.url.trim(),
        input.scheduledAt,
        input.durationMin,
        input.description?.trim() || "",
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapMeeting(created);
  }

  async deleteMeeting(currentUser: AuthenticatedUser, meetingId: string): Promise<{ ok: true }> {
    this.assertTeacher(currentUser);

    const result = await this.database.query(
      `
        delete from teacher_meetings
        where id = $1 and teacher_id = $2
      `,
      [meetingId, currentUser.userId]
    );

    if (result.rowCount === 0) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Meeting not found");
    }

    return { ok: true };
  }

  async listHomeworks(
    _currentUser: AuthenticatedUser,
    teacherLogin: string
  ): Promise<ClassroomHomeworkView[]> {
    const teacher = await this.requireTeacherByLogin(teacherLogin);
    const result = await this.database.query<HomeworkRow>(
      `
        select
          h.id,
          h.teacher_id,
          h.title,
          h.description,
          h.due_at,
          h.allowed_formats,
          h.max_score,
          h.created_at,
          u.login as teacher_login,
          u.full_name as teacher_name
        from teacher_homeworks h
        join users u on u.id = h.teacher_id
        where h.teacher_id = $1
        order by h.due_at asc
      `,
      [teacher.id]
    );

    return result.rows.map((row) => this.mapHomework(row));
  }

  async createHomework(
    currentUser: AuthenticatedUser,
    input: {
      title: string;
      description: string;
      dueAt: string;
      allowedFormats: string[];
      maxScore: number;
    }
  ): Promise<ClassroomHomeworkView> {
    this.assertTeacher(currentUser);

    const created = await this.database.one<HomeworkRow>(
      `
        insert into teacher_homeworks (
          id,
          teacher_id,
          title,
          description,
          due_at,
          allowed_formats,
          max_score,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, now(), now())
        returning
          id,
          teacher_id,
          title,
          description,
          due_at,
          allowed_formats,
          max_score,
          created_at,
          $8::text as teacher_login,
          $9::text as teacher_name
      `,
      [
        randomUUID(),
        currentUser.userId,
        input.title.trim(),
        input.description.trim(),
        input.dueAt,
        input.allowedFormats.map((item) => item.trim().toLowerCase()),
        input.maxScore,
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapHomework(created);
  }

  async deleteHomework(currentUser: AuthenticatedUser, homeworkId: string): Promise<{ ok: true }> {
    this.assertTeacher(currentUser);

    const result = await this.database.query(
      `
        delete from teacher_homeworks
        where id = $1 and teacher_id = $2
      `,
      [homeworkId, currentUser.userId]
    );

    if (result.rowCount === 0) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Homework not found");
    }

    return { ok: true };
  }

  async listResources(
    _currentUser: AuthenticatedUser,
    teacherLogin: string,
    kind?: ClassroomResourceKind
  ): Promise<ClassroomResourceView[]> {
    const teacher = await this.requireTeacherByLogin(teacherLogin);
    const params: unknown[] = [teacher.id];
    const filters = [`r.teacher_id = $1`];

    if (kind) {
      params.push(kind);
      filters.push(`r.kind = $${params.length}`);
    }

    const result = await this.database.query<ResourceRow>(
      `
        select
          r.id,
          r.teacher_id,
          teacher.login as teacher_login,
          teacher.full_name as teacher_name,
          r.kind,
          r.title,
          r.url,
          r.note,
          r.file_name,
          r.file_type,
          r.file_data,
          r.mime_type,
          r.created_at
        from teacher_resources r
        join users teacher on teacher.id = r.teacher_id
        where ${filters.join(" and ")}
        order by r.created_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapResource(row));
  }

  async createResource(
    currentUser: AuthenticatedUser,
    input: {
      kind: ClassroomResourceKind;
      title: string;
      url?: string;
      note?: string;
      fileName?: string;
      fileType?: string;
      fileData?: string;
      mimeType?: string;
    }
  ): Promise<ClassroomResourceView> {
    this.assertTeacher(currentUser);

    const title = input.title.trim();
    const url = input.url?.trim() || "";
    const fileData = input.fileData?.trim() || "";

    if (!["video", "photo"].includes(input.kind)) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Resource kind is invalid");
    }

    if (!title || (!url && !fileData)) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Resource title and URL or file are required");
    }

    const created = await this.database.one<ResourceRow>(
      `
        insert into teacher_resources (
          id,
          teacher_id,
          kind,
          title,
          url,
          note,
          file_name,
          file_type,
          file_data,
          mime_type,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        returning
          id,
          teacher_id,
          $11::text as teacher_login,
          $12::text as teacher_name,
          kind,
          title,
          url,
          note,
          file_name,
          file_type,
          file_data,
          mime_type,
          created_at
      `,
      [
        randomUUID(),
        currentUser.userId,
        input.kind,
        title,
        url,
        input.note?.trim() || "",
        input.fileName?.trim() || null,
        input.fileType?.trim().toLowerCase() || null,
        fileData || null,
        input.mimeType?.trim() || null,
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapResource(created);
  }

  async deleteResource(currentUser: AuthenticatedUser, resourceId: string): Promise<{ ok: true }> {
    this.assertTeacher(currentUser);

    const result = await this.database.query(
      `
        delete from teacher_resources
        where id = $1 and teacher_id = $2
      `,
      [resourceId, currentUser.userId]
    );

    if (result.rowCount === 0) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Resource not found");
    }

    return { ok: true };
  }

  async listHomeworkSubmissions(
    currentUser: AuthenticatedUser,
    teacherLogin: string
  ): Promise<ClassroomHomeworkSubmissionView[]> {
    const teacher = await this.requireTeacherByLogin(teacherLogin);
    const params: unknown[] = [teacher.id];
    const filters = [`h.teacher_id = $1`];

    if (currentUser.role === "student") {
      params.push(currentUser.userId);
      filters.push(`s.student_id = $${params.length}`);
    } else if (currentUser.role === "teacher" && currentUser.userId !== teacher.id) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "You can only review your own submissions");
    }

    const result = await this.database.query<HomeworkSubmissionRow>(
      `
        select
          s.id,
          s.homework_id,
          h.teacher_id,
          teacher.login as teacher_login,
          s.student_id,
          student.login as student_login,
          student.full_name as student_name,
          s.file_name,
          s.file_type,
          s.file_data,
          s.submitted_at,
          s.teacher_comment,
          s.score
        from teacher_homework_submissions s
        join teacher_homeworks h on h.id = s.homework_id
        join users teacher on teacher.id = h.teacher_id
        join users student on student.id = s.student_id
        where ${filters.join(" and ")}
        order by s.submitted_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapHomeworkSubmission(row));
  }

  async upsertHomeworkSubmission(
    currentUser: AuthenticatedUser,
    homeworkId: string,
    input: {
      fileName: string;
      fileType: string;
      fileData: string;
    }
  ): Promise<ClassroomHomeworkSubmissionView> {
    if (currentUser.role !== "student") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Only students can submit homework");
    }

    const homework = await this.requireHomework(homeworkId);

    const created = await this.database.one<HomeworkSubmissionRow>(
      `
        insert into teacher_homework_submissions (
          id,
          homework_id,
          student_id,
          file_name,
          file_type,
          file_data,
          submitted_at,
          teacher_comment,
          score,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, now(), '', null, now(), now())
        on conflict (homework_id, student_id)
        do update set
          file_name = excluded.file_name,
          file_type = excluded.file_type,
          file_data = excluded.file_data,
          submitted_at = now(),
          updated_at = now()
        returning
          id,
          homework_id,
          $7::uuid as teacher_id,
          $8::text as teacher_login,
          $3::uuid as student_id,
          $9::text as student_login,
          $10::text as student_name,
          file_name,
          file_type,
          file_data,
          submitted_at,
          teacher_comment,
          score
      `,
      [
        randomUUID(),
        homeworkId,
        currentUser.userId,
        input.fileName.trim(),
        input.fileType.trim().toLowerCase(),
        input.fileData.trim(),
        homework.teacher_id,
        homework.teacher_login,
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapHomeworkSubmission(created);
  }

  async deleteHomeworkSubmission(
    currentUser: AuthenticatedUser,
    submissionId: string
  ): Promise<{ ok: true }> {
    const submission = await this.requireHomeworkSubmission(submissionId);

    const canDelete =
      (currentUser.role === "teacher" && currentUser.userId === submission.teacher_id) ||
      (currentUser.role === "student" && currentUser.userId === submission.student_id);

    if (!canDelete) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot delete this submission");
    }

    await this.database.query(`delete from teacher_homework_submissions where id = $1`, [submissionId]);
    return { ok: true };
  }

  async gradeHomeworkSubmission(
    currentUser: AuthenticatedUser,
    submissionId: string,
    input: { score: number | null; comment: string }
  ): Promise<ClassroomHomeworkSubmissionView> {
    this.assertTeacher(currentUser);
    const submission = await this.requireHomeworkSubmission(submissionId);

    if (submission.teacher_id !== currentUser.userId) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "You can only grade your own homework");
    }

    const updated = await this.database.one<HomeworkSubmissionRow>(
      `
        update teacher_homework_submissions
        set
          score = $2,
          teacher_comment = $3,
          updated_at = now()
        where id = $1
        returning
          id,
          homework_id,
          $4::uuid as teacher_id,
          $5::text as teacher_login,
          student_id,
          $6::text as student_login,
          $7::text as student_name,
          file_name,
          file_type,
          file_data,
          submitted_at,
          teacher_comment,
          score
      `,
      [
        submissionId,
        input.score,
        input.comment.trim(),
        submission.teacher_id,
        submission.teacher_login,
        submission.student_login,
        submission.student_name
      ]
    );

    return this.mapHomeworkSubmission(updated);
  }

  async getActiveTestingSession(
    _currentUser: AuthenticatedUser,
    teacherLogin: string
  ): Promise<ClassroomTestingSessionView | null> {
    const teacher = await this.requireTeacherByLogin(teacherLogin);

    const session = await this.database.maybeOne<TestingSessionRow>(
      `
        select
          s.id,
          s.teacher_id,
          teacher.login as teacher_login,
          teacher.full_name as teacher_name,
          s.title,
          s.duration_min,
          s.status,
          s.started_at,
          s.finished_at,
          s.questions_json
        from teacher_testing_sessions s
        join users teacher on teacher.id = s.teacher_id
        where s.teacher_id = $1 and s.status = 'active'
        order by s.started_at desc
        limit 1
      `,
      [teacher.id]
    );

    return session ? this.mapTestingSession(session) : null;
  }

  async listTestingSubmissions(
    currentUser: AuthenticatedUser,
    sessionId: string
  ): Promise<ClassroomTestingSubmissionView[]> {
    const session = await this.requireTestingSession(sessionId);

    const params: unknown[] = [sessionId];
    const filters = [`s.testing_session_id = $1`];

    if (currentUser.role === "student") {
      params.push(currentUser.userId);
      filters.push(`s.student_id = $${params.length}`);
    } else if (currentUser.role === "teacher" && currentUser.userId !== session.teacher_id) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "You can only review your own testing sessions");
    }

    const result = await this.database.query<TestingSubmissionRow>(
      `
        select
          s.id,
          s.testing_session_id,
          session.teacher_id,
          teacher.login as teacher_login,
          s.student_id,
          student.login as student_login,
          student.full_name as student_name,
          s.answers_json,
          s.submitted_at,
          s.correct_count,
          s.wrong_count,
          s.skipped_count,
          s.total_questions,
          s.percent
        from teacher_testing_submissions s
        join teacher_testing_sessions session on session.id = s.testing_session_id
        join users teacher on teacher.id = session.teacher_id
        join users student on student.id = s.student_id
        where ${filters.join(" and ")}
        order by s.submitted_at desc
      `,
      params
    );

    return result.rows.map((row) => this.mapTestingSubmission(row));
  }

  async startTestingSession(
    currentUser: AuthenticatedUser,
    input: {
      title: string;
      durationMin: number;
      questions: unknown;
    }
  ): Promise<ClassroomTestingSessionView> {
    this.assertTeacher(currentUser);
    const normalizedQuestions = normalizeTestingQuestions(input.questions);

    if (normalizedQuestions.length === 0) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "Add at least one question");
    }

    await this.database.query(
      `
        update teacher_testing_sessions
        set status = 'finished', finished_at = now(), updated_at = now()
        where teacher_id = $1 and status = 'active'
      `,
      [currentUser.userId]
    );

    const created = await this.database.one<TestingSessionRow>(
      `
        insert into teacher_testing_sessions (
          id,
          teacher_id,
          title,
          duration_min,
          status,
          started_at,
          finished_at,
          questions_json,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, 'active', now(), null, $5::jsonb, now(), now())
        returning
          id,
          teacher_id,
          $6::text as teacher_login,
          $7::text as teacher_name,
          title,
          duration_min,
          status,
          started_at,
          finished_at,
          questions_json
      `,
      [
        randomUUID(),
        currentUser.userId,
        input.title.trim(),
        input.durationMin,
        JSON.stringify(normalizedQuestions),
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapTestingSession(created);
  }

  async finishTestingSession(
    currentUser: AuthenticatedUser,
    sessionId: string
  ): Promise<ClassroomTestingSessionView> {
    this.assertTeacher(currentUser);
    const session = await this.requireTestingSession(sessionId);

    if (session.teacher_id !== currentUser.userId) {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "You can only finish your own session");
    }

    const updated = await this.database.one<TestingSessionRow>(
      `
        update teacher_testing_sessions
        set status = 'finished', finished_at = coalesce(finished_at, now()), updated_at = now()
        where id = $1
        returning
          id,
          teacher_id,
          $2::text as teacher_login,
          $3::text as teacher_name,
          title,
          duration_min,
          status,
          started_at,
          finished_at,
          questions_json
      `,
      [sessionId, session.teacher_login, session.teacher_name]
    );

    return this.mapTestingSession(updated);
  }

  async submitTestingAnswers(
    currentUser: AuthenticatedUser,
    sessionId: string,
    input: { answers: Record<string, ClassroomTestingAnswerKey> }
  ): Promise<ClassroomTestingSubmissionView> {
    if (currentUser.role !== "student") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Only students can submit testing answers");
    }

    const session = await this.requireTestingSession(sessionId);
    if (session.status !== "active") {
      throw new AppException("CONFLICT", HttpStatus.CONFLICT, "Testing session is not active");
    }

    const normalizedAnswers = this.normalizeTestingAnswers(input.answers);
    const evaluation = this.evaluateTestingAnswers(session.questions_json, normalizedAnswers);

    const created = await this.database.one<TestingSubmissionRow>(
      `
        insert into teacher_testing_submissions (
          id,
          testing_session_id,
          student_id,
          answers_json,
          submitted_at,
          correct_count,
          wrong_count,
          skipped_count,
          total_questions,
          percent,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4::jsonb, now(), $5, $6, $7, $8, $9, now(), now())
        on conflict (testing_session_id, student_id)
        do update set
          answers_json = excluded.answers_json,
          submitted_at = now(),
          correct_count = excluded.correct_count,
          wrong_count = excluded.wrong_count,
          skipped_count = excluded.skipped_count,
          total_questions = excluded.total_questions,
          percent = excluded.percent,
          updated_at = now()
        returning
          id,
          testing_session_id,
          $10::uuid as teacher_id,
          $11::text as teacher_login,
          student_id,
          $12::text as student_login,
          $13::text as student_name,
          answers_json,
          submitted_at,
          correct_count,
          wrong_count,
          skipped_count,
          total_questions,
          percent
      `,
      [
        randomUUID(),
        sessionId,
        currentUser.userId,
        JSON.stringify(normalizedAnswers),
        evaluation.correctCount,
        evaluation.wrongCount,
        evaluation.skippedCount,
        evaluation.totalQuestions,
        evaluation.percent,
        session.teacher_id,
        session.teacher_login,
        currentUser.login,
        currentUser.login
      ]
    );

    return this.mapTestingSubmission(created);
  }

  private normalizeTestingAnswers(
    answers: Record<string, ClassroomTestingAnswerKey>
  ): Record<string, ClassroomTestingAnswerKey> {
    return Object.fromEntries(
      Object.entries(answers).filter(([questionId, answer]) => {
        const safeQuestionId = String(questionId ?? "").trim();
        const safeAnswer = String(answer ?? "").trim().toUpperCase();
        return Boolean(safeQuestionId && ["A", "B", "C", "D"].includes(safeAnswer));
      })
    ) as Record<string, ClassroomTestingAnswerKey>;
  }

  private evaluateTestingAnswers(
    questions: ClassroomTestingQuestionView[],
    answers: Record<string, ClassroomTestingAnswerKey>
  ) {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    for (const question of questions) {
      const answer = answers[question.id];

      if (!answer) {
        skippedCount += 1;
        continue;
      }

      if (answer === question.correctAnswerKey) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const totalQuestions = questions.length;
    const percent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      correctCount,
      wrongCount,
      skippedCount,
      totalQuestions,
      percent
    };
  }

  private async requireTeacherByLogin(login: string) {
    const teacher = await this.database.maybeOne<TeacherRow>(
      `
        select
          u.id,
          u.login,
          u.full_name,
          count(distinct l.id)::text as lecture_count
        from users u
        left join lectures l on l.author_id = u.id and l.status in ('draft', 'published')
        where lower(u.login) = lower($1) and u.role = 'teacher' and u.is_active = true
        group by u.id, u.login, u.full_name
      `,
      [login.trim().toLowerCase()]
    );

    if (!teacher) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Teacher not found");
    }

    return teacher;
  }

  private async requireHomework(homeworkId: string) {
    const homework = await this.database.maybeOne<HomeworkRow>(
      `
        select
          h.id,
          h.teacher_id,
          h.title,
          h.description,
          h.due_at,
          h.allowed_formats,
          h.max_score,
          h.created_at,
          teacher.login as teacher_login,
          teacher.full_name as teacher_name
        from teacher_homeworks h
        join users teacher on teacher.id = h.teacher_id
        where h.id = $1
      `,
      [homeworkId]
    );

    if (!homework) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Homework not found");
    }

    return homework;
  }

  private async requireHomeworkSubmission(submissionId: string) {
    const submission = await this.database.maybeOne<HomeworkSubmissionRow>(
      `
        select
          s.id,
          s.homework_id,
          h.teacher_id,
          teacher.login as teacher_login,
          s.student_id,
          student.login as student_login,
          student.full_name as student_name,
          s.file_name,
          s.file_type,
          s.file_data,
          s.submitted_at,
          s.teacher_comment,
          s.score
        from teacher_homework_submissions s
        join teacher_homeworks h on h.id = s.homework_id
        join users teacher on teacher.id = h.teacher_id
        join users student on student.id = s.student_id
        where s.id = $1
      `,
      [submissionId]
    );

    if (!submission) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Homework submission not found");
    }

    return submission;
  }

  private async requireTestingSession(sessionId: string) {
    const session = await this.database.maybeOne<TestingSessionRow>(
      `
        select
          s.id,
          s.teacher_id,
          teacher.login as teacher_login,
          teacher.full_name as teacher_name,
          s.title,
          s.duration_min,
          s.status,
          s.started_at,
          s.finished_at,
          s.questions_json
        from teacher_testing_sessions s
        join users teacher on teacher.id = s.teacher_id
        where s.id = $1
      `,
      [sessionId]
    );

    if (!session) {
      throw new AppException("NOT_FOUND", HttpStatus.NOT_FOUND, "Testing session not found");
    }

    return {
      ...session,
      questions_json: normalizeTestingQuestions(session.questions_json)
    };
  }

  private mapMeeting(row: MeetingRow): ClassroomMeetingView {
    return {
      id: row.id,
      title: row.title,
      platform: row.platform,
      url: row.url,
      scheduledAt: row.scheduled_at,
      durationMin: row.duration_min,
      description: row.description,
      createdBy: row.teacher_name,
      createdAt: row.created_at,
      teacherLogin: row.teacher_login
    };
  }

  private mapHomework(row: HomeworkRow): ClassroomHomeworkView {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dueAt: row.due_at,
      allowedFormats: Array.isArray(row.allowed_formats) ? row.allowed_formats : [],
      maxScore: toNumber(row.max_score) ?? 0,
      createdBy: row.teacher_name,
      createdAt: row.created_at,
      teacherLogin: row.teacher_login
    };
  }

  private mapHomeworkSubmission(row: HomeworkSubmissionRow): ClassroomHomeworkSubmissionView {
    return {
      id: row.id,
      homeworkId: row.homework_id,
      studentLogin: row.student_login,
      studentName: row.student_name,
      fileName: row.file_name,
      fileType: row.file_type,
      fileData: row.file_data,
      submittedAt: row.submitted_at,
      teacherComment: row.teacher_comment,
      score: toNumber(row.score),
      teacherLogin: row.teacher_login
    };
  }

  private mapResource(row: ResourceRow): ClassroomResourceView {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      url: row.url,
      note: row.note,
      fileName: row.file_name,
      fileType: row.file_type,
      fileData: row.file_data,
      mimeType: row.mime_type,
      createdBy: row.teacher_name,
      createdAt: row.created_at,
      teacherLogin: row.teacher_login
    };
  }

  private mapTestingSession(row: TestingSessionRow): ClassroomTestingSessionView {
    return {
      id: row.id,
      teacherLogin: row.teacher_login,
      title: row.title,
      durationMin: row.duration_min,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      questions: normalizeTestingQuestions(row.questions_json)
    };
  }

  private mapTestingSubmission(row: TestingSubmissionRow): ClassroomTestingSubmissionView {
    return {
      id: row.id,
      sessionId: row.testing_session_id,
      teacherLogin: row.teacher_login,
      studentLogin: row.student_login,
      studentName: row.student_name,
      answers: row.answers_json,
      submittedAt: row.submitted_at,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      skippedCount: row.skipped_count,
      totalQuestions: row.total_questions,
      percent: row.percent
    };
  }

  private assertTeacher(currentUser: AuthenticatedUser) {
    if (currentUser.role !== "teacher" && currentUser.role !== "admin") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Teacher access is required");
    }
  }
}
