-- ============================================================================
-- FIX PARA VISTA DE USUARIOS (SEGURIDAD + ACCESO ADMIN)
-- ============================================================================
-- Este script crea una función SECURITY DEFINER para permitir que los
-- administradores consulten la lista completa de usuarios (incluyendo emails)
-- sin violar las restricciones de RLS de la tabla auth.users.
-- ============================================================================

BEGIN;

-- 1. Eliminar la vista que causa problemas de permisos
DROP VIEW IF EXISTS public.todos_usuarios;

-- 2. Crear función segura para obtener usuarios
CREATE OR REPLACE FUNCTION public.get_todos_usuarios()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  activo boolean,
  created_at timestamptz,
  email varchar,
  last_sign_in_at timestamptz,
  auth_created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
BEGIN
  -- Obtener rol del usuario que llama (explícitamente)
  v_caller_id := auth.uid();

  SELECT perfiles.role INTO v_caller_role
  FROM public.perfiles
  WHERE perfiles.id = v_caller_id;

  -- Verificar que sea ADMIN
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'No autorizado: Solo administradores pueden consultar esta lista.';
  END IF;

  -- Devolver datos de usuarios
  RETURN QUERY
  SELECT
    perfiles.id,
    perfiles.full_name,
    perfiles.role,
    perfiles.activo,
    perfiles.created_at,
    COALESCE(auth_users.email, 'sin-email')::varchar as email,
    auth_users.last_sign_in_at,
    auth_users.created_at as auth_created_at
  FROM public.perfiles
  LEFT JOIN auth.users auth_users ON perfiles.id = auth_users.id
  ORDER BY perfiles.created_at DESC;
END;
$$;

COMMIT;

-- INSTRUCCIONES:
-- 1. Copia este código.
-- 2. Ve a Supabase -> SQL Editor.
-- 3. Pega y ejecuta.
