-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - HUNGER CARWASH SECURITY IMPLEMENTATION
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- TABLA: perfiles
-- Usuarios pueden ver su propio perfil + admin ve todo
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil_propio_lectura" ON perfiles;
CREATE POLICY "perfil_propio_lectura" ON perfiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_edita_perfil" ON perfiles;
CREATE POLICY "admin_edita_perfil" ON perfiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_crea_perfil" ON perfiles;
CREATE POLICY "admin_crea_perfil" ON perfiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: ordenes_servicio
-- Básica: cualquier usuario loggeado ve órdenes
-- Admin/Supervisor ven todo, Cajero ve sus propias órdenes
ALTER TABLE ordenes_servicio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_ordenes" ON ordenes_servicio;
CREATE POLICY "lectura_ordenes" ON ordenes_servicio
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Cualquier usuario autenticado puede leer
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "crear_orden" ON ordenes_servicio;
CREATE POLICY "crear_orden" ON ordenes_servicio
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'cajero'))
  );

DROP POLICY IF EXISTS "actualizar_orden" ON ordenes_servicio;
CREATE POLICY "actualizar_orden" ON ordenes_servicio
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- TABLA: turnos
-- Admin/Supervisor ven todo, Cajero ve solo los suyos
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_turnos" ON turnos;
CREATE POLICY "lectura_turnos" ON turnos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    ) OR
    usuario_id = auth.uid()
  );

DROP POLICY IF EXISTS "crear_turno" ON turnos;
CREATE POLICY "crear_turno" ON turnos
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid() AND
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'cajero'))
  );

DROP POLICY IF EXISTS "actualizar_turno" ON turnos;
CREATE POLICY "actualizar_turno" ON turnos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- TABLA: precios_base
-- Todos ven, solo admin edita
ALTER TABLE precios_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_precios" ON precios_base;
CREATE POLICY "lectura_precios" ON precios_base
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "admin_edita_precios" ON precios_base;
CREATE POLICY "admin_edita_precios" ON precios_base
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_crea_precios" ON precios_base;
CREATE POLICY "admin_crea_precios" ON precios_base
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: servicios
-- Todos ven, solo admin edita
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_servicios" ON servicios;
CREATE POLICY "lectura_servicios" ON servicios
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "admin_edita_servicios" ON servicios;
CREATE POLICY "admin_edita_servicios" ON servicios
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_crea_servicios" ON servicios;
CREATE POLICY "admin_crea_servicios" ON servicios
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: vehiculos
-- Todos ven, todos pueden crear (para POS)
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_vehiculos" ON vehiculos;
CREATE POLICY "lectura_vehiculos" ON vehiculos
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "crear_vehiculos" ON vehiculos;
CREATE POLICY "crear_vehiculos" ON vehiculos
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- TABLA: clientes
-- Todos ven, todos pueden crear
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_clientes" ON clientes;
CREATE POLICY "lectura_clientes" ON clientes
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "crear_clientes" ON clientes;
CREATE POLICY "crear_clientes" ON clientes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- TABLA: lavadores
-- Todos ven, solo admin/supervisor edita
ALTER TABLE lavadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_lavadores" ON lavadores;
CREATE POLICY "lectura_lavadores" ON lavadores
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "edita_lavadores" ON lavadores;
CREATE POLICY "edita_lavadores" ON lavadores
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- TABLA: cajones
-- Todos ven, solo admin edita
ALTER TABLE cajones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_cajones" ON cajones;
CREATE POLICY "lectura_cajones" ON cajones
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "edita_cajones" ON cajones;
CREATE POLICY "edita_cajones" ON cajones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: sucursales
-- Todos ven, solo admin edita
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_sucursales" ON sucursales;
CREATE POLICY "lectura_sucursales" ON sucursales
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "edita_sucursales" ON sucursales;
CREATE POLICY "edita_sucursales" ON sucursales
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: reglas_promocion
-- Todos ven, solo admin edita
ALTER TABLE reglas_promocion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_promociones" ON reglas_promocion;
CREATE POLICY "lectura_promociones" ON reglas_promocion
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "admin_edita_promociones" ON reglas_promocion;
CREATE POLICY "admin_edita_promociones" ON reglas_promocion
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TABLA: membresias
-- Todos ven, supervisores pueden editar
ALTER TABLE membresias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura_membresias" ON membresias;
CREATE POLICY "lectura_membresias" ON membresias
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "edita_membresias" ON membresias;
CREATE POLICY "edita_membresias" ON membresias
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esto para verificar que RLS está activo:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;
-- Deberías ver todas las tablas listadas arriba.
