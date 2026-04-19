-- ============================================================
-- Migración: convertir tamano_vehiculo de ENUM a TEXT
-- Motivo: permitir que el cliente agregue/edite tipos de vehículo
--         (MOTO, Camión, etc.) sin tocar la BD.
-- Fecha: 2026-04-19
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase (como usuario postgres).
-- Todo el bloque corre en una transacción: si algo falla, rollback.

BEGIN;

-- 1. Convertir columnas ENUM → TEXT
ALTER TABLE public.vehiculos
    ALTER COLUMN tamano TYPE text USING tamano::text;

ALTER TABLE public.precios_base
    ALTER COLUMN tamano TYPE text USING tamano::text;

-- 2. Eliminar el tipo ENUM (ya no referenciado)
DROP TYPE IF EXISTS public.tamano_vehiculo;

-- 3. Enriquecer precios_base como fuente única de tipos de vehículo
--    (antes label/icon/is_hidden vivían en localStorage del navegador).
ALTER TABLE public.precios_base
    ADD COLUMN IF NOT EXISTS label   text,
    ADD COLUMN IF NOT EXISTS icon    text    DEFAULT '🚗',
    ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- 4. Rellenar labels existentes con valores legibles
UPDATE public.precios_base SET label = 'Chico'       WHERE tamano = 'Carro Chico'       AND label IS NULL;
UPDATE public.precios_base SET label = 'Mediano'     WHERE tamano = 'Carro Mediano'     AND label IS NULL;
UPDATE public.precios_base SET label = 'Camioneta M' WHERE tamano = 'Camioneta Mediana' AND label IS NULL;
UPDATE public.precios_base SET label = 'Camioneta G' WHERE tamano = 'Camioneta Grande'  AND label IS NULL;
UPDATE public.precios_base SET label = 'Van / XL'    WHERE tamano = 'Van'               AND label IS NULL;
UPDATE public.precios_base SET label = tamano        WHERE label IS NULL;

UPDATE public.precios_base SET icon = '🚗' WHERE tamano = 'Carro Chico';
UPDATE public.precios_base SET icon = '🚘' WHERE tamano = 'Carro Mediano';
UPDATE public.precios_base SET icon = '🚙' WHERE tamano = 'Camioneta Mediana';
UPDATE public.precios_base SET icon = '🚐' WHERE tamano = 'Camioneta Grande';
UPDATE public.precios_base SET icon = '🚌' WHERE tamano = 'Van';

-- 5. Restricciones de integridad
ALTER TABLE public.precios_base ALTER COLUMN label SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'precios_base_tamano_unique'
    ) THEN
        ALTER TABLE public.precios_base
            ADD CONSTRAINT precios_base_tamano_unique UNIQUE (tamano);
    END IF;
END $$;

COMMIT;

-- ============================================================
-- Verificación post-migración
-- ============================================================
SELECT tamano, label, icon, precio, is_hidden
FROM public.precios_base
ORDER BY id;
