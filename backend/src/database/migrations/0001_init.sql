create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key,
  login text not null,
  password_hash text not null,
  full_name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')),
  group_name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role <> 'student' or group_name is not null)
);

create unique index if not exists users_login_lower_idx on users ((lower(login)));

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  user_agent text null,
  ip_address text null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  replaced_by_token_id uuid null references refresh_tokens(id),
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists refresh_tokens_hash_idx on refresh_tokens(token_hash);
create index if not exists refresh_tokens_user_idx on refresh_tokens(user_id);

create table if not exists subjects (
  id uuid primary key,
  code text not null unique,
  title text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key,
  title text not null,
  description text null,
  module_type text not null check (module_type in ('text', 'visual_module', 'questionnaire', 'checking_block')),
  subject_id uuid null references subjects(id) on delete set null,
  author_id uuid not null references users(id) on delete restrict,
  tags text[] not null default '{}',
  content jsonb not null default '{}'::jsonb,
  illustration_metadata jsonb null,
  asset_metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modules_author_idx on modules(author_id);
create index if not exists modules_subject_idx on modules(subject_id);
create index if not exists modules_type_idx on modules(module_type);

create table if not exists visual_modules (
  id uuid primary key,
  module_id uuid not null unique references modules(id) on delete cascade,
  schema_version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  state jsonb null,
  asset_metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questionnaires (
  id uuid primary key,
  module_id uuid not null unique references modules(id) on delete cascade,
  title text not null,
  description text null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key,
  questionnaire_id uuid null references questionnaires(id) on delete cascade,
  author_id uuid not null references users(id) on delete restrict,
  prompt text not null,
  question_type text not null check (question_type in ('single', 'multi', 'short', 'numeric')),
  correct_answer_text text null,
  allow_formula_answer boolean not null default false,
  explanation text null,
  metadata jsonb not null default '{}'::jsonb,
  position_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_questionnaire_idx on questions(questionnaire_id);

create table if not exists question_options (
  id uuid primary key,
  question_id uuid not null references questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  position_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_options_question_idx on question_options(question_id);

create table if not exists checking_blocks (
  id uuid primary key,
  module_id uuid not null unique references modules(id) on delete cascade,
  title text not null,
  description text null,
  timer_sec integer null,
  allow_refuse_to_answer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checking_block_items (
  id uuid primary key,
  checking_block_id uuid not null references checking_blocks(id) on delete cascade,
  questionnaire_id uuid null references questionnaires(id) on delete set null,
  question_id uuid null references questions(id) on delete restrict,
  position_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (questionnaire_id is not null and question_id is null)
    or (questionnaire_id is null and question_id is not null)
  )
);

create table if not exists lectures (
  id uuid primary key,
  title text not null,
  description text null,
  subject_id uuid null references subjects(id) on delete set null,
  author_id uuid not null references users(id) on delete restrict,
  semester integer null,
  level text not null default 'basic' check (level in ('basic', 'intermediate', 'advanced')),
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  available_for_roles text[] not null default array['student', 'teacher'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lectures_author_idx on lectures(author_id);
create index if not exists lectures_subject_idx on lectures(subject_id);
create index if not exists lectures_status_idx on lectures(status);

create table if not exists lecture_blocks (
  id uuid primary key,
  lecture_id uuid not null references lectures(id) on delete cascade,
  module_id uuid null references modules(id) on delete set null,
  block_type text not null check (block_type in ('text', 'formula', 'image', 'video', 'visual', 'visual_module', 'quiz', 'checking_block')),
  title text null,
  position_index integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lecture_blocks_lecture_idx on lecture_blocks(lecture_id, position_index);
create index if not exists lecture_blocks_module_idx on lecture_blocks(module_id);

create table if not exists lesson_sessions (
  id uuid primary key,
  lecture_id uuid not null references lectures(id) on delete restrict,
  teacher_id uuid not null references users(id) on delete restrict,
  session_code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'stopped')),
  current_block_id uuid null references lecture_blocks(id) on delete set null,
  event_sequence bigint not null default 0,
  visual_state_schema_version integer null,
  visual_state jsonb null,
  started_at timestamptz null,
  stopped_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_sessions_lecture_idx on lesson_sessions(lecture_id);
create index if not exists lesson_sessions_teacher_idx on lesson_sessions(teacher_id);
create index if not exists lesson_sessions_status_idx on lesson_sessions(status);

create table if not exists session_participants (
  id uuid primary key,
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  status text not null check (status in ('connected', 'disconnected', 'idle', 'working', 'submitted')),
  connection_status text not null check (connection_status in ('connected', 'reconnecting', 'disconnected')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  left_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, user_id)
);

create index if not exists session_participants_session_idx on session_participants(session_id);

create table if not exists session_events (
  id uuid primary key,
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  sequence bigint not null,
  event_type text not null,
  actor_user_id uuid null references users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(session_id, sequence)
);

create index if not exists session_events_session_idx on session_events(session_id, sequence);

create table if not exists submissions (
  id uuid primary key,
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  lecture_block_id uuid not null references lecture_blocks(id) on delete restrict,
  status text not null check (status in ('in_progress', 'submitted', 'timed_out')),
  score numeric(10,4) null,
  max_score numeric(10,4) null,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  skipped_count integer not null default 0,
  started_at timestamptz null,
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, user_id, lecture_block_id)
);

create index if not exists submissions_session_idx on submissions(session_id);

create table if not exists submission_answers (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  selected_option_ids text[] not null default '{}',
  answer_text text null,
  formula_answer text null,
  is_refused boolean not null default false,
  is_correct boolean null,
  score_delta numeric(10,4) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(submission_id, question_id)
);

create table if not exists result_summaries (
  id uuid primary key,
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  lecture_block_id uuid not null references lecture_blocks(id) on delete restrict,
  score numeric(10,4) not null default 0,
  max_score numeric(10,4) not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  skipped_count integer not null default 0,
  answers_json jsonb not null default '[]'::jsonb,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, user_id, lecture_block_id)
);
