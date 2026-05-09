-- ============================================================================
-- RECUPERACIÓN DE TURNO AUTO-CERRADO POR EL DASHBOARD
-- ============================================================================
-- Contexto: el dashboard antiguo cerraba automáticamente el turno del día
-- anterior (con monto_declarado = monto_sistema, sin conteo físico real) y
-- abría uno vacío para hoy. Resultado: los $ del día anterior aparecen como
-- corte sin diferencia y el dashboard muestra $0 hoy.
--
-- Este script:
--   PASO A — Diagnostica (solo SELECT, NO modifica nada)
--   PASO B — Reabre el turno cerrado erróneamente
--   PASO C — Borra el turno vacío que abrió el dashboard hoy
--
-- IMPORTANTE: Ejecuta los pasos UNO POR UNO, no todo el archivo de golpe.
-- Verifica cada paso antes de continuar al siguiente.
-- ============================================================================


-- ============================================================================
-- PASO A — DIAGNÓSTICO (solo lectura, ejecutar primero)
-- ============================================================================
-- A.1) Lista todos los turnos de los últimos 2 días con sus montos:

SELECT
  id,
  to_char(fecha_apertura AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS apertura_local,
  to_char(fecha_cierre   AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS cierre_local,
  estado,
  monto_inicial,
  monto_sistema,
  monto_declarado,
  diferencia
FROM turnos
WHERE fecha_apertura >= (now() - INTERVAL '2 days')
ORDER BY fecha_apertura DESC;


-- A.2) Cuántas órdenes y total de $ tiene cada turno reciente:

SELECT
  t.id AS turno_id,
  to_char(t.fecha_apertura AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS apertura_local,
  t.estado,
  COUNT(o.id)             AS num_ordenes,
  COALESCE(SUM(o.total),0) AS total_ordenes,
  COALESCE(SUM(o.total) FILTER (WHERE o.metodo_pago = 'Efectivo'), 0)  AS total_efectivo,
  COALESCE(SUM(o.total) FILTER (WHERE o.metodo_pago = 'Tarjeta'),  0)  AS total_tarjeta,
  COALESCE(SUM(o.total) FILTER (WHERE o.metodo_pago = 'Membresía'),0)  AS total_membresia
FROM turnos t
LEFT JOIN ordenes_servicio o ON o.turno_id = t.id
WHERE t.fecha_apertura >= (now() - INTERVAL '2 days')
GROUP BY t.id, t.fecha_apertura, t.estado
ORDER BY t.fecha_apertura DESC;


-- ⛔ PARA AHORA. Identifica:
--   • TURNO_AYER  = el turno con num_ordenes ≈ 8 y total_ordenes ≈ 1170 (estado='cerrado')
--   • TURNO_HOY   = el turno con num_ordenes = 0 y estado='abierto' (apertura es hoy)


-- ============================================================================
-- PASO B — REABRIR EL TURNO DE AYER
-- ============================================================================
-- Reemplaza 'PEGA-EL-UUID-DE-TURNO_AYER' por el id real de A.2 antes de ejecutar.

UPDATE turnos
SET estado          = 'abierto',
    fecha_cierre    = NULL,
    monto_declarado = NULL,
    monto_sistema   = NULL,
    diferencia      = NULL
WHERE id = 'PEGA-EL-UUID-DE-TURNO_AYER'
  AND estado = 'cerrado'                 -- guarda: solo si está cerrado
RETURNING id, estado, fecha_apertura, fecha_cierre;

-- Esperado: 1 fila devuelta con estado='abierto' y fecha_cierre=NULL.


-- ============================================================================
-- PASO C — BORRAR EL TURNO VACÍO DE HOY
-- ============================================================================
-- Reemplaza 'PEGA-EL-UUID-DE-TURNO_HOY' por el id real de A.2 antes de ejecutar.
-- La guarda EXISTS evita borrar un turno que ya tenga órdenes asignadas.

DELETE FROM turnos
WHERE id = 'PEGA-EL-UUID-DE-TURNO_HOY'
  AND estado = 'abierto'
  AND NOT EXISTS (
    SELECT 1 FROM ordenes_servicio o WHERE o.turno_id = turnos.id
  )
RETURNING id;

-- Esperado: 1 fila devuelta con el id eliminado.
-- Si NO devuelve nada, significa que ese turno ya tiene órdenes asignadas
-- (no debería, pero si pasara: NO lo borres, avísame).


-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Solo debe quedar UN turno abierto, el de ayer, con sus 8 órdenes y ~$1,170:

SELECT
  t.id,
  to_char(t.fecha_apertura AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') AS apertura_local,
  t.estado,
  COUNT(o.id) AS num_ordenes,
  COALESCE(SUM(o.total), 0) AS total
FROM turnos t
LEFT JOIN ordenes_servicio o ON o.turno_id = t.id
WHERE t.estado = 'abierto'
GROUP BY t.id, t.fecha_apertura, t.estado;

-- Después de esto: recarga el dashboard. Debes ver:
--   • Banner amarillo: "Turno pendiente desde [fecha de ayer]"
--   • Stats: $1,170 e ingresos correctos
--   • Botón "Realizar corte ahora" → ahí cuentas el efectivo físico real
-- ============================================================================
