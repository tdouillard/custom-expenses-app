-- In-database backups: full JSON snapshots of every public table, kept in a private `backups` schema.
-- The schema is not exposed through the API and no API role can touch it. Safe to run repeatedly.
create schema if not exists backups;
revoke all on schema backups from public, anon, authenticated;

create table if not exists backups.snapshots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  label text not null default '',
  data jsonb not null
);
alter table backups.snapshots enable row level security;
revoke all on backups.snapshots from public, anon, authenticated;

create or replace function backups.create_backup(p_label text default '', p_keep int default 14) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  doc jsonb := '{}'::jsonb;
  rows jsonb;
  new_id bigint;
begin
  for t in select table_name from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE' order by 1 loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t.table_name) into rows;
    doc := doc || jsonb_build_object(t.table_name, rows);
  end loop;
  insert into backups.snapshots (label, data) values (p_label, doc) returning id into new_id;
  delete from backups.snapshots where id not in (select id from backups.snapshots order by id desc limit greatest(p_keep, 1));
  return new_id;
end $$;

revoke all on function backups.create_backup(text, int) from public, anon, authenticated;
