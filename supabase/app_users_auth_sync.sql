-- PASO 2 (ejecutar después de app_users.sql)
-- Sincroniza automáticamente usuarios OAuth (Google/GitHub) desde auth.users
-- hacia app_users. Así el panel admin ve entradas de CUALQUIER dispositivo.

create or replace function public.normalize_auth_provider(raw jsonb)
returns text
language sql
immutable
as $$
  select case
    when coalesce(raw->>'provider', '') in ('google', 'github') then raw->>'provider'
    else 'email'
  end;
$$;

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  insert into public.app_users (email, auth_method, registered_at, last_login_at)
  values (
    lower(btrim(new.email)),
    public.normalize_auth_provider(new.raw_app_meta_data),
    coalesce(new.created_at, now()),
    coalesce(new.last_sign_in_at, new.updated_at, new.created_at, now())
  )
  on conflict (email) do update set
    auth_method = excluded.auth_method,
    last_login_at = excluded.last_login_at;

  return new;
end;
$$;

drop trigger if exists trg_sync_auth_user_to_app_users on auth.users;

create trigger trg_sync_auth_user_to_app_users
  after insert or update of email, last_sign_in_at on auth.users
  for each row
  execute function public.sync_auth_user_to_app_users();

-- Copiar usuarios OAuth que ya existían antes del trigger
insert into public.app_users (email, auth_method, registered_at, last_login_at)
select
  lower(btrim(u.email)),
  public.normalize_auth_provider(u.raw_app_meta_data),
  coalesce(u.created_at, now()),
  coalesce(u.last_sign_in_at, u.updated_at, u.created_at, now())
from auth.users u
where u.email is not null
  and btrim(u.email) <> ''
on conflict (email) do update set
  auth_method = excluded.auth_method,
  last_login_at = excluded.last_login_at;

-- Función que el panel admin puede llamar para refrescar desde auth.users
create or replace function public.refresh_app_users_from_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (email, auth_method, registered_at, last_login_at)
  select
    lower(btrim(u.email)),
    public.normalize_auth_provider(u.raw_app_meta_data),
    coalesce(u.created_at, now()),
    coalesce(u.last_sign_in_at, u.updated_at, u.created_at, now())
  from auth.users u
  where u.email is not null
    and btrim(u.email) <> ''
  on conflict (email) do update set
    auth_method = excluded.auth_method,
    last_login_at = excluded.last_login_at;
end;
$$;

grant execute on function public.refresh_app_users_from_auth() to anon, authenticated, service_role;

-- Registro desde la web (email/contraseña) — cualquier dispositivo
create or replace function public.register_web_user(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  insert into public.app_users (email, auth_method, registered_at, last_login_at)
  values (lower(btrim(p_email)), 'email', now(), now())
  on conflict (email) do update set
    last_login_at = now(),
    auth_method = case
      when app_users.auth_method in ('google', 'github') then app_users.auth_method
      else 'email'
    end;
end;
$$;

grant execute on function public.register_web_user(text) to anon, authenticated, service_role;
