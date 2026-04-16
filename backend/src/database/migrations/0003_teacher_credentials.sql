create table if not exists teacher_credentials (
  user_id uuid primary key references users(id) on delete cascade,
  login text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teacher_credentials_login_lower_idx
  on teacher_credentials ((lower(login)));

insert into teacher_credentials (user_id, login, password_hash, is_active, created_at, updated_at)
select
  u.id,
  lower(u.login),
  u.password_hash,
  u.is_active,
  now(),
  now()
from users u
where u.role = 'teacher'
  and u.password_hash like 'scrypt$%'
on conflict (user_id) do update
set
  login = excluded.login,
  password_hash = case
    when teacher_credentials.password_hash like 'scrypt$%' then teacher_credentials.password_hash
    else excluded.password_hash
  end,
  is_active = excluded.is_active,
  updated_at = now();

update users
set
  password_hash = 'teacher-credentials-only$' || id::text,
  updated_at = now()
where role = 'teacher'
  and password_hash like 'scrypt$%';
