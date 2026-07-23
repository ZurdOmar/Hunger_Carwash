-- ============================================================================
-- FIX: Fijar search_path en check_role()
-- ============================================================================
-- check_role() es SECURITY DEFINER pero no fijaba `search_path`, a diferencia
-- de las demás funciones RPC del proyecto (admin_update_user, get_todos_usuarios,
-- cerrar_turno_rpc), que sí lo hacen. Sin `SET search_path`, una función
-- SECURITY DEFINER puede resolver identificadores (como `perfiles`) contra un
-- schema distinto al esperado si el search_path de la sesión que la invoca fue
-- alterado. En Postgres 17 esto ya no es explotable por un usuario común
-- porque `CREATE` sobre el schema `public` no se otorga a PUBLIC por defecto,
-- pero se fija de todas formas para quedar consistente con el resto de las
-- funciones y como defensa en profundidad.
--
-- INSTRUCCIONES:
-- 1. Copia este script completo.
-- 2. Ve a Supabase → SQL Editor → New query.
-- 3. Pega y ejecuta.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.perfiles WHERE id = auth.uid()) = required_role;
END;
$$;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
-- WHERE proname = 'check_role';
-- -- Esperado: prosecdef = true, proconfig contiene 'search_path=public'
-- ============================================================================
