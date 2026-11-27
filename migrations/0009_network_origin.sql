-- Library modules remember whether an engineer built them, and the NIC
-- template that new boxes of that module start from. Show addresses stay
-- on the drawing, not in this column.

alter table equipment add column if not exists origin text not null default 'builtin';
alter table equipment add column if not exists network_json text not null default '[]';

update equipment set origin = 'custom' where kind = 'system' and origin = 'builtin';
