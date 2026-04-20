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
 * Cambiar rol de usuario
 * Solo admin puede cambiar roles
 */
export async function changeUserRoleAction(
  userId: string,
  newRole: 'admin' | 'supervisor' | 'cajero'
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
    throw new Error('Solo administradores pueden cambiar roles');
  }

  // Validar userId es UUID válido
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error('ID de usuario inválido');
  }

  // Validar nuevo rol
  if (!['admin', 'supervisor', 'cajero'].includes(newRole)) {
    throw new Error('Rol inválido');
  }

  // Validar que no intente cambiar su propio rol
  if (userId === session.user.id) {
    throw new Error('No puedes cambiar tu propio rol');
  }

  // Ejecutar actualización
  const { error } = await supabase
    .from('perfiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    throw new Error('Error al cambiar rol de usuario');
  }

  return { success: true };
}

/**
 * Activar/Desactivar usuario
 * Solo admin puede desactivar usuarios
 */
export async function toggleUserActiveAction(
  userId: string,
  activo: boolean
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
    throw new Error('Solo administradores pueden desactivar usuarios');
  }

  // Validar userId es UUID válido
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error('ID de usuario inválido');
  }

  // Validar que no intente desactivarse a sí mismo
  if (userId === session.user.id && !activo) {
    throw new Error('No puedes desactivar tu propia cuenta');
  }

  // Ejecutar actualización
  const { error } = await supabase
    .from('perfiles')
    .update({ activo })
    .eq('id', userId);

  if (error) {
    throw new Error('Error al actualizar estado del usuario');
  }

  return { success: true };
}
}
