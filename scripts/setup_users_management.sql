-- ============================================================================
-- SETUP: Gestión de Usuarios - Campo Activo + Límite de Cajeros
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar campo 'activo' a tabla perfiles (si no existe)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;

-- 2. Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_role_activo ON perfiles(role, activo);

-- 3. Crear función que valida máximo 2 cajeros activos
CREATE OR REPLACE FUNCTION validate_cajeros_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cajeros_count INT;
BEGIN
  -- Si está intentando insertar o actualizar a rol 'cajero' y activo = true
  IF (NEW.role = 'cajero' AND NEW.activo = true) THEN
    -- Contar cajeros activos (excluyendo el actual si es update)
    SELECT COUNT(*) INTO cajeros_count
    FROM perfiles
    WHERE role = 'cajero' AND activo = true AND id != NEW.id;

    -- Si ya hay 2, rechazar
    IF cajeros_count >= 2 THEN
      RAISE EXCEPTION 'Solo se permiten máximo 2 cajeros activos. Desactiva uno antes de agregar otro.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Crear trigger para validar límite de cajeros
DROP TRIGGER IF EXISTS trigger_validate_cajeros_limit ON perfiles;
CREATE TRIGGER trigger_validate_cajeros_limit
  BEFORE INSERT OR UPDATE ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_cajeros_limit();

-- 5. Actualizar RLS para que usuarios inactivos no puedan acceder
-- (El middleware también lo validará)
-- Los usuarios inactivos ya no pueden hacer SELECT en sus propios datos
-- porque activo = false impedirá que vean sus datos
DROP POLICY IF EXISTS "perfil_propio_lectura" ON perfiles;
CREATE POLICY "perfil_propio_lectura" ON perfiles
  FOR SELECT USING (
    (auth.uid() = id AND activo = true) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- 6. Crear vista para admins (solo usuarios activos con detalles)
CREATE OR REPLACE VIEW usuarios_activos AS
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

-- 7. Crear vista de todos los usuarios (incluyendo inactivos) - solo para admins
CREATE OR REPLACE VIEW todos_usuarios AS
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

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esto para verificar:
-- SELECT * FROM perfiles;
-- SELECT COUNT(*) as cajeros_activos FROM perfiles WHERE role = 'cajero' AND activo = true;
