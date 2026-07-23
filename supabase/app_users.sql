-- Run once in Supabase → SQL Editor (project tzyjfgnrjripcemrnjzm)
-- Central user registry for the admin panel (all browsers / devices).

create table if not exists public.app_users (
  email text primary key,
  auth_method text not null default 'email',
  registered_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

drop policy if exists "app_users_public_read" on public.app_users;
drop policy if exists "app_users_public_insert" on public.app_users;
drop policy if exists "app_users_public_update" on public.app_users;
drop policy if exists "app_users_public_delete" on public.app_users;

create policy "app_users_public_read"
  on public.app_users for select
  using (true);

create policy "app_users_public_insert"
  on public.app_users for insert
  with check (true);

create policy "app_users_public_update"
  on public.app_users for update
  using (true);

create policy "app_users_public_delete"
  on public.app_users for delete
  using (true);
