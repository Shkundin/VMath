# Data Model

## Core tables

- `users`: login identity, password hash, display name, role, optional `group_name`, active flag
- `refresh_tokens`: hashed refresh tokens, expiration, revocation, rotation chain, client metadata
- `subjects`: normalized lecture subjects
- `lectures`: lecture metadata, subject, author, semester, level, tags, publication status, allowed roles
- `lecture_blocks`: ordered lecture content blocks assembled from direct payloads or reusable modules
- `modules`: teacher-authored content modules
- `visual_modules`: normalized metadata for visual modules and their schema version
- `questionnaires`: reusable question sets
- `questions`: normalized question definitions
- `question_options`: answer options with correctness flags
- `checking_blocks`: teacher-driven assessment modules
- `checking_block_items`: ordered question references inside a checking block
- `lesson_sessions`: live session lifecycle, current block, session code, event sequence, visual state snapshot
- `session_participants`: membership, live status, connection status, join/leave timestamps
- `session_events`: append-only event log for session state changes
- `submissions`: per-student submission record for a session block
- `submission_answers`: per-question answer payloads
- `result_summaries`: published grading summaries and answer breakdowns

## Key relationships

- `lectures.subject_id -> subjects.id`
- `lectures.author_id -> users.id`
- `lecture_blocks.lecture_id -> lectures.id`
- `lecture_blocks.module_id -> modules.id`
- `modules.subject_id -> subjects.id`
- `modules.author_id -> users.id`
- `visual_modules.module_id -> modules.id`
- `questionnaires.module_id -> modules.id`
- `questions.questionnaire_id -> questionnaires.id`
- `questions.author_id -> users.id`
- `question_options.question_id -> questions.id`
- `checking_blocks.module_id -> modules.id`
- `checking_block_items.checking_block_id -> checking_blocks.id`
- `checking_block_items.question_id -> questions.id`
- `lesson_sessions.lecture_id -> lectures.id`
- `lesson_sessions.teacher_id -> users.id`
- `session_participants.session_id -> lesson_sessions.id`
- `session_participants.user_id -> users.id`
- `session_events.session_id -> lesson_sessions.id`
- `session_events.actor_user_id -> users.id`
- `submissions.session_id -> lesson_sessions.id`
- `submissions.user_id -> users.id`
- `submissions.lecture_block_id -> lecture_blocks.id`
- `submission_answers.submission_id -> submissions.id`
- `submission_answers.question_id -> questions.id`
- `result_summaries.session_id -> lesson_sessions.id`
- `result_summaries.user_id -> users.id`
- `result_summaries.lecture_block_id -> lecture_blocks.id`

## Modeling notes

- every primary key is a UUID
- timestamps use ISO 8601 values generated from Postgres `now()`
- lecture content supports `text`, `formula`, `image`, `video`, `visual_module`, `quiz`, and `checking_block`
- tags stay as arrays for practical search, while subjects remain normalized relational data
- visual module runtime state is persisted on the session plus emitted over websocket events

## Seed dataset

The local seed creates:

- one teacher, one student, one admin
- normalized subjects
- reusable modules
- one questionnaire and one checking block
- two demo lectures with lecture blocks

This is enough for local auth, lecture browsing, live sessions, answer submission, grading, and stats flows.
