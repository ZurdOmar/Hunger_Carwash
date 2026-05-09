-- ============================================================================
-- FIX ADMIN USER OPERATIONS — RPC SECURITY DEFINER
-- ============================================================================
-- Problema: la política RLS de SELECT sobre `perfiles` (auth.uid() = id) hace
-- invisibles las filas de OTROS usuarios para el admin. Postgres exige que
-- una fila sea visible para poder hacer UPDATE sobre ella, así que los
-- UPDATE directos del admin sobre filas ajenas afectan 0 filas y devuelven
-- éxito sin error. Resultado: cambios de rol/activo "se pierden".
--
-- Solución: una sola RPC SECURITY DEFINER que centraliza TODAS las
-- modificaciones administrativas sobre `perfiles`. Como es SECURITY DEFINER,
-- corre con los permisos del owner y bypasea RLS. Validamos manualmente que
-- el caller sea admin antes de cualquier escritura.
--
-- INSTRUCCIONES:
-- 1. Copia este script completo.
-- 2. Ve a Supabase → SQL Editor → New query.
-- 3. Pega y ejecuta.
-- 4. (Opcional) Verifica con la consulta del final.
-- ============================================================================

BEGIN;

-- Limpieza de versiones previas (idempotente)
DROP FUNCTION IF EXISTS public.admin_update_user(uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_activo boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_clean_name text;
  v_updated record;
BEGIN
  -- 1) Auth: debe haber sesión
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- 2) Authz: caller debe ser admin
  SELECT role INTO v_caller_role
  FROM public.perfiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar usuarios';
  END IF;

  -- 3) Validación de inputs (NULL = "no cambiar este campo")
  IF p_role IS NOT NULL AND p_role NOT IN ('admin', 'supervisor', 'cajero') THEN
    RAISE EXCEPTION 'Rol inválido: %', p_role;
  END IF;

  IF p_full_name IS NOT NULL THEN
    v_clean_name := btrim(p_full_name);
    IF length(v_clean_name) = 0 THEN
      RAISE EXCEPTION 'El nombre no puede estar vacío';
    END IF;
    IF length(v_clean_name) > 100 THEN
      RAISE EXCEPTION 'El nombre es demasiado largo (máx 100 caracteres)';
    END IF;
  END IF;

  -- 4) Auto-protección: el admin no puede degradarse ni desactivarse a sí mismo
  IF p_user_id = auth.uid() THEN
    IF p_role IS NOT NULL AND p_role <> 'admin' THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;
    IF p_activo IS NOT NULL AND p_activo = false THEN
      RAISE EXCEPTION 'No puedes desactivar tu propia cuenta';
    END IF;
  END IF;

  -- 5) UPDATE: COALESCE preserva el valor actual cuando el parámetro es NULL
  UPDATE public.perfiles SET
    full_name = COALESCE(v_clean_name, full_name),
    role      = COALESCE(p_role, role),
    activo    = COALESCE(p_activo, activo)
  WHERE id = p_user_id
  RETURNING id, full_name, role, activo INTO v_updated;

  -- 6) Si no se afectó ninguna fila, el usuario no existe
  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- 7) Devolver la fila actualizada para que el cliente reemplace su estado
  RETURN json_build_object(
    'id',        v_updated.id,
    'full_name', v_updated.full_name,
    'role',      v_updated.role,
    'activo',    v_updated.activo
  );
END;
$$;

-- Permisos: solo usuarios autenticados pueden invocar; la propia función
-- valida internamente que sean admin.
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, boolean) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (opcional, ejecutar por separado)
-- ============================================================================
-- 1. Confirmar que la función existe y está marcada SECURITY DEFINER:
--
--    SELECT proname, prosecdef
--    FROM pg_proc
--    WHERE proname = 'admin_update_user';
--    -- Esperado: prosecdef = true
--
-- 2. Probar como admin (sustituye el UUID por el id de un cajero real):
--
--    SELECT public.admin_update_user(
--      p_user_id   := 'UUID-DE-UN-CAJERO',
--      p_role      := 'admin'
--    );
--    -- Esperado: JSON con role='admin'
--
--    Y luego revertir:
--    SELECT public.admin_update_user(
--      p_user_id   := 'UUID-DE-UN-CAJERO',
--      p_role      := 'cajero'
--    );
-- ============================================================================
