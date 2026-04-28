create table if not exists teacher_meetings (
  id uuid primary key,
  teacher_id uuid not null references users(id) on delete cascade,
  title text not null,
  platform text not null,
  url text not null,
  scheduled_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_meetings_teacher_idx
  on teacher_meetings(teacher_id, scheduled_at);

create table if not exists teacher_homeworks (
  id uuid primary key,
  teacher_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  allowed_formats text[] not null default '{}',
  max_score numeric(10,4) not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_homeworks_teacher_idx
  on teacher_homeworks(teacher_id, due_at);

create table if not exists teacher_homework_submissions (
  id uuid primary key,
  homework_id uuid not null references teacher_homeworks(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_data text not null,
  submitted_at timestamptz not null default now(),
  teacher_comment text not null default '',
  score numeric(10,4) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(homework_id, student_id)
);

create index if not exists teacher_homework_submissions_homework_idx
  on teacher_homework_submissions(homework_id, submitted_at desc);

create table if not exists teacher_testing_sessions (
  id uuid primary key,
  teacher_id uuid not null references users(id) on delete cascade,
  title text not null,
  duration_min integer not null check (duration_min > 0),
  status text not null check (status in ('active', 'finished')),
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  questions_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teacher_testing_sessions_active_teacher_idx
  on teacher_testing_sessions(teacher_id)
  where status = 'active';

create index if not exists teacher_testing_sessions_teacher_idx
  on teacher_testing_sessions(teacher_id, started_at desc);

create table if not exists teacher_testing_submissions (
  id uuid primary key,
  testing_session_id uuid not null references teacher_testing_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  answers_json jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  skipped_count integer not null default 0,
  total_questions integer not null default 0,
  percent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(testing_session_id, student_id)
);

create index if not exists teacher_testing_submissions_session_idx
  on teacher_testing_submissions(testing_session_id, submitted_at desc);
