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
BEGIN
  -- Verificar si el usuario que llama es ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'No autorizado: Solo administradores pueden consultar esta lista.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.role,
    p.activo,
    p.created_at,
    COALESCE(u.email, 'sin-email')::varchar as email,
    u.last_sign_in_at,
    u.created_at as auth_created_at
  FROM public.perfiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

COMMIT;

-- INSTRUCCIONES:
-- 1. Copia este código.
-- 2. Ve a Supabase -> SQL Editor.
-- 3. Pega y ejecuta.
