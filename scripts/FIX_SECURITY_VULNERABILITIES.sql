-- ============================================================================
-- SCRIPT DE SEGURIDAD (VERSIÓN CONSERVADORA PARA ENTREGA)
-- Objetivo: Corregir vulnerabilidad de vistas públicas sin afectar la app.
-- ============================================================================

BEGIN;

-- 1. Recrear vistas con 'security_invoker = true'
-- Esto hace que la vista respete el RLS de la tabla original.
-- Como el Admin tiene permiso en la tabla, el Admin Panel seguirá funcionando igual.

DROP VIEW IF EXISTS public.usuarios_activos;
CREATE VIEW public.usuarios_activos 
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.role,
  p.activo,
  p.created_at,
  COALESCE(u.email, 'sin-email') as email,
  u.last_sign_in_at,
  u.created_at as auth_created_at
FROM perfiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.activo = true
ORDER BY p.created_at DESC;

DROP VIEW IF EXISTS public.todos_usuarios;
CREATE VIEW public.todos_usuarios 
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.role,
  p.activo,
  p.created_at,
  COALESCE(u.email, 'sin-email') as email,
  u.last_sign_in_at,
  u.created_at as auth_created_at
FROM perfiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 2. Asegurar que RLS esté habilitado en perfiles
-- Esto es lo que Supabase reporta como el 'Critical Issue'.
ALTER TABLE IF EXISTS public.perfiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- VERIFICACIÓN RÁPIDA:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'perfiles';
