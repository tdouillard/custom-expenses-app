-- Shared data model. Events (and their expenses) are visible only to the users granted access to them,
-- admins see everything. Members and settlements are shared by every signed-in user.
-- Safe to run several times; data from the former single-row `app_state` table is migrated once.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text not null default '';
-- A member can be linked to the user it stands for (at most one member per user).
alter table public.members add column if not exists user_id uuid references auth.users (id) on delete set null;
create unique index if not exists members_user_idx on public.members (user_id) where user_id is not null;

create table if not exists public.events (
  id text primary key,
  name text not null,
  date text not null default '',
  recipients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_access (
  event_id text not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (event_id, user_id)
);
create index if not exists event_access_user_idx on public.event_access (user_id);

create table if not exists public.expenses (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists expenses_event_idx on public.expenses (event_id);

create table if not exists public.settlements (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpers (security definer so policies can read profiles / event_access without recursion).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false)
$$;

create or replace function public.has_event_access(eid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.event_access a where a.event_id = eid and a.user_id = (select auth.uid()))
$$;

-- Every new auth user gets a profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, '')) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
  select u.id, coalesce(u.email, '') from auth.users u on conflict (id) do nothing;

-- Keep profiles.email in step when a user confirms an email change.
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.handle_user_email_change();

-- The creator of an event can always open it.
create or replace function public.grant_creator_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    insert into public.event_access (event_id, user_id) values (new.id, (select auth.uid())) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists events_grant_creator on public.events;
create trigger events_grant_creator after insert on public.events
  for each row execute function public.grant_creator_access();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.event_access enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;

do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('profiles', 'members', 'events', 'event_access', 'expenses', 'settlements') loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Every signed-in user can list users, so a member can be created from one.
create policy "profiles: read" on public.profiles for select to authenticated using (true);
create policy "profiles: admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "members: all" on public.members for all to authenticated using (true) with check (true);
create policy "settlements: all" on public.settlements for all to authenticated using (true) with check (true);

create policy "events: select" on public.events for select to authenticated using (public.has_event_access(id));
create policy "events: insert" on public.events for insert to authenticated with check (true);
create policy "events: update" on public.events for update to authenticated
  using (public.has_event_access(id)) with check (public.has_event_access(id));
create policy "events: delete" on public.events for delete to authenticated using (public.has_event_access(id));

create policy "access: read own or admin" on public.event_access for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "access: admin insert" on public.event_access for insert to authenticated with check (public.is_admin());
create policy "access: admin delete" on public.event_access for delete to authenticated using (public.is_admin());

create policy "expenses: all" on public.expenses for all to authenticated
  using (public.has_event_access(event_id)) with check (public.has_event_access(event_id));

revoke all on public.profiles, public.members, public.events, public.event_access, public.expenses, public.settlements from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.members, public.events, public.event_access, public.expenses, public.settlements to authenticated;

-- Imports a legacy state document ({ members, events, expenses, settlements }) and grants `uid` access to its events.
create or replace function public.import_state(uid uuid, st jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ev jsonb;
  ex jsonb;
  ename text;
  eid text;
  ids jsonb := '{}'::jsonb;
begin
  insert into public.members (name)
    select distinct m from jsonb_array_elements_text(coalesce(st -> 'members', '[]'::jsonb)) m
    on conflict do nothing;

  for ev in select * from jsonb_array_elements(coalesce(st -> 'events', '[]'::jsonb)) loop
    ename := case when jsonb_typeof(ev) = 'string' then ev #>> '{}' else ev ->> 'name' end;
    continue when ename is null or ids ? ename;
    eid := gen_random_uuid()::text;
    insert into public.events (id, name, date, recipients) values (
      eid, ename,
      case when jsonb_typeof(ev) = 'object' then coalesce(ev ->> 'date', '') else '' end,
      case when jsonb_typeof(ev) = 'object' then coalesce(ev -> 'recipients', '[]'::jsonb)
           else coalesce((select jsonb_agg(distinct x ->> 'recipient')
                          from jsonb_array_elements(coalesce(st -> 'expenses', '[]'::jsonb)) x
                          where x ->> 'event' = ename and coalesce(x ->> 'recipient', '') <> ''), '[]'::jsonb) end);
    insert into public.event_access (event_id, user_id) values (eid, uid) on conflict do nothing;
    ids := ids || jsonb_build_object(ename, eid);
  end loop;

  for ex in select * from jsonb_array_elements(coalesce(st -> 'expenses', '[]'::jsonb)) loop
    ename := coalesce(ex ->> 'event', '');
    if not ids ? ename then
      eid := gen_random_uuid()::text;
      insert into public.events (id, name) values (eid, ename);
      insert into public.event_access (event_id, user_id) values (eid, uid) on conflict do nothing;
      ids := ids || jsonb_build_object(ename, eid);
    end if;
    insert into public.expenses (id, event_id, data)
      values (coalesce(ex ->> 'id', gen_random_uuid()::text), ids ->> ename, ex - 'event' - 'id')
      on conflict (id) do nothing;
  end loop;

  insert into public.settlements (id, data)
    select gen_random_uuid()::text, s from jsonb_array_elements(coalesce(st -> 'settlements', '[]'::jsonb)) s;
end $$;

revoke all on function public.import_state(uuid, jsonb) from public, anon, authenticated;

-- One-time migration of the former per-user app_state rows; their owners become admins.
do $$
declare r record;
begin
  if to_regclass('public.app_state') is null or exists (select 1 from public.events) then return; end if;
  for r in execute 'select user_id, state from public.app_state' loop
    perform public.import_state(r.user_id, r.state);
    update public.profiles set is_admin = true where id = r.user_id;
  end loop;
end $$;
