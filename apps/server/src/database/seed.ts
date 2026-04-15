import { join } from "path";
import { loadAppConfig } from "../config/app-config";
import { PasswordService } from "../auth/password.service";
import { createPgPool } from "./database.service";
import { runMigrations } from "./migration-runner";

const USERS = {
  teacher: "00000000-0000-0000-0000-000000000101",
  student: "00000000-0000-0000-0000-000000000102",
  admin: "00000000-0000-0000-0000-000000000103"
} as const;

const SUBJECTS = {
  calculus: "10000000-0000-0000-0000-000000000101",
  algebra: "10000000-0000-0000-0000-000000000102"
} as const;

const MODULES = {
  functionsText: "20000000-0000-0000-0000-000000000101",
  functionsVisual: "20000000-0000-0000-0000-000000000102",
  functionsQuestionnaire: "20000000-0000-0000-0000-000000000103",
  derivativeText: "20000000-0000-0000-0000-000000000104",
  derivativeVisual: "20000000-0000-0000-0000-000000000105",
  derivativeChecking: "20000000-0000-0000-0000-000000000106"
} as const;

const LECTURES = {
  functions: "30000000-0000-0000-0000-000000000101",
  derivative: "30000000-0000-0000-0000-000000000102"
} as const;

const BLOCKS = {
  functionsText: "40000000-0000-0000-0000-000000000101",
  functionsVisual: "40000000-0000-0000-0000-000000000102",
  functionsQuiz: "40000000-0000-0000-0000-000000000103",
  derivativeText: "40000000-0000-0000-0000-000000000104",
  derivativeVisual: "40000000-0000-0000-0000-000000000105",
  derivativeChecking: "40000000-0000-0000-0000-000000000106"
} as const;

