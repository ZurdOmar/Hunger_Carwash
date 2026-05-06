-- ============================================================================
-- FIX RLS: REEMPLAZAR auth.jwt() ->> 'role' CON check_role()
-- ============================================================================
-- Problema: auth.jwt() ->> 'role' siempre retorna NULL en Supabase porque
-- el JWT de la app no incluye el rol de la aplicación por defecto.
-- Todas las políticas que usan esa expresión son efectivamente DESACTIVADAS.
--
-- Solución: usar check_role(required_role) que es SECURITY DEFINER y consulta
-- public.perfiles directamente, donde sí está el rol real del usuario.
--
-- Este script también elimina cualquier política duplicada tipo
-- "Gestión operativa para personal" con ALL/true que sobrescribe todo lo demás.
--
-- INSTRUCCIONES:
-- 1. Copia este script completo.
-- 2. Ve a Supabase → SQL Editor → New query.
-- 3. Pega y ejecuta.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA: perfiles
-- SELECT solo propio (ConfigContext usa eq('id', user.id); admin usa RPC get_todos_usuarios)
-- INSERT/UPDATE vía check_role — SECURITY DEFINER evita recursión en perfiles
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perfiles'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.perfiles'; END LOOP;
END $$;

CREATE POLICY "perfiles_lectura_propia" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfiles_admin_inserta" ON perfiles
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "perfiles_admin_actualiza" ON perfiles
  FOR UPDATE USING (check_role('admin'));

-- ============================================================================
-- TABLA: ordenes_servicio
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ordenes_servicio'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ordenes_servicio'; END LOOP;
END $$;

CREATE POLICY "ordenes_lectura_autenticado" ON ordenes_servicio
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ordenes_insertar_personal" ON ordenes_servicio
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (check_role('admin') OR check_role('supervisor') OR check_role('cajero'))
  );

CREATE POLICY "ordenes_actualizar_supervisores" ON ordenes_servicio
  FOR UPDATE USING (
    check_role('admin') OR check_role('supervisor')
  );

-- ============================================================================
-- TABLA: turnos
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'turnos'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.turnos'; END LOOP;
END $$;

CREATE POLICY "turnos_lectura_rol" ON turnos
  FOR SELECT USING (
    check_role('admin') OR check_role('supervisor') OR usuario_id = auth.uid()
  );

CREATE POLICY "turnos_crear" ON turnos
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid() AND
    (check_role('admin') OR check_role('supervisor') OR check_role('cajero'))
  );

CREATE POLICY "turnos_actualizar_supervisores" ON turnos
  FOR UPDATE USING (
    check_role('admin') OR check_role('supervisor')
  );

-- ============================================================================
-- TABLA: precios_base
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'precios_base'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.precios_base'; END LOOP;
END $$;

CREATE POLICY "precios_lectura_autenticado" ON precios_base
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "precios_admin_inserta" ON precios_base
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "precios_admin_actualiza" ON precios_base
  FOR UPDATE USING (check_role('admin'));

CREATE POLICY "precios_admin_elimina" ON precios_base
  FOR DELETE USING (check_role('admin'));

-- ============================================================================
-- TABLA: servicios
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'servicios'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.servicios'; END LOOP;
END $$;

CREATE POLICY "servicios_lectura_autenticado" ON servicios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "servicios_admin_inserta" ON servicios
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "servicios_admin_actualiza" ON servicios
  FOR UPDATE USING (check_role('admin'));

CREATE POLICY "servicios_admin_elimina" ON servicios
  FOR DELETE USING (check_role('admin'));

-- ============================================================================
-- TABLA: vehiculos
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehiculos'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vehiculos'; END LOOP;
END $$;

CREATE POLICY "vehiculos_lectura_autenticado" ON vehiculos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vehiculos_insertar_autenticado" ON vehiculos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vehiculos_actualizar_autenticado" ON vehiculos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLA: clientes
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.clientes'; END LOOP;
END $$;

CREATE POLICY "clientes_lectura_autenticado" ON clientes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "clientes_insertar_autenticado" ON clientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clientes_actualizar_autenticado" ON clientes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLA: lavadores
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lavadores'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lavadores'; END LOOP;
END $$;

CREATE POLICY "lavadores_lectura_autenticado" ON lavadores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lavadores_admin_supervisor_inserta" ON lavadores
  FOR INSERT WITH CHECK (check_role('admin') OR check_role('supervisor'));

CREATE POLICY "lavadores_admin_supervisor_actualiza" ON lavadores
  FOR UPDATE USING (check_role('admin') OR check_role('supervisor'));

-- ============================================================================
-- TABLA: cajones
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cajones'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.cajones'; END LOOP;
END $$;

CREATE POLICY "cajones_lectura_autenticado" ON cajones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cajones_admin_inserta" ON cajones
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "cajones_admin_actualiza" ON cajones
  FOR UPDATE USING (check_role('admin'));

-- ============================================================================
-- TABLA: sucursales
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sucursales'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sucursales'; END LOOP;
END $$;

CREATE POLICY "sucursales_lectura_autenticado" ON sucursales
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sucursales_admin_inserta" ON sucursales
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "sucursales_admin_actualiza" ON sucursales
  FOR UPDATE USING (check_role('admin'));

-- ============================================================================
-- TABLA: reglas_promocion
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reglas_promocion'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.reglas_promocion'; END LOOP;
END $$;

CREATE POLICY "promociones_lectura_autenticado" ON reglas_promocion
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "promociones_admin_inserta" ON reglas_promocion
  FOR INSERT WITH CHECK (check_role('admin'));

CREATE POLICY "promociones_admin_actualiza" ON reglas_promocion
  FOR UPDATE USING (check_role('admin'));

-- ============================================================================
-- TABLA: membresias
-- ============================================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'membresias'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.membresias'; END LOOP;
END $$;

CREATE POLICY "membresias_lectura_autenticado" ON membresias
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "membresias_supervisor_inserta" ON membresias
  FOR INSERT WITH CHECK (check_role('admin') OR check_role('supervisor'));

CREATE POLICY "membresias_supervisor_actualiza" ON membresias
  FOR UPDATE USING (check_role('admin') OR check_role('supervisor'));

-- ============================================================================
-- Asegurar RLS habilitado en todas las tablas
-- ============================================================================
ALTER TABLE perfiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_servicio   ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios_base       ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lavadores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_promocion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE membresias         ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- Ejecuta esto por separado para confirmar que no quedan políticas rotas:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- ============================================================================
