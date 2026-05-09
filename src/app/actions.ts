'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateNumberRange, validateMoney, handleError } from '@/lib/errorHandler';

/**
 * Server Actions - Operaciones sensibles que requieren validación en servidor
 * Todos estos endpoints validan autenticación y autorización antes de ejecutar
 */

/**
 * Cambiar estado de orden (Kanban)
 * Solo admin y supervisor pueden cambiar estados
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: 'Recepción' | 'Lavado' | 'Secado' | 'Listo' | 'Entregado'
) {
  const supabase = await createServerSupabaseClient();

  // Validar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autenticado');
  }

  // Validar rol
  const { data: profile } = await supabase
    .from('perfiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    throw new Error('No autorizado para cambiar estados de órdenes');
  }

  // Validar orderId es UUID válido
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    throw new Error('ID de orden inválido');
  }

  // Ejecutar actualización
  const fechaCierre = newStatus === 'Entregado' ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('ordenes_servicio')
    .update({
      estado: newStatus,
      fecha_cierre: fechaCierre
    })
    .eq('id', orderId);

  if (error) {
    throw new Error('Error al actualizar orden');
  }

  return { success: true };
}

/**
 * Cerrar turno (Corte de Caja)
 * Solo supervisores y admin
 */
export async function cerrarTurnoAction(
  turnoId: string,
  montoDeclarado: number,
  montoSistema: number
) {
  const supabase = await createServerSupabaseClient();

  // Validar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autenticado');
  }

  // Validar rol
  const { data: profile } = await supabase
    .from('perfiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    throw new Error('No tienes permiso para cerrar turnos');
  }

  // Validar ID
  if (!turnoId || !/^[0-9a-f-]{36}$/i.test(turnoId)) {
    throw new Error('ID de turno inválido');
  }

  // Validar montos
  const declaredError = validateMoney(montoDeclarado, 'Monto declarado');
  if (declaredError) throw new Error(declaredError);

  const systemError = validateMoney(montoSistema, 'Monto del sistema');
  if (systemError) throw new Error(systemError);

  // Calcular diferencia
  const diferencia = montoDeclarado - montoSistema;

  // Cerrar turno
  const { data, error } = await supabase
    .from('turnos')
    .update({
      estado: 'cerrado',
      fecha_cierre: new Date().toISOString(),
      monto_declarado: montoDeclarado,
      diferencia: diferencia
    })
    .eq('id', turnoId)
    .select()
    .single();

  if (error) {
    throw new Error('Error al cerrar turno');
  }

  return { success: true, turno: data };
}

/**
 * Asignar lavador a orden
 * Solo supervisores y admin
 */
export async function assignWasherAction(
  orderId: string,
  washerId: string | null,
  bayNumber: number | null
) {
  const supabase = await createServerSupabaseClient();

  // Validar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autenticado');
  }

  // Validar rol
  const { data: profile } = await supabase
    .from('perfiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    throw new Error('No autorizado');
  }

  // Validar IDs
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    throw new Error('ID de orden inválido');
  }

  if (washerId && !/^[0-9a-f-]{36}$/i.test(washerId)) {
    throw new Error('ID de lavador inválido');
  }

  if (bayNumber !== null && (typeof bayNumber !== 'number' || bayNumber < 1 || bayNumber > 100)) {
    throw new Error('Número de cajón inválido');
  }

  // Ejecutar actualización
  const { error } = await supabase
    .from('ordenes_servicio')
    .update({
      lavador_id: washerId || null,
      cajon_id: bayNumber || null
    })
    .eq('id', orderId);

  if (error) {
    throw new Error('Error al asignar lavador');
  }

  return { success: true };
}

/**
 * Cambiar precio de tamaño de vehículo
 * Solo admin
 */
export async function updateVehicleSizePriceAction(
  tamano: string,
  newPrice: number
) {
  const supabase = await createServerSupabaseClient();

  // Validar autenticación
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autenticado');
  }

  // Validar rol - SOLO ADMIN
  const { data: profile } = await supabase
    .from('perfiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Solo administradores pueden cambiar precios');
  }

  // Validar tamaño
  if (!tamano || tamano.length > 50) {
    throw new Error('Tamaño inválido');
  }

  // Validar precio
  const priceError = validateNumberRange(newPrice, 1, 50000, 'Precio');
  if (priceError) throw new Error(priceError);

  // Ejecutar actualización
  const { error } = await supabase
    .from('precios_base')
    .update({ precio: newPrice })
    .eq('tamano', tamano);

  if (error) {
    throw new Error('Error al actualizar precio');
  }

  return { success: true };
}

/**
 * Wrapper interno: invoca la RPC SECURITY DEFINER `admin_update_user`.
 * La función SQL bypasea RLS y valida internamente que el caller sea admin.
 * Devolver el row actualizado permite que el cliente confirme la escritura.
 *
 * NULL en cualquier parámetro = "no cambiar ese campo".
 */
async function callAdminUpdateUser(args: {
  userId: string;
  fullName?: string;
  role?: 'admin' | 'supervisor' | 'cajero';
  activo?: boolean;
}) {
  if (!args.userId || !/^[0-9a-f-]{36}$/i.test(args.userId)) {
    throw new Error('ID de usuario inválido');
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('admin_update_user', {
    p_user_id: args.userId,
    p_full_name: args.fullName ?? null,
    p_role: args.role ?? null,
    p_activo: args.activo ?? null,
  });

  if (error) {
    // Las excepciones SQL llegan aquí con `message` ya legible (en español).
    throw new Error(error.message || 'Error al actualizar usuario');
  }

  // La RPC devuelve un JSON con la fila modificada; si no, algo silencioso falló.
  if (!data) {
    throw new Error('La actualización no afectó ningún registro');
  }

  return data as {
    id: string;
    full_name: string | null;
    role: 'admin' | 'supervisor' | 'cajero';
    activo: boolean;
  };
}

/**
 * Cambiar rol de usuario
 * Solo admin puede cambiar roles (validado en SQL)
 */
export async function changeUserRoleAction(
  userId: string,
  newRole: 'admin' | 'supervisor' | 'cajero'
) {
  if (!['admin', 'supervisor', 'cajero'].includes(newRole)) {
    throw new Error('Rol inválido');
  }
  const updated = await callAdminUpdateUser({ userId, role: newRole });
  return { success: true, user: updated };
}

/**
 * Activar/Desactivar usuario
 * Solo admin puede desactivar usuarios (validado en SQL)
 */
export async function toggleUserActiveAction(
  userId: string,
  activo: boolean
) {
  const updated = await callAdminUpdateUser({ userId, activo });
  return { success: true, user: updated };
}

/**
 * Cambiar nombre completo de un usuario
 * Solo admin puede modificarlo desde el panel (validado en SQL)
 */
export async function updateUserFullNameAction(
  userId: string,
  fullName: string
) {
  if (typeof fullName !== 'string') {
    throw new Error('Nombre inválido');
  }
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    throw new Error('El nombre no puede estar vacío');
  }
  if (trimmed.length > 100) {
    throw new Error('El nombre es demasiado largo (máx 100 caracteres)');
  }
  const updated = await callAdminUpdateUser({ userId, fullName: trimmed });
  return { success: true, user: updated };
}
