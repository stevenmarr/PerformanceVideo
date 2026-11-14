-- Repeatable device-catalog import marker, aliases for search, and a
-- per-user link from a library model back to a global catalog id.

create table if not exists catalog_imports (
  id text primary key,
  schema_version text not null,
  generated_at text not null,
  device_count integer not null,
  imported_at timestamptz not null default now()
);

alter table device_definitions add column if not exists aliases_json text not null default '[]';

alter table equipment add column if not exists catalog_id text not null default '';

create unique index if not exists equipment_user_catalog_idx
  on equipment (user_id, catalog_id)
  where catalog_id <> '';
