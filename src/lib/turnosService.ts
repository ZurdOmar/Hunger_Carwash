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
): Promise<void> {
  try {
    const diferencia = montoDeclarado - montoSistema

    await supabase
      .from('turnos')
      .update({
        monto_declarado: montoDeclarado,
        monto_sistema: montoSistema,
        diferencia: diferencia,
        fecha_cierre: new Date().toISOString(),
        estado: 'cerrado',
      })
      .eq('id', turnoId)
  } catch (error) {
    console.error('Error cerrando turno:', error)
  }
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

  csv += 'DESGLOSE POR METODO DE PAGO\n'
  csv += `Efectivo,"$${efectivoTotal.toLocaleString()}"\n`
  csv += `Tarjeta,"$${tarjetaTotal.toLocaleString()}"\n`
  csv += `Membresía,"$${membresiaTotl.toLocaleString()}"\n\n`

  csv += 'ORDENES DEL DIA\n'
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