async function main() {
  const config = loadAppConfig();
  const pool = createPgPool(config);
  const passwordService = new PasswordService();

  try {
    await runMigrations(pool, join(process.cwd(), "src", "database", "migrations"));

    const teacherPassword = await passwordService.hashPassword("teacher");
    const studentPassword = await passwordService.hashPassword("student");
    const adminPassword = await passwordService.hashPassword("admin");

    await pool.query(
      `
        insert into users (id, login, password_hash, full_name, role, group_name, is_active, created_at, updated_at)
        values
          ($1, 'teacher', $2, 'VisualMath Teacher', 'teacher', null, true, now(), now()),
          ($3, 'student', $4, 'VisualMath Student', 'student', 'BPI-248', true, now(), now()),
          ($5, 'admin', $6, 'VisualMath Admin', 'admin', null, true, now(), now())
        on conflict (id) do update set
          login = excluded.login,
          password_hash = excluded.password_hash,
          full_name = excluded.full_name,
          role = excluded.role,
          group_name = excluded.group_name,
          is_active = excluded.is_active,
          updated_at = now()
      `,
      [
        USERS.teacher,
        teacherPassword,
        USERS.student,
        studentPassword,
        USERS.admin,
        adminPassword
      ]
    );

    await pool.query(
      `
        insert into subjects (id, code, title, description, created_at, updated_at)
        values
          ($1, 'calculus', 'Calculus', 'Limits, derivatives, and function analysis', now(), now()),
          ($2, 'linear-algebra', 'Linear Algebra', 'Vectors, matrices, and linear transformations', now(), now())
        on conflict (id) do update set
          code = excluded.code,
          title = excluded.title,
          description = excluded.description,
          updated_at = now()
      `,
      [SUBJECTS.calculus, SUBJECTS.algebra]
    );

    const functionsQuizQuestions = [
      {
        id: "50000000-0000-0000-0000-000000000101",
        type: "single",
        text: "Which statement best describes a mathematical function?",
        options: [
          { id: "51000000-0000-0000-0000-000000000101", text: "One x can map to many y values", isCorrect: false },
          { id: "51000000-0000-0000-0000-000000000102", text: "Each valid x maps to exactly one y value", isCorrect: true },
          { id: "51000000-0000-0000-0000-000000000103", text: "A function must always be a straight line", isCorrect: false }
        ]
      },
      {
        id: "50000000-0000-0000-0000-000000000102",
        type: "short",
        text: "Compute y = 2x + 1 at x = 4",
        correctAnswerText: "9"
      }
    ];

    const derivativeCheckingQuestions = [
      {
        id: "50000000-0000-0000-0000-000000000201",
        type: "single",
        text: "Geometrically, the derivative at a point describes...",
        correctOptionId: "51000000-0000-0000-0000-000000000202",
        options: [
          { id: "51000000-0000-0000-0000-000000000201", text: "Area under the curve", isCorrect: false },
          { id: "51000000-0000-0000-0000-000000000202", text: "Slope of the tangent line", isCorrect: true },
          { id: "51000000-0000-0000-0000-000000000203", text: "Number of roots", isCorrect: false }
        ]
      },
      {
        id: "50000000-0000-0000-0000-000000000202",
        type: "numeric",
        text: "What is the derivative of x^2 at x = 3?",
        correctAnswerText: "6"
      },
      {
        id: "50000000-0000-0000-0000-000000000203",
        type: "multi",
        text: "Select all correct derivative facts",
        correctOptionIds: [
          "51000000-0000-0000-0000-000000000301",
          "51000000-0000-0000-0000-000000000303"
        ],
        options: [
          { id: "51000000-0000-0000-0000-000000000301", text: "If f'(x) > 0 then the function increases", isCorrect: true },
          { id: "51000000-0000-0000-0000-000000000302", text: "The derivative of a constant is 1", isCorrect: false },
          { id: "51000000-0000-0000-0000-000000000303", text: "The derivative of 5x + 2 is 5", isCorrect: true }
        ]
      }
    ];

    await pool.query(
      `
        insert into modules (
          id, title, description, module_type, subject_id, author_id, tags, content, illustration_metadata, asset_metadata, created_at, updated_at
        )
        values
          ($1, 'Functions theory', 'Foundations of function reading and graph interpretation', 'text', $7, $8, array['functions','graphs'], $9::jsonb, null, '[]'::jsonb, now(), now()),
          ($2, 'Functions visual scene', 'Interactive graph scene for functions', 'visual_module', $7, $8, array['functions','visual'], $10::jsonb, null, $11::jsonb, now(), now()),
          ($3, 'Functions questionnaire', 'Question bank for introductory functions', 'questionnaire', $7, $8, array['functions','quiz'], $12::jsonb, null, '[]'::jsonb, now(), now()),
          ($4, 'Derivative theory', 'Core derivative concepts and tangent line meaning', 'text', $7, $8, array['derivative','tangent'], $13::jsonb, null, '[]'::jsonb, now(), now()),
          ($5, 'Derivative visual scene', 'Interactive tangent line visual module', 'visual_module', $7, $8, array['derivative','visual'], $14::jsonb, null, $15::jsonb, now(), now()),
          ($6, 'Derivative checking block', 'Teacher-driven checking block for derivative basics', 'checking_block', $7, $8, array['derivative','assessment'], $16::jsonb, null, '[]'::jsonb, now(), now())
        on conflict (id) do update set
          title = excluded.title,
          description = excluded.description,
          module_type = excluded.module_type,
          subject_id = excluded.subject_id,
          author_id = excluded.author_id,
          tags = excluded.tags,
          content = excluded.content,
          asset_metadata = excluded.asset_metadata,
          updated_at = now()
      `,
      [
        MODULES.functionsText,
        MODULES.functionsVisual,
        MODULES.functionsQuestionnaire,
        MODULES.derivativeText,
        MODULES.derivativeVisual,
        MODULES.derivativeChecking,
        SUBJECTS.calculus,
        USERS.teacher,
        JSON.stringify({
          markdown:
            "# Functions and Graphs\nA function assigns exactly one output to each valid input."
        }),
        JSON.stringify({
          scene: { preset: "function-graph" },
          caption: "Interactive function graph",
          schemaVersion: 1,
          state: null,
          assetMetadata: [{ fileName: "function-graph.json", mimeType: "application/json" }]
        }),
        JSON.stringify([{ fileName: "function-graph.json", mimeType: "application/json" }]),
        JSON.stringify({
          questionnaireId: "60000000-0000-0000-0000-000000000101",
          title: "Functions quiz",
          description: "Quick check for introductory functions",
          questions: functionsQuizQuestions
        }),
        JSON.stringify({
          markdown:
            "# Derivative and Tangent\nThe derivative measures instantaneous rate of change."
        }),
        JSON.stringify({
          scene: { preset: "tangent-line" },
          caption: "Tangent line and slope visual module",
          schemaVersion: 1,
          state: null,
          assetMetadata: [{ fileName: "tangent-line.json", mimeType: "application/json" }]
        }),
        JSON.stringify([{ fileName: "tangent-line.json", mimeType: "application/json" }]),
        JSON.stringify({
          checkingBlockId: "70000000-0000-0000-0000-000000000101",
          title: "Derivative checking block",
          description: "Formal in-class derivative check",
          timeLimitSec: 300,
          allowRefuseToAnswer: true,
          scoring: {
            correct: 1,
            incorrectPenaltyDivisor: 4,
            skip: 0
          },
          questions: derivativeCheckingQuestions
        })
      ]
    );

    await pool.query(
      `
        insert into visual_modules (id, module_id, schema_version, config, state, asset_metadata, created_at, updated_at)
        values
          ('80000000-0000-0000-0000-000000000101', $1, 1, $2::jsonb, null, $3::jsonb, now(), now()),
          ('80000000-0000-0000-0000-000000000102', $4, 1, $5::jsonb, null, $6::jsonb, now(), now())
        on conflict (module_id) do update set
          schema_version = excluded.schema_version,
          config = excluded.config,
          asset_metadata = excluded.asset_metadata,
          updated_at = now()
      `,
      [
        MODULES.functionsVisual,
        JSON.stringify({ preset: "function-graph" }),
        JSON.stringify([{ fileName: "function-graph.json", mimeType: "application/json" }]),
        MODULES.derivativeVisual,
        JSON.stringify({ preset: "tangent-line" }),
        JSON.stringify([{ fileName: "tangent-line.json", mimeType: "application/json" }])
      ]
    );

    await pool.query(
      `
        insert into questionnaires (id, module_id, title, description, settings, created_at, updated_at)
        values ('60000000-0000-0000-0000-000000000101', $1, 'Functions quiz', 'Quick check for introductory functions', '{}'::jsonb, now(), now())
        on conflict (id) do update set title = excluded.title, description = excluded.description, updated_at = now()
      `,
      [MODULES.functionsQuestionnaire]
    );

    for (const [index, question] of functionsQuizQuestions.entries()) {
      await pool.query(
        `
          insert into questions (id, questionnaire_id, author_id, prompt, question_type, correct_answer_text, allow_formula_answer, explanation, position_index, created_at, updated_at)
          values ($1, '60000000-0000-0000-0000-000000000101', $2, $3, $4, $5, false, null, $6, now(), now())
          on conflict (id) do update set
            prompt = excluded.prompt,
            question_type = excluded.question_type,
            correct_answer_text = excluded.correct_answer_text,
            position_index = excluded.position_index,
            updated_at = now()
        `,
        [
          question.id,
          USERS.teacher,
          question.text,
          question.type,
          "correctAnswerText" in question ? question.correctAnswerText ?? null : null,
          index
        ]
      );

      for (const [optionIndex, option] of (question.options ?? []).entries()) {
        await pool.query(
          `
            insert into question_options (id, question_id, option_text, is_correct, position_index, created_at, updated_at)
            values ($1, $2, $3, $4, $5, now(), now())
            on conflict (id) do update set
              option_text = excluded.option_text,
              is_correct = excluded.is_correct,
              position_index = excluded.position_index,
              updated_at = now()
          `,
          [option.id, question.id, option.text, option.isCorrect, optionIndex]
        );
      }
    }

    await pool.query(
      `
        insert into checking_blocks (id, module_id, title, description, timer_sec, allow_refuse_to_answer, created_at, updated_at)
        values ('70000000-0000-0000-0000-000000000101', $1, 'Derivative checking block', 'Formal in-class derivative check', 300, true, now(), now())
        on conflict (id) do update set
          title = excluded.title,
          description = excluded.description,
          timer_sec = excluded.timer_sec,
          allow_refuse_to_answer = excluded.allow_refuse_to_answer,
          updated_at = now()
      `,
      [MODULES.derivativeChecking]
    );

    for (const [index, question] of derivativeCheckingQuestions.entries()) {
      await pool.query(
        `
          insert into questions (id, questionnaire_id, author_id, prompt, question_type, correct_answer_text, allow_formula_answer, explanation, position_index, created_at, updated_at)
          values ($1, null, $2, $3, $4, $5, false, null, $6, now(), now())
          on conflict (id) do update set
            prompt = excluded.prompt,
            question_type = excluded.question_type,
            correct_answer_text = excluded.correct_answer_text,
            position_index = excluded.position_index,
            updated_at = now()
        `,
        [
          question.id,
          USERS.teacher,
          question.text,
          question.type,
          "correctAnswerText" in question ? question.correctAnswerText ?? null : null,
          index
        ]
      );

      for (const [optionIndex, option] of (question.options ?? []).entries()) {
        await pool.query(
          `
            insert into question_options (id, question_id, option_text, is_correct, position_index, created_at, updated_at)
            values ($1, $2, $3, $4, $5, now(), now())
            on conflict (id) do update set
              option_text = excluded.option_text,
              is_correct = excluded.is_correct,
              position_index = excluded.position_index,
              updated_at = now()
          `,
          [option.id, question.id, option.text, option.isCorrect, optionIndex]
        );
      }

      await pool.query(
        `
          insert into checking_block_items (id, checking_block_id, question_id, position_index, created_at, updated_at)
          values ($1, '70000000-0000-0000-0000-000000000101', $2, $3, now(), now())
          on conflict (id) do update set question_id = excluded.question_id, position_index = excluded.position_index, updated_at = now()
        `,
        [`90000000-0000-0000-0000-00000000010${index + 1}`, question.id, index]
      );
    }

    await pool.query(
      `
        insert into lectures (
          id, title, description, subject_id, author_id, semester, level, tags, status, available_for_roles, created_at, updated_at
        )
        values
          ($1, 'Functions and Graphs', 'Lecture on reading graphs and understanding function behavior', $3, $5, 1, 'basic', array['functions','graphs'], 'published', array['student','teacher'], now(), now()),
          ($2, 'Derivative and Tangent', 'Lecture on geometric meaning of the derivative', $3, $5, 1, 'intermediate', array['derivative','tangent'], 'published', array['student','teacher'], now(), now())
        on conflict (id) do update set
          title = excluded.title,
          description = excluded.description,
          subject_id = excluded.subject_id,
          author_id = excluded.author_id,
          semester = excluded.semester,
          level = excluded.level,
          tags = excluded.tags,
          status = excluded.status,
          available_for_roles = excluded.available_for_roles,
          updated_at = now()
      `,
      [LECTURES.functions, LECTURES.derivative, SUBJECTS.calculus, SUBJECTS.algebra, USERS.teacher]
    );

    await pool.query(`delete from lecture_blocks where lecture_id = any($1::uuid[])`, [[LECTURES.functions, LECTURES.derivative]]);

    await pool.query(
      `
        insert into lecture_blocks (id, lecture_id, module_id, block_type, title, position_index, payload, created_at, updated_at)
        values
          ($1, $7, $3, 'text', 'Theory', 0, $8::jsonb, now(), now()),
          ($2, $7, $4, 'visual_module', 'Interactive graph', 1, $9::jsonb, now(), now()),
          ($5, $7, $6, 'quiz', 'Quick quiz', 2, $10::jsonb, now(), now()),
          ($11, $12, $13, 'text', 'Theory', 0, $14::jsonb, now(), now()),
          ($15, $12, $16, 'visual_module', 'Tangent visual', 1, $17::jsonb, now(), now()),
          ($18, $12, $19, 'checking_block', 'Checking block', 2, $20::jsonb, now(), now())
      `,
      [
        BLOCKS.functionsText,
        BLOCKS.functionsVisual,
        MODULES.functionsText,
        MODULES.functionsVisual,
        BLOCKS.functionsQuiz,
        MODULES.functionsQuestionnaire,
        LECTURES.functions,
        JSON.stringify({
          markdown:
            "# Functions and Graphs\nA function assigns exactly one value to each valid input."
        }),
        JSON.stringify({
          scene: { preset: "function-graph" },
          caption: "Interactive function graph",
          schemaVersion: 1
        }),
        JSON.stringify({
          title: "Functions quiz",
          questions: functionsQuizQuestions,
          timeLimitSec: 180
        }),
        BLOCKS.derivativeText,
        LECTURES.derivative,
        MODULES.derivativeText,
        JSON.stringify({
          markdown:
            "# Derivative and Tangent\nThe derivative describes the slope of the tangent line."
        }),
        BLOCKS.derivativeVisual,
        MODULES.derivativeVisual,
        JSON.stringify({
          scene: { preset: "tangent-line" },
          caption: "Tangent line visual module",
          schemaVersion: 1
        }),
        BLOCKS.derivativeChecking,
        MODULES.derivativeChecking,
        JSON.stringify({
          checkingBlockId: "70000000-0000-0000-0000-000000000101",
          questions: derivativeCheckingQuestions,
          timeLimitSec: 300,
          allowRefuseToAnswer: true,
          scoring: {
            correct: 1,
            incorrectPenaltyDivisor: 4,
            skip: 0
          }
        })
      ]
    );

    console.log("Database seed completed");
  } finally {
    await pool.end();
  }
}

void main();
