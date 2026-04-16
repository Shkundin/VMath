alter table users
  add column if not exists last_login_at timestamptz null,
  add column if not exists last_seen_at timestamptz null;

create index if not exists users_last_login_at_idx on users(last_login_at desc nulls last);
create index if not exists users_last_seen_at_idx on users(last_seen_at desc nulls last);

create table if not exists user_auth_events (
  id uuid primary key,
  user_id uuid null references users(id) on delete set null,
  login text not null,
  role text null check (role in ('student', 'teacher', 'admin')),
  full_name text null,
  event_type text not null check (event_type in ('login', 'refresh', 'logout', 'login_failed')),
  status text not null check (status in ('success', 'failed')),
  ip_address text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_auth_events_user_idx on user_auth_events(user_id, created_at desc);
create index if not exists user_auth_events_login_idx on user_auth_events(lower(login), created_at desc);
create index if not exists user_auth_events_type_idx on user_auth_events(event_type, created_at desc);
