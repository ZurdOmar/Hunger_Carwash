-- ============================================================
-- SCRIPT DE LIMPIEZA DE DATOS — Hunger Car Wash
-- ============================================================
-- Uso:  Supabase → SQL Editor → pegar y ejecutar ANTES de
--       entregar la app al cliente, para dejar la BD limpia
--       pero con catálogos listos para operar.
--
-- NO TOCA (se conservan):
--   • sucursales         — catálogo de sucursales
--   • servicios          — catálogo de servicios y precios
--   • precios_base       — precios por tamaño de vehículo
--   • reglas_promocion   — reglas de promoción / membresías
--   • cajones            — 5 cajones por defecto
--   • lavadores          — ver bloque OPCIONAL si se quieren borrar
--   • perfiles           — cuentas de usuario (admin)
--   • auth.users         — autenticación de Supabase
--
-- LIMPIA (queda vacío):
--   • ordenes_servicio   — historial de órdenes
--   • turnos             — historial de cortes de caja
--   • membresias         — membresías de clientes
--   • vehiculos          — vehículos registrados
--   • clientes           — datos de clientes
--
-- También reinicia el contador de folios a 1.
-- ============================================================

BEGIN;

DELETE FROM public.ordenes_servicio;
DELETE FROM public.turnos;
DELETE FROM public.membresias;
DELETE FROM public.vehiculos;
DELETE FROM public.clientes;

ALTER SEQUENCE IF EXISTS public.ordenes_servicio_folio_seq RESTART WITH 1;

COMMIT;


-- ============================================================
-- OPCIONAL A — Borrar lavadores (empleados)
-- ============================================================
-- Descomenta si el cliente quiere registrar a su propia planta
-- desde cero. Primero se anula la referencia en cajones y
-- después se borran los lavadores.
-- ============================================================

-- BEGIN;
--   UPDATE public.cajones SET default_lavador_id = NULL;
--   DELETE FROM public.lavadores;
-- COMMIT;


-- ============================================================
-- OPCIONAL B — Reset total de cajones a 5 por defecto
-- ============================================================
-- Solo si la tabla quedó con cajones de prueba con nombres
-- raros y se quiere dejar limpio: "Cajón 1" … "Cajón 5".
-- Requiere ejecutar antes el OPCIONAL A (o bien no tener
-- órdenes referenciando cajones — la limpieza principal ya
-- se encargó de eso).
-- ============================================================

-- BEGIN;
--   DELETE FROM public.cajones;
--   ALTER SEQUENCE IF EXISTS public.cajones_id_seq RESTART WITH 1;
--   INSERT INTO public.cajones (label) VALUES
--     ('Cajón 1'),
--     ('Cajón 2'),
--     ('Cajón 3'),
--     ('Cajón 4'),
--     ('Cajón 5');
-- COMMIT;


-- ============================================================
-- VERIFICACIÓN — ejecutar al final para confirmar resultado
-- ============================================================
-- Operacionales deben quedar en 0.
-- Catálogos deben conservar sus filas.
-- ============================================================

-- SELECT 'ordenes_servicio'        AS tabla, COUNT(*) AS filas FROM public.ordenes_servicio
-- UNION ALL SELECT 'turnos',                 COUNT(*) FROM public.turnos
-- UNION ALL SELECT 'membresias',             COUNT(*) FROM public.membresias
-- UNION ALL SELECT 'vehiculos',              COUNT(*) FROM public.vehiculos
-- UNION ALL SELECT 'clientes',               COUNT(*) FROM public.clientes
-- UNION ALL SELECT 'sucursales (catálogo)',  COUNT(*) FROM public.sucursales
-- UNION ALL SELECT 'servicios  (catálogo)',  COUNT(*) FROM public.servicios
-- UNION ALL SELECT 'precios_base (catálogo)', COUNT(*) FROM public.precios_base
-- UNION ALL SELECT 'reglas_promocion',       COUNT(*) FROM public.reglas_promocion
-- UNION ALL SELECT 'cajones',                COUNT(*) FROM public.cajones
-- UNION ALL SELECT 'lavadores',              COUNT(*) FROM public.lavadores
-- UNION ALL SELECT 'perfiles',               COUNT(*) FROM public.perfiles;
