import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { Test } from "@nestjs/testing";
import { newDb } from "pg-mem";
import type { INestApplication } from "@nestjs/common";
import { GlobalExceptionFilter, RequestLoggingInterceptor } from "../src/common/http";
import { APP_CONFIG, loadAppConfig } from "../src/config/app-config";
import { DB_POOL } from "../src/database/database.service";
import { runMigrations } from "../src/database/migration-runner";
import { AppModule } from "../src/app.module";
import { PasswordService } from "../src/auth/password.service";

const TEST_USERS = {
  teacher: "00000000-0000-0000-0000-000000009901",
  student: "00000000-0000-0000-0000-000000009902",
  admin: "00000000-0000-0000-0000-000000009903"
} as const;

const TEST_LECTURE = {
  id: "00000000-0000-0000-0000-000000008001",
  blockId: "00000000-0000-0000-0000-000000008101"
} as const;

export async function createTestApp() {
  const db = newDb({
    autoCreateForeignKeyIndices: true
  });
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();
  await runMigrations(pool, join(process.cwd(), "src", "database", "migrations"));
  await seedTestData(pool);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  })
    .overrideProvider(APP_CONFIG)
    .useValue({
      ...loadAppConfig(),
      jwtAccessSecret: "test-access-secret",
      jwtRefreshSecret: "test-refresh-secret"
    })
    .overrideProvider(DB_POOL)
    .useValue(pool)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(0);
  const baseUrl = await app.getUrl();

  return {
    app,
    baseUrl,
    pool,
    close: async () => {
      await app.close();
      await pool.end();
    }
  };
}

export async function login(
  baseUrl: string,
  credentials: { login: string; password: string; role?: "student" | "teacher" | "admin" }
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(credentials)
  });
  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  return payload;
}

export async function api(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit
) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
}

async function seedTestData(pool: { query: (text: string, params?: unknown[]) => Promise<unknown> }) {
  const passwordService = new PasswordService();
  const teacherPassword = await passwordService.hashPassword("teacher");
  const studentPassword = await passwordService.hashPassword("student");
  const adminPassword = await passwordService.hashPassword("admin");

  await pool.query(
    `
      insert into users (id, login, password_hash, full_name, role, group_name, is_active, created_at, updated_at)
      values
        ($1, 'teacher', $2, 'Teacher Test', 'teacher', null, true, now(), now()),
        ($3, 'student', $4, 'Student Test', 'student', 'BPI-248', true, now(), now()),
        ($5, 'admin', $6, 'Admin Test', 'admin', null, true, now(), now())
    `,
    [
      TEST_USERS.teacher,
      "teacher-credentials-only$teacher",
      TEST_USERS.student,
      studentPassword,
      TEST_USERS.admin,
      adminPassword
    ]
  );

  await pool.query(
    `
      insert into teacher_credentials (user_id, login, password_hash, is_active, created_at, updated_at)
      values ($1, 'teacher', $2, true, now(), now())
    `,
    [TEST_USERS.teacher, teacherPassword]
  );

  await pool.query(
    `
      insert into subjects (id, code, title, description, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000007001', 'calculus', 'Calculus', 'Test calculus subject', now(), now())
    `
  );

  const questions = [
    {
      id: "00000000-0000-0000-0000-000000006101",
      type: "single",
      text: "Derivative of x^2 at x = 3?",
      correctOptionId: "00000000-0000-0000-0000-000000006201",
      options: [
        { id: "00000000-0000-0000-0000-000000006202", text: "3", isCorrect: false },
        { id: "00000000-0000-0000-0000-000000006203", text: "5", isCorrect: false },
        { id: "00000000-0000-0000-0000-000000006201", text: "6", isCorrect: true }
      ]
    },
    {
      id: "00000000-0000-0000-0000-000000006102",
      type: "short",
      text: "Derivative of 5x + 2",
      correctAnswerText: "5"
    }
  ];

  for (const [index, question] of questions.entries()) {
    await pool.query(
      `
        insert into questions (id, questionnaire_id, author_id, prompt, question_type, correct_answer_text, allow_formula_answer, explanation, position_index, created_at, updated_at)
        values ($1, null, $2, $3, $4, $5, false, null, $6, now(), now())
      `,
      [
        question.id,
        TEST_USERS.teacher,
        question.text,
        question.type,
        "correctAnswerText" in question ? question.correctAnswerText ?? null : null,
        index
      ]
    );

    for (const [optionIndex, option] of (("options" in question ? question.options : []) ?? []).entries()) {
      await pool.query(
        `
          insert into question_options (id, question_id, option_text, is_correct, position_index, created_at, updated_at)
          values ($1, $2, $3, $4, $5, now(), now())
        `,
        [option.id, question.id, option.text, option.isCorrect, optionIndex]
      );
    }
  }

  await pool.query(
    `
      insert into lectures (id, title, description, subject_id, author_id, semester, level, tags, status, available_for_roles, created_at, updated_at)
      values ($1, 'Derivative Basics', 'Test lecture', '00000000-0000-0000-0000-000000007001', $2, 1, 'basic', array['derivative'], 'published', array['student','teacher'], now(), now())
    `,
    [TEST_LECTURE.id, TEST_USERS.teacher]
  );

  await pool.query(
    `
      insert into lecture_blocks (id, lecture_id, module_id, block_type, title, position_index, payload, created_at, updated_at)
      values
        ('00000000-0000-0000-0000-000000008100', $1, null, 'text', 'Theory', 0, '{"markdown":"Derivative basics"}'::jsonb, now(), now()),
        ($2, $1, null, 'checking_block', 'Assessment', 1, $3::jsonb, now(), now())
    `,
    [
      TEST_LECTURE.id,
      TEST_LECTURE.blockId,
      JSON.stringify({
        checkingBlockId: randomUUID(),
        questions,
        timeLimitSec: 180,
        allowRefuseToAnswer: true,
        scoring: {
          correct: 1,
          incorrectPenaltyDivisor: 3,
          skip: 0
        }
      })
    ]
  );
}

export { TEST_LECTURE, TEST_USERS };
