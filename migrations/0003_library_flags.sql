-- Remembers that the corporate starter pack was added for this account,
-- so a model the user deletes does not come back on the next visit.

create table if not exists library_flags (
  user_id text primary key,
  corporate_pack integer not null default 0
);
