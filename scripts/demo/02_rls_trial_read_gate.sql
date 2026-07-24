-- ============================================================================
-- DEMO TRIAL — gate de LECTURA (bloqueo estricto DB al expirar)
-- Ejecutar SOLO en el proyecto DEMO, DESPUÉS de 01_demo_trial.sql y de haber
-- aplicado el esquema/políticas base (FIX_RLS_USE_CHECK_ROLE.sql).
--
-- Recrea las políticas SELECT que hoy solo piden `auth.uid() IS NOT NULL`
-- (o usuario propio) agregándoles `AND public.is_trial_active()`. Así, cuando
-- el trial vence, el cliente tampoco puede LEER datos ni llamando la API REST
-- directo con su token.
--
-- NOTA: `perfiles` se deja SIN gate a propósito: la app necesita leer el rol
-- del usuario para identificarlo y mostrar el mensaje de "prueba expirada".
-- El gate de ESCRITURA (check_role) ya bloquea cualquier cambio a perfiles.
-- ============================================================================

begin;

-- ordenes_servicio
drop policy if exists "ordenes_lectura_autenticado" on public.ordenes_servicio;
create policy "ordenes_lectura_autenticado" on public.ordenes_servicio
  for select using (auth.uid() is not null and public.is_trial_active());

-- turnos (mantiene la lógica de rol/propio + gate de trial)
drop policy if exists "turnos_lectura_rol" on public.turnos;
create policy "turnos_lectura_rol" on public.turnos
  for select using (
    (check_role('admin') or check_role('supervisor') or usuario_id = auth.uid())
    and public.is_trial_active()
  );

-- precios_base
drop policy if exists "precios_lectura_autenticado" on public.precios_base;
create policy "precios_lectura_autenticado" on public.precios_base
  for select using (auth.uid() is not null and public.is_trial_active());

-- servicios
drop policy if exists "servicios_lectura_autenticado" on public.servicios;
create policy "servicios_lectura_autenticado" on public.servicios
  for select using (auth.uid() is not null and public.is_trial_active());

-- vehiculos
drop policy if exists "vehiculos_lectura_autenticado" on public.vehiculos;
create policy "vehiculos_lectura_autenticado" on public.vehiculos
  for select using (auth.uid() is not null and public.is_trial_active());

-- clientes
drop policy if exists "clientes_lectura_autenticado" on public.clientes;
create policy "clientes_lectura_autenticado" on public.clientes
  for select using (auth.uid() is not null and public.is_trial_active());

-- lavadores
drop policy if exists "lavadores_lectura_autenticado" on public.lavadores;
create policy "lavadores_lectura_autenticado" on public.lavadores
  for select using (auth.uid() is not null and public.is_trial_active());

-- cajones
drop policy if exists "cajones_lectura_autenticado" on public.cajones;
create policy "cajones_lectura_autenticado" on public.cajones
  for select using (auth.uid() is not null and public.is_trial_active());

-- sucursales
drop policy if exists "sucursales_lectura_autenticado" on public.sucursales;
create policy "sucursales_lectura_autenticado" on public.sucursales
  for select using (auth.uid() is not null and public.is_trial_active());

-- reglas_promocion
drop policy if exists "promociones_lectura_autenticado" on public.reglas_promocion;
create policy "promociones_lectura_autenticado" on public.reglas_promocion
  for select using (auth.uid() is not null and public.is_trial_active());

-- membresias
drop policy if exists "membresias_lectura_autenticado" on public.membresias;
create policy "membresias_lectura_autenticado" on public.membresias
  for select using (auth.uid() is not null and public.is_trial_active());

commit;

-- ============================================================================
-- Si tu esquema tiene tablas adicionales con lectura `auth.uid() IS NOT NULL`
-- (p.ej. tamaños_vehiculos), replica el mismo patrón:
--   drop policy if exists "<nombre>" on public.<tabla>;
--   create policy "<nombre>" on public.<tabla>
--     for select using (auth.uid() is not null and public.is_trial_active());
-- Revisa las políticas actuales con:
--   select tablename, policyname, cmd, qual from pg_policies
--   where schemaname='public' and cmd='SELECT' order by tablename;
-- ============================================================================
