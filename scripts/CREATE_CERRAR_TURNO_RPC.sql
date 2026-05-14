-- ============================================================================
-- RPC: cerrar_turno_rpc
-- ============================================================================
-- Cierra un turno de forma atómica dentro de la BD, evitando la dependencia
-- del cliente JS para actualizar ordenes_servicio a través de RLS.
-- Al ser SECURITY DEFINER corre como postgres (superusuario), por lo que
-- el UPDATE a ordenes_servicio siempre se ejecuta sin importar el rol del
-- usuario que llama desde el browser.
--
-- INSTRUCCIONES:
-- 1. Copia este script completo.
-- 2. Ve a Supabase → SQL Editor → New query.
-- 3. Pega y ejecuta.
-- ============================================================================

-- Columna que registra quién ejecutó el corte (distinto del usuario_id que
-- abrió el turno). Sin esto, "Cajero" en Reportes mostraba a quien abrió
-- el turno, no a quien lo cerró.
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS cerrado_por uuid REFERENCES auth.users(id);

-- Eliminar firma anterior para evitar conflicto de overload al cambiar params.
DROP FUNCTION IF EXISTS public.cerrar_turno_rpc(uuid, numeric, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.cerrar_turno_rpc(
  p_turno_id       uuid,
  p_monto_declarado numeric,
  p_monto_sistema   numeric,
  p_ajuste_monto    numeric DEFAULT 0,
  p_ajuste_nota     text    DEFAULT NULL,
  p_cerrado_por     uuid    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diferencia  numeric;
  v_fecha_cierre timestamptz;
  v_turno       json;
BEGIN
  -- Verificar que el turno existe y está abierto
  IF NOT EXISTS (
    SELECT 1 FROM public.turnos
    WHERE id = p_turno_id AND estado = 'abierto'
  ) THEN
    RAISE EXCEPTION 'El turno % no existe o ya está cerrado', p_turno_id;
  END IF;

  v_diferencia   := p_monto_declarado - p_monto_sistema - p_ajuste_monto;
  v_fecha_cierre := now();

  -- 1. Marcar todas las órdenes del turno como 'Entregado'
  UPDATE public.ordenes_servicio
  SET
    estado      = 'Entregado',
    fecha_cierre = v_fecha_cierre
  WHERE
    turno_id = p_turno_id
    AND estado <> 'Entregado';

  -- 2. Cerrar el turno
  UPDATE public.turnos
  SET
    estado           = 'cerrado',
    monto_declarado  = p_monto_declarado,
    monto_sistema    = p_monto_sistema,
    diferencia       = v_diferencia,
    ajuste_monto     = p_ajuste_monto,
    ajuste_nota      = p_ajuste_nota,
    fecha_cierre     = v_fecha_cierre,
    cerrado_por      = p_cerrado_por
  WHERE id = p_turno_id;

  -- 3. Devolver el turno actualizado como JSON
  SELECT row_to_json(t) INTO v_turno
  FROM (
    SELECT * FROM public.turnos WHERE id = p_turno_id
  ) t;

  RETURN v_turno;
END;
$$;

-- Permitir que usuarios autenticados llamen a esta función
GRANT EXECUTE ON FUNCTION public.cerrar_turno_rpc(uuid, numeric, numeric, numeric, text, uuid)
  TO authenticated;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_name = 'cerrar_turno_rpc';
-- ============================================================================
