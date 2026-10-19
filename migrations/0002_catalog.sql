-- Per-user equipment library and title-block company record.
-- Master show drawings are a later step. Every converter, splitter,
-- distribution amp, and adapter is stored as its own equipment row.

create table if not exists studios (
  user_id text primary key,
  company_name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  tagline text not null default '',
  drawn_by text not null default ''
);

create table if not exists device_types (
  id serial primary key,
  user_id text not null,
  name text not null,
  color text not null default '#111111',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists manufacturers (
  id serial primary key,
  user_id text not null,
  name text not null,
  website text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists connection_types (
  id serial primary key,
  user_id text not null,
  name text not null,
  color text not null,
  spec_level text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists cable_lengths (
  id serial primary key,
  user_id text not null,
  length_value text not null,
  display_order integer not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, length_value)
);

create table if not exists equipment (
  id serial primary key,
  user_id text not null,
  device_type_id integer not null references device_types (id) on delete restrict,
  manufacturer_id integer not null references manufacturers (id) on delete restrict,
  model text not null,
  kind text not null default 'device',
  notes text not null default '',
  product_website text not null default '',
  pins_json text not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, device_type_id, manufacturer_id, model)
);

create index if not exists device_types_user_idx on device_types (user_id);
create index if not exists manufacturers_user_idx on manufacturers (user_id);
create index if not exists connection_types_user_idx on connection_types (user_id);
create index if not exists cable_lengths_user_idx on cable_lengths (user_id);
create index if not exists equipment_user_idx on equipment (user_id);
