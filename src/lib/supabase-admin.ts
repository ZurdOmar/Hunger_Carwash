import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Cliente ADMIN con service_role. SOLO servidor. La service_role key bypasea RLS
// por completo, así que este cliente SOLO se usa dentro de server actions que ya
// verificaron que el caller es el owner (ver app/owner-actions.ts → assertOwner).
// La key vive en SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_), por lo que
// Next nunca la incluye en el bundle del navegador; el guard de abajo es un
// cinturón extra por si alguien importara esto desde código de cliente.
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() no puede usarse en el navegador')
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor'
    )
  }
  // Cliente sin el genérico Database a propósito: opera sobre columnas nuevas
  // (es_owner, vigencia_hasta, creado_por) que no están en los tipos generados.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
