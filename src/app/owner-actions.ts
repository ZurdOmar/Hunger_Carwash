'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// ============================================================================
// Server Actions del panel OWNER (super-admin invisible).
// Todas verifican que el caller sea owner (assertOwner) antes de actuar.
// - Crear/eliminar usuarios usa el cliente ADMIN (service_role).
// - Snapshot/restore/vigencia usan RPCs SECURITY DEFINER llamadas con la sesión
//   del owner, para que is_owner() dentro de la función también valide.
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f-]{36}$/i

/** Verifica que quien invoca sea el owner (vía RPC is_owner). Devuelve su user id. */
async function assertOwner(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const rpc = supabase.rpc as unknown as (
    n: string
  ) => Promise<{ data: boolean | null; error: unknown | null }>
  const { data: owner, error } = await rpc('is_owner')
  if (error || owner !== true) throw new Error('No autorizado')
  return session.user.id
}

/** Llama una RPC no tipada con la sesión del owner (SECURITY DEFINER valida is_owner). */
async function ownerRpc(name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const rpc = supabase.rpc as unknown as (
    n: string
  ) => Promise<{ data: unknown; error: { message?: string } | null }>
  const { error } = await rpc(name)
  if (error) throw new Error(error.message || `Error en ${name}`)
}

function parseVigencia(vigenciaISO: string | null): string | null {
  if (!vigenciaISO) return null
  const d = new Date(vigenciaISO)
  if (isNaN(d.getTime())) throw new Error('Fecha de vigencia inválida')
  return d.toISOString()
}

/**
 * Crear demo: alta de un usuario admin con email + contraseña + vigencia.
 */
export async function createDemoUserAction(
  email: string,
  password: string,
  vigenciaISO: string | null,
  fullName?: string
) {
  const ownerId = await assertOwner()

  const cleanEmail = (email || '').toLowerCase().trim()
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    throw new Error('Correo inválido')
  }
  if (!password || password.length < 8 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 8 y 128 caracteres')
  }
  const vigencia = parseVigencia(vigenciaISO)

  const admin = createAdminClient()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { password_set: true, full_name: fullName?.trim() || null },
  })
  if (createErr || !created?.user) {
    throw new Error(createErr?.message || 'No se pudo crear el usuario')
  }

  const newId = created.user.id

  // El trigger handle_new_user ya creó el perfil (rol cajero); lo elevamos a
  // admin y le fijamos la vigencia y quién lo creó. upsert por si hubiera carrera.
  const { error: upErr } = await admin
    .from('perfiles')
    .upsert(
      {
        id: newId,
        full_name: fullName?.trim() || cleanEmail,
        role: 'admin',
        activo: true,
        es_owner: false,
        vigencia_hasta: vigencia,
        creado_por: ownerId,
      } as never,
      { onConflict: 'id' }
    )
  if (upErr) throw new Error(upErr.message || 'No se pudo configurar el perfil demo')

  return { success: true, userId: newId, email: cleanEmail }
}

/** Cambiar/quitar la vigencia de un usuario demo. */
export async function setVigenciaAction(userId: string, vigenciaISO: string | null) {
  await assertOwner()
  if (!UUID_RE.test(userId)) throw new Error('ID de usuario inválido')
  const vigencia = parseVigencia(vigenciaISO)

  const admin = createAdminClient()
  const { error } = await admin
    .from('perfiles')
    .update({ vigencia_hasta: vigencia } as never)
    .eq('id', userId)
  if (error) throw new Error(error.message || 'No se pudo actualizar la vigencia')
  return { success: true }
}

/** Eliminar un usuario demo (cascada borra su perfil). No permite borrar owners. */
export async function deleteDemoUserAction(userId: string) {
  await assertOwner()
  if (!UUID_RE.test(userId)) throw new Error('ID de usuario inválido')

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('perfiles')
    .select('es_owner')
    .eq('id', userId)
    .single()
  if ((target as { es_owner?: boolean } | null)?.es_owner === true) {
    throw new Error('No puedes eliminar a un owner')
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message || 'No se pudo eliminar el usuario')
  return { success: true }
}

/** Lista de usuarios demo (no-owner) con email y vigencia. */
export async function listDemoUsersAction() {
  await assertOwner()
  const admin = createAdminClient()

  const { data: profiles, error } = await admin
    .from('perfiles')
    .select('id, full_name, role, es_owner, vigencia_hasta, creado_por')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message || 'No se pudo listar usuarios')

  const { data: usersList } = await admin.auth.admin.listUsers()
  const emailById = new Map<string, string>()
  for (const u of usersList?.users ?? []) emailById.set(u.id, u.email ?? '')

  type Row = {
    id: string
    full_name: string | null
    role: string
    es_owner: boolean | null
    vigencia_hasta: string | null
  }
  const rows = (profiles as Row[] | null) ?? []
  return rows
    .filter((p) => p.es_owner !== true)
    .map((p) => ({
      id: p.id,
      email: emailById.get(p.id) ?? '',
      full_name: p.full_name,
      role: p.role,
      vigencia_hasta: p.vigencia_hasta,
    }))
}

/** Generar respaldo (snapshot de datos a demo_bak). */
export async function snapshotDemoAction() {
  await assertOwner()
  await ownerRpc('demo_snapshot')
  return { success: true }
}

/** Restaurar respaldo (datos desde demo_bak). No toca perfiles ni usuarios. */
export async function restoreDemoAction() {
  await assertOwner()
  await ownerRpc('demo_restore')
  return { success: true }
}
