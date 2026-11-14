-- Accounts: roles, disable, forced password change, hashed reset tokens, audit.

alter table "user" add column if not exists username text not null default '';
alter table "user" add column if not exists role text not null default 'user';
alter table "user" add column if not exists disabled boolean not null default false;
alter table "user" add column if not exists must_change_password boolean not null default false;

update "user" as u
set role = 'admin'
from admins as a
where a.user_id = u.id
  and u.role is distinct from 'admin';

do $$
begin
  alter table "user" add constraint user_role_check check (role in ('user', 'admin'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists user_username_idx on "user" (username) where username <> '';

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null references "user" (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_idx on password_reset_tokens (user_id);

create table if not exists password_reset_attempts (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_attempts_bucket_idx
  on password_reset_attempts (bucket, created_at);

create table if not exists admin_audit (
  id bigserial primary key,
  actor_id text not null,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on admin_audit (created_at desc);

-- Global and per-user device definitions. owner_user_id null is the global library.
create table if not exists device_definitions (
  id text primary key,
  owner_user_id text,
  manufacturer text not null,
  manufacturer_key text not null default '',
  model text not null,
  family text not null default '',
  category text not null default '',
  status text not null default 'current',
  notes text not null default '',
  ports_json text not null default '[]',
  port_data_confidence text not null default 'none',
  ports_unverified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_definitions_owner_idx on device_definitions (owner_user_id);
create index if not exists device_definitions_lookup_idx on device_definitions (manufacturer, model);
