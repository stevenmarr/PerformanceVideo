-- jpm = 1 means the JPM show drawing was offered once. Deleting it does not bring it back.

alter table library_flags add column if not exists jpm integer not null default 0;
