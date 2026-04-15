import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  QuizQuestion,
  ResultSummaryView,
  SessionStatsView
} from "@vm/shared";
import type { QueryResultRow } from "pg";
import { AppException, type AuthenticatedUser } from "../common/http";
import { DatabaseService } from "../database/database.service";
import {
  GradingService,
  type SubmissionAnswerInput
} from "./grading.service";

interface SessionParticipantRow extends QueryResultRow {
  user_id: string;
  full_name: string;
}

interface SubmissionRow extends QueryResultRow {
  id: string;
  user_id: string;
}

interface SubmissionAnswerRow extends QueryResultRow {
  submission_id: string;
  question_id: string;
  selected_option_ids: string[] | null;
  answer_text: string | null;
  formula_answer: string | null;
  is_refused: boolean;
}

interface ResultSummaryRow extends QueryResultRow {
  submission_id: string;
  session_id: string;
  user_id: string;
  full_name: string;
  lecture_block_id: string;
  score: number;
  max_score: number;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  published_at: string | null;
  answers_json: ResultSummaryView["answers"];
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly gradingService: GradingService
  ) {}

  async publishResults(
    sessionId: string,
    lectureBlockId: string,
    questions: QuizQuestion[]
  ): Promise<ResultSummaryView[]> {
    const participants = await this.database.query<SessionParticipantRow>(
      `
        select sp.user_id, u.full_name
        from session_participants sp
        join users u on u.id = sp.user_id
        where sp.session_id = $1 and sp.role = 'student'
        order by u.full_name asc
      `,
      [sessionId]
    );

    const submissions = await this.database.query<SubmissionRow>(
      `
        select id, user_id
        from submissions
        where session_id = $1 and lecture_block_id = $2
      `,
      [sessionId, lectureBlockId]
    );

    const submissionIds = submissions.rows.map((submission) => submission.id);
    const answers =
      submissionIds.length > 0
        ? await this.database.query<SubmissionAnswerRow>(
            `
              select submission_id, question_id, selected_option_ids, answer_text, formula_answer, is_refused
              from submission_answers
              where submission_id in (${submissionIds.map((_, index) => `$${index + 1}`).join(", ")})
            `,
            submissionIds
          )
        : { rows: [] as SubmissionAnswerRow[] };

    const answersBySubmissionId = new Map<string, SubmissionAnswerInput[]>();
    for (const answer of answers.rows) {
      const current = answersBySubmissionId.get(answer.submission_id) ?? [];
      current.push({
        questionId: answer.question_id,
        selectedOptionIds: answer.selected_option_ids ?? undefined,
        answerText: answer.answer_text,
        formulaAnswer: answer.formula_answer,
        isRefused: answer.is_refused
      });
      answersBySubmissionId.set(answer.submission_id, current);
    }

    const submissionByUserId = new Map(submissions.rows.map((submission) => [submission.user_id, submission]));

    const summaries: ResultSummaryView[] = [];
    for (const participant of participants.rows) {
      const submission = submissionByUserId.get(participant.user_id);
      const participantAnswers = submission
        ? answersBySubmissionId.get(submission.id) ?? []
        : [];

      const summary = this.gradingService.attachSummary(
        {
          submissionId: submission?.id ?? `virtual-${participant.user_id}`,
          sessionId,
          userId: participant.user_id,
          fullName: participant.full_name,
          lectureBlockId,
          publishedAt: new Date().toISOString()
        },
        questions,
        participantAnswers
      );

      summaries.push(summary);

      await this.database.query(
        `
          insert into result_summaries (
            id,
            session_id,
            user_id,
            lecture_block_id,
            score,
            max_score,
            correct_count,
            incorrect_count,
            skipped_count,
            answers_json,
            published_at,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, now(), now())
          on conflict (session_id, user_id, lecture_block_id)
          do update set
            score = excluded.score,
            max_score = excluded.max_score,
            correct_count = excluded.correct_count,
            incorrect_count = excluded.incorrect_count,
            skipped_count = excluded.skipped_count,
            answers_json = excluded.answers_json,
            published_at = excluded.published_at,
            updated_at = now()
        `,
        [
          summary.submissionId,
          sessionId,
          participant.user_id,
          lectureBlockId,
          summary.score,
          summary.maxScore,
          summary.correctCount,
          summary.incorrectCount,
          summary.skippedCount,
          JSON.stringify(summary.answers),
          summary.publishedAt
        ]
      );
    }

    return summaries;
  }

  async getResults(currentUser: AuthenticatedUser, sessionId: string): Promise<ResultSummaryView[]> {
    const params: unknown[] = [sessionId];
    let where = `where rs.session_id = $1`;

    if (currentUser.role === "student") {
      params.push(currentUser.userId);
      where += ` and rs.user_id = $2`;
    }

    const result = await this.database.query<ResultSummaryRow>(
      `
        select
          rs.id as submission_id,
          rs.session_id,
          rs.user_id,
          u.full_name,
          rs.lecture_block_id,
          rs.score,
          rs.max_score,
          rs.correct_count,
          rs.incorrect_count,
          rs.skipped_count,
          rs.published_at,
          rs.answers_json
        from result_summaries rs
        join users u on u.id = rs.user_id
        ${where}
        order by u.full_name asc
      `,
      params
    );

    return result.rows.map((row) => ({
      submissionId: row.submission_id,
      sessionId: row.session_id,
      userId: row.user_id,
      fullName: row.full_name,
      lectureBlockId: row.lecture_block_id,
      score: Number(row.score),
      maxScore: Number(row.max_score),
      correctCount: row.correct_count,
      incorrectCount: row.incorrect_count,
      skippedCount: row.skipped_count,
      publishedAt: row.published_at,
      answers: row.answers_json
    }));
  }

  async getStats(currentUser: AuthenticatedUser, sessionId: string): Promise<SessionStatsView> {
    if (currentUser.role === "student") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Students cannot access session stats");
    }

    const results = await this.getResults(currentUser, sessionId);
    const session = await this.database.one<{ lecture_id: string }>(
      `select lecture_id from lesson_sessions where id = $1`,
      [sessionId]
    );

    const distributions = new Map<
      string,
      {
        questionText: string;
        optionCounts: Map<string, number>;
        correctCount: number;
        incorrectCount: number;
        skippedCount: number;
      }
    >();

    for (const result of results) {
      for (const answer of result.answers) {
        const bucket =
          distributions.get(answer.questionId) ??
          {
            questionText: answer.questionText,
            optionCounts: new Map<string, number>(),
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 0
          };

        if (answer.isCorrect === true) {
          bucket.correctCount += 1;
        } else if (answer.isCorrect === false) {
          bucket.incorrectCount += 1;
        } else {
          bucket.skippedCount += 1;
        }

        for (const optionId of answer.selectedOptionIds ?? []) {
          bucket.optionCounts.set(optionId, (bucket.optionCounts.get(optionId) ?? 0) + 1);
        }

        distributions.set(answer.questionId, bucket);
      }
    }

    const participants = await this.database.one<{
      participant_count: string;
      online_count: string;
      in_progress_count: string;
      completed_count: string;
    }>(
      `
        select
          count(*)::text as participant_count,
          count(*) filter (where connection_status = 'connected')::text as online_count,
          count(*) filter (where status in ('idle', 'working'))::text as in_progress_count,
          count(*) filter (where status = 'submitted')::text as completed_count
        from session_participants
        where session_id = $1 and role = 'student'
      `,
      [sessionId]
    );

    return {
      sessionId,
      lectureId: session.lecture_id,
      participantCount: Number(participants.participant_count),
      onlineCount: Number(participants.online_count),
      inProgressCount: Number(participants.in_progress_count),
      completedCount: Number(participants.completed_count),
      averageScore:
        results.length > 0
          ? Number(
              (results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(2)
            )
          : 0,
      distributions: [...distributions.entries()].map(([questionId, bucket]) => ({
        questionId,
        questionText: bucket.questionText,
        optionCounts: [...bucket.optionCounts.entries()].map(([optionId, count]) => ({
          optionId,
          count
        })),
        correctCount: bucket.correctCount,
        incorrectCount: bucket.incorrectCount,
        skippedCount: bucket.skippedCount
      }))
    };
  }

  async exportResultsCsv(currentUser: AuthenticatedUser, sessionId: string): Promise<string> {
    if (currentUser.role === "student") {
      throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN, "Students cannot export session results");
    }

    const results = await this.getResults(currentUser, sessionId);
    const header = [
      "userId",
      "fullName",
      "lectureBlockId",
      "score",
      "maxScore",
      "correctCount",
      "incorrectCount",
      "skippedCount"
    ];

    const lines = [header.join(",")];
    for (const result of results) {
      lines.push(
        [
          result.userId,
          this.escapeCsv(result.fullName),
          result.lectureBlockId,
          String(result.score),
          String(result.maxScore),
          String(result.correctCount),
          String(result.incorrectCount),
          String(result.skippedCount)
        ].join(",")
      );
    }

    return lines.join("\n");
  }

  private escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
