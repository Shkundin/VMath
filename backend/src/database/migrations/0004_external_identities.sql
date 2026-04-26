create table if not exists external_identities (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('google', 'vk')),
  provider_subject text not null,
  email text null,
  display_name text null,
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject),
  unique (user_id, provider)
);

create index if not exists external_identities_user_idx
  on external_identities(user_id);

create index if not exists external_identities_email_idx
  on external_identities(lower(email));
