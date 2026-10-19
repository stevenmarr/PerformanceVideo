-- Saved drawings, including the Solventum template, and the internal
-- graph of a system saved from a group. solventum = 1 means the template
-- was offered once; deleting it does not bring it back.

alter table library_flags add column if not exists solventum integer not null default 0;

alter table equipment add column if not exists graph_json text not null default '';

create table if not exists drawings (
  id serial primary key,
  user_id text not null,
  name text not null,
  template_key text not null default '',
  graph_json text not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists drawings_user_template_idx
  on drawings (user_id, template_key)
  where template_key <> '';

create index if not exists drawings_user_idx on drawings (user_id);
