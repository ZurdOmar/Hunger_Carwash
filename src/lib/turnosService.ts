import { supabase } from './supabase'
import type { Order } from './types'

export interface Turno {
  id: string
  sucursal_id: string
  usuario_id: string | null
  monto_inicial: number
  monto_sistema: number | null
  monto_declarado: number | null
  diferencia: number | null
  fecha_apertura: string | null
  fecha_cierre: string | null
  estado: string | null
}

export async function abrirTurno(
  sucursalId: string,
  usuarioId: string,
  montoInicial: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .insert({
        sucursal_id: sucursalId,
        usuario_id: usuarioId,
        monto_inicial: montoInicial,
        fecha_apertura: new Date().toISOString(),
        estado: 'abierto',
      })
      .select()
      .single()

    if (error) throw error
    return data?.id || null
  } catch (error) {
    console.error('Error abriendo turno:', error)
    return null
  }
}

export async function cerrarTurno(
  turnoId: string,
  montoDeclarado: number,
  montoSistema: number
): Promise<Turno> {
  const diferencia = montoDeclarado - montoSistema
  const fechaCierre = new Date().toISOString()

  // Antes de cerrar el turno, marca como 'Entregado' todas las órdenes
  // del turno que sigan en proceso. Los autos ya salieron físicamente del
  // carwash; el Kanban no debe seguir mostrándolos al día siguiente.
  const { error: ordersError } = await supabase
    .from('ordenes_servicio')
    .update({ estado: 'Entregado', fecha_cierre: fechaCierre })
    .eq('turno_id', turnoId)
    .neq('estado', 'Entregado')
  if (ordersError) throw ordersError

  const { data, error } = await supabase
    .from('turnos')
    .update({
      monto_declarado: montoDeclarado,
      monto_sistema: montoSistema,
      diferencia: diferencia,
      fecha_cierre: fechaCierre,
      estado: 'cerrado',
    })
    .eq('id', turnoId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error(`No se encontró el turno ${turnoId} para cerrar`)
  return data as Turno
}

export async function getTurnoActivo(sucursalId: string): Promise<Turno | null> {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('sucursal_id', sucursalId)
      .eq('estado', 'abierto')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data as Turno
  } catch (error) {
    console.error('Error obteniendo turno activo:', error)
    return null
  }
}

// Días en calendario transcurridos desde la apertura del turno hasta hoy.
// Se compara fecha local (no horas) para que la transición a "día siguiente" sea
// a las 00:00 del calendario y no exactamente 24h después.
//   - 0 = mismo día (turno normal)
//   - 1 = día siguiente (banner amarillo: corte pendiente)
//   - 2 = dos días después (banner naranja: urgente)
//   - 3+ = tres o más días (banner rojo: muy urgente)
export function getDiasDesdeApertura(turno: Turno | null): number {
  if (!turno?.fecha_apertura) return 0
  const apertura = new Date(turno.fecha_apertura)
  const hoy = new Date()
  const aperturaDia = new Date(apertura.getFullYear(), apertura.getMonth(), apertura.getDate())
  const hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const ms = hoyDia.getTime() - aperturaDia.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

// Carga TODAS las órdenes asociadas a un turno, sin filtrar por estado.
// ConfigContext.orders excluye 'Entregado' (Kanban operativo), por lo que el
// corte de caja debe consultar Supabase directamente o quedaría en 0.
export async function getOrdenesByTurno(turnoId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('ordenes_servicio')
    .select('*, vehiculos(*)')
    .eq('turno_id', turnoId)

  if (error) {
    console.error('Error obteniendo órdenes del turno:', error)
    return []
  }

  return (data || []).map((o: any) => ({
    id: o.id,
    folio: `${o.folio}`,
    vehicle: {
      placa: o.vehiculos?.placa || '',
      brand: o.vehiculos?.marca || '',
      model: o.vehiculos?.modelo || '',
      size: (o.vehiculos?.tamano || 'Carro Chico') as any,
    },
    services: o.servicios || [],
    isPremium: o.es_premium || false,
    basePrice: o.total || 0,
    premiumPrice: o.premium_extra_cost || 0,
    total: o.total || 0,
    status: o.estado,
    washerId: o.lavador_id || undefined,
    bayNumber: o.cajon_id || undefined,
    createdAt: o.created_at || new Date().toISOString(),
    paymentMethod: o.metodo_pago || undefined,
    turnoId: o.turno_id || undefined,
  }))
}

export async function getHistorialCortes(sucursalId: string): Promise<Turno[]> {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('sucursal_id', sucursalId)
      .order('fecha_apertura', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data as Turno[]) || []
  } catch (error) {
    console.error('Error obteniendo historial de cortes:', error)
    return []
  }
}

export function generarCSVCorte(orders: Order[], turno: Turno): string {
  const BOM = '\uFEFF'

  const efectivoTotal = orders
    .filter((o) => o.paymentMethod === 'Efectivo')
    .reduce((sum, o) => sum + o.total, 0)

  const tarjetaTotal = orders
    .filter((o) => o.paymentMethod === 'Tarjeta')
    .reduce((sum, o) => sum + o.total, 0)

  const membresiaTotl = orders
    .filter((o) => o.paymentMethod === 'Membresía')
    .reduce((sum, o) => sum + o.total, 0)

  const fecha = new Date(turno.fecha_apertura || '').toLocaleString('es-MX')
  const fechaCierre = turno.fecha_cierre
    ? new Date(turno.fecha_cierre).toLocaleString('es-MX')
    : 'No cerrado'

  let csv = BOM + 'CORTE DE CAJA\n'
  csv += `Fecha Apertura,${fecha}\n`
  csv += `Fecha Cierre,${fechaCierre}\n`
  csv += `Monto Inicial,${turno.monto_inicial}\n`
  csv += `Monto Sistema,${turno.monto_sistema || 0}\n`
  csv += `Monto Declarado,${turno.monto_declarado || 0}\n`
  csv += `Diferencia,${turno.diferencia || 0}\n\n`

  csv += 'DESGLOSE POR MÉTODO DE PAGO\n'
  csv += `Efectivo,"$${efectivoTotal.toLocaleString()}"\n`
  csv += `Tarjeta,"$${tarjetaTotal.toLocaleString()}"\n`
  csv += `Membresía,"$${membresiaTotl.toLocaleString()}"\n\n`

  csv += 'ÓRDENES DEL DÍA\n'
  csv += 'Folio,Placa,Tamaño,Premium,Total,Método,Estado\n'

  orders.forEach((o) => {
    csv += `${o.folio},"${o.vehicle.placa}","${o.vehicle.size}","${o.isPremium ? 'Sí' : 'No'}","$${o.total.toLocaleString()}","${o.paymentMethod || 'N/A'}","${o.status}"\n`
  })

  return csv
}

export function descargarCSV(contenido: string, nombreArchivo: string): void {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
