create table if not exists teacher_resources (
  id uuid primary key,
  teacher_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('video', 'photo')),
  title text not null,
  url text not null default '',
  note text not null default '',
  file_name text null,
  file_type text null,
  file_data text null,
  mime_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_resources_teacher_kind_idx
  on teacher_resources(teacher_id, kind, created_at desc);
