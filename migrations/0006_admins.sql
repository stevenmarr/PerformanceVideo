-- Accounts allowed to read every user's drawings and library. Granted at
-- request time, not by this file. user_id matches Better Auth "user"."id".

create table if not exists admins (
  user_id text primary key,
  email text not null default '',
  name text not null default '',
  granted_at timestamptz not null default now()
);
