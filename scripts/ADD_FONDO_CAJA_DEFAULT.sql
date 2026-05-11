-- ============================================================
-- ADD_FONDO_CAJA_DEFAULT.sql
-- Agrega un campo "fondo de caja default" a sucursales para que
-- cada turno se abra automáticamente con ese monto inicial en
-- lugar de 0. Sólo el admin puede modificarlo desde /settings.
-- ============================================================

ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS fondo_caja_default numeric NOT NULL DEFAULT 0;

-- Opcional: poner un valor inicial para la matriz.
-- Descomenta y ajusta el monto según el fondo físico real de la caja.
-- UPDATE sucursales SET fondo_caja_default = 500 WHERE es_matriz = true;
