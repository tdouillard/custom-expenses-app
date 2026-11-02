-- One row per user holding the whole app state as JSON. Row Level Security keeps each user's data private.
-- Uses OrioleDB storage when the extension is installed (as on the deployed project).
do $$
begin
  execute format(
    'create table if not exists public.app_state (
       user_id uuid primary key references auth.users (id) on delete cascade,
       state jsonb not null default ''{}''::jsonb,
       updated_at timestamptz not null default now()
     ) %s',
    case when exists (select 1 from pg_extension where extname = 'orioledb') then 'using orioledb' else '' end);
end $$;

alter table public.app_state enable row level security;

drop policy if exists "own state: select" on public.app_state;
drop policy if exists "own state: insert" on public.app_state;
drop policy if exists "own state: update" on public.app_state;
drop policy if exists "own state: delete" on public.app_state;

create policy "own state: select" on public.app_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own state: insert" on public.app_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own state: update" on public.app_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own state: delete" on public.app_state for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;

create or replace function public.touch_app_state() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before update on public.app_state
  for each row execute function public.touch_app_state();
