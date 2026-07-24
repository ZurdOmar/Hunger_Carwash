-- ============================================================================
-- OWNER + DEMO por-usuario (Modelo B) — panel in-app
-- Ejecutar en el proyecto DEMO. Reemplaza al enfoque demo_config (Modelo A).
--
-- Incluye:
--   - perfiles.es_owner (super-admin invisible) y perfiles.vigencia_hasta (trial)
--   - is_owner(), is_trial_active() por-usuario (owner exento)
--   - check_role() con gate de trial (bloqueo de ESCRITURA al expirar)
--   - trigger de HERENCIA de vigencia a usuarios nuevos
--   - snapshot/restore de datos DENTRO de la BD (esquema demo_bak)
-- El gate de LECTURA va en 02_rls_trial_read_gate.sql.
-- ============================================================================

begin;

-- 1) Columnas nuevas en perfiles ---------------------------------------------
alter table public.perfiles
  add column if not exists es_owner boolean not null default false;
alter table public.perfiles
  add column if not exists vigencia_hasta timestamptz;
-- Quién creó este perfil (para el reset: podar solo lo que crearon los clientes).
alter table public.perfiles
  add column if not exists creado_por uuid;

-- 2) Helpers -----------------------------------------------------------------
-- ¿El caller es el owner (super-admin)?
create or replace function public.is_owner()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce((select es_owner from public.perfiles where id = auth.uid()), false);
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- ¿El trial del caller sigue vigente? Owner nunca expira; vigencia NULL = activo.
-- Fail-open a nivel dato (sin fila → activo).
create or replace function public.is_trial_active()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce((
    select es_owner or vigencia_hasta is null or vigencia_hasta > now()
    from public.perfiles where id = auth.uid()
  ), true);
$$;
grant execute on function public.is_trial_active() to anon, authenticated;

-- 3) Gate de ESCRITURA en check_role() ---------------------------------------
create or replace function public.check_role(required_role text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_trial_active() then
    return false;
  end if;
  return (select role from public.perfiles where id = auth.uid()) = required_role;
end;
$$;

-- 4) Herencia de vigencia ----------------------------------------------------
-- Todo perfil nuevo que NO sea owner y llegue sin vigencia hereda la vigencia
-- "del demo activo" (la mayor vigencia entre los no-owner). Así, los usuarios
-- que el cliente cree caducan con su misma fecha, sin importar la vía de alta.
create or replace function public.inherit_vigencia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.es_owner is not true and new.vigencia_hasta is null then
    new.vigencia_hasta := (
      select max(vigencia_hasta) from public.perfiles
      where es_owner is not true and vigencia_hasta is not null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_inherit_vigencia on public.perfiles;
create trigger trg_inherit_vigencia
  before insert on public.perfiles
  for each row execute function public.inherit_vigencia();

-- 5) Política de lectura para el owner (ve todos los perfiles) ----------------
drop policy if exists "perfiles_owner_lee_todo" on public.perfiles;
create policy "perfiles_owner_lee_todo" on public.perfiles
  for select using (public.is_owner());

-- 6) Snapshot / Restore de datos DENTRO de la BD -----------------------------
create schema if not exists demo_bak;

-- Congela las tablas de negocio de public en demo_bak (copias de datos).
create or replace function public.demo_snapshot()
returns void
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  if not public.is_owner() then
    raise exception 'Solo el owner puede generar respaldos';
  end if;
  for r in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename <> 'perfiles'
  loop
    execute format('drop table if exists demo_bak.%I', r.tablename);
    execute format('create table demo_bak.%I as table public.%I', r.tablename, r.tablename);
  end loop;
end;
$$;
grant execute on function public.demo_snapshot() to authenticated;

-- Restaura las tablas de negocio desde demo_bak. Vacía todo en un solo TRUNCATE
-- CASCADE (satisface las FKs por estar todo vacío) y reinserta en orden seguro
-- con reintentos (evita depender de session_replication_role). NO toca perfiles.
create or replace function public.demo_restore()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tables text;
  v_pending text[];
  v_next text[];
  t text;
  v_progress boolean;
begin
  if not public.is_owner() then
    raise exception 'Solo el owner puede restaurar respaldos';
  end if;

  select string_agg(format('public.%I', tablename), ', '),
         array_agg(tablename)
    into v_tables, v_pending
  from pg_tables
  where schemaname = 'public'
    and tablename <> 'perfiles'
    and tablename in (select tablename from pg_tables where schemaname = 'demo_bak');

  if v_tables is null then
    raise exception 'No hay respaldo (demo_bak vacío). Genera uno primero.';
  end if;

  execute 'truncate table ' || v_tables || ' cascade';

  -- Reinserta con reintentos hasta que no queden tablas o no haya progreso.
  while array_length(v_pending, 1) is not null loop
    v_next := '{}';
    v_progress := false;
    foreach t in array v_pending loop
      begin
        execute format('insert into public.%I select * from demo_bak.%I', t, t);
        v_progress := true;
      exception when foreign_key_violation then
        v_next := array_append(v_next, t); -- reintentar en la próxima pasada
      end;
    end loop;
    if not v_progress then
      raise exception 'No se pudo restaurar (posible FK cíclica): %', array_to_string(v_next, ', ');
    end if;
    v_pending := nullif(v_next, '{}');
  end loop;
end;
$$;
grant execute on function public.demo_restore() to authenticated;

commit;

-- ============================================================================
-- PASO MANUAL (una vez): marca tu cuenta como owner.
--   update public.perfiles set es_owner = true
--   where id = (select id from auth.users where email = 'omarml@ucol.mx');
-- ============================================================================
