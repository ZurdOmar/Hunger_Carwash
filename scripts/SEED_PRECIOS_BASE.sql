-- ============================================================================
-- SEED: Tamaños de vehículo predeterminados en precios_base
-- ============================================================================
-- Ejecutar DESPUÉS de FIX_RLS_USE_CHECK_ROLE.sql para que las políticas
-- de INSERT ya estén corregidas con check_role().
--
-- Si precios_base ya tiene filas, este script las respeta (ON CONFLICT DO NOTHING).
-- Para actualizar precios de filas existentes, cambia DO NOTHING por DO UPDATE.
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase → SQL Editor → New query.
-- 2. Pega y ejecuta.
-- ============================================================================

INSERT INTO public.precios_base (tamano, label, precio, icon, is_hidden)
VALUES
  ('Moto',          'Motocicleta',     80,  '🏍️',  false),
  ('Carro Chico',   'Auto Chico',     120,  '🚗',  false),
  ('Carro Mediano', 'Auto Mediano',   150,  '🚙',  false),
  ('Carro Grande',  'Auto Grande',    180,  '🚐',  false),
  ('Camioneta',     'Camioneta / SUV', 200, '🚕',  false),
  ('Pickup',        'Pickup / Truck',  220, '🛻',  false)
ON CONFLICT DO NOTHING;

-- VERIFICACIÓN:
-- SELECT * FROM public.precios_base ORDER BY id;
