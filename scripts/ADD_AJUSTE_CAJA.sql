-- ====================================================================
-- Agregar columnas de ajuste manual al corte de caja
-- ====================================================================
-- Propósito: permitir registrar montos que físicamente entraron a caja
-- pero que no quedaron capturados como órdenes en el sistema
-- (ej: ventas pendientes de un día anterior con el POS bloqueado,
--  propinas, faltantes, sobrantes, devoluciones en efectivo, etc.).
--
-- La fórmula de diferencia cambia a:
--   diferencia = monto_declarado - monto_sistema - ajuste_monto
-- ====================================================================

ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS ajuste_monto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_nota text NULL;

COMMENT ON COLUMN turnos.ajuste_monto IS
  'Ajuste manual al corte. Positivo = ingreso no registrado (ventas pendientes, propinas). Negativo = salida (devoluciones, faltantes).';

COMMENT ON COLUMN turnos.ajuste_nota IS
  'Motivo del ajuste. Obligatorio cuando ajuste_monto != 0.';
