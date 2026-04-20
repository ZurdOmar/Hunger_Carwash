-- ============================================================================
-- SETUP: Tabla de Perfiles + Trigger Automático
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Crear tabla perfiles si no existe
CREATE TABLE IF NOT EXISTS perfiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  role text NOT NULL CHECK (role IN ('admin', 'supervisor', 'cajero')) DEFAULT 'cajero',
  created_at timestamptz DEFAULT now()
);

-- 2. Crear función que genera perfiles automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.perfiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cajero')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Crear trigger en auth.users para ejecutar la función
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Crear perfiles para usuarios que YA existen en auth.users pero NO en perfiles
INSERT INTO perfiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
  COALESCE(u.raw_user_meta_data->>'role', 'cajero') as role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM perfiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 5. Habilitar RLS en perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 6. Crear política para que usuarios vean su propio perfil + admin ve todo
DROP POLICY IF EXISTS "perfil_propio_lectura" ON perfiles;
CREATE POLICY "perfil_propio_lectura" ON perfiles
  FOR SELECT USING (
    auth.uid() = id OR
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_edita_perfil" ON perfiles;
CREATE POLICY "admin_edita_perfil" ON perfiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "admin_crea_perfil" ON perfiles;
CREATE POLICY "admin_crea_perfil" ON perfiles
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esto para verificar:
-- SELECT COUNT(*) as total_perfiles FROM perfiles;
-- SELECT COUNT(*) as total_usuarios FROM auth.users;
-- Deberían ser iguales (o similar).
