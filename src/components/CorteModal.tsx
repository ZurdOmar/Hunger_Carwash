'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heading } from './ui/Heading'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'
import { DollarSign, FileText, Download, AlertCircle, Loader } from 'lucide-react'
import type { Order } from '@/lib/types'
import { generarCSVCorte, descargarCSV, cerrarTurno } from '@/lib/turnosService'
import { toast } from 'sonner'

interface CorteModalProps {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
  turnoId?: string
}

export function CorteModal({ isOpen, onClose, orders, turnoId }: CorteModalProps) {
  const [montoDeclarado, setMontoDeclarado] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calcular totales
  const efectivoTotal = orders
    .filter((o) => o.paymentMethod === 'Efectivo')
    .reduce((sum, o) => sum + o.total, 0)

  const tarjetaTotal = orders
    .filter((o) => o.paymentMethod === 'Tarjeta')
    .reduce((sum, o) => sum + o.total, 0)

  const membresiaTotl = orders
    .filter((o) => o.paymentMethod === 'Membresía')
    .reduce((sum, o) => sum + o.total, 0)

  const totalSistema = efectivoTotal
  const diferencia = montoDeclarado ? parseInt(montoDeclarado) - totalSistema : 0

  const handleDescargarCSV = () => {
    const turno = {
      id: turnoId || 'sin-id',
      sucursal_id: '',
      usuario_id: null,
      monto_inicial: 0,
      monto_sistema: totalSistema,
      monto_declarado: montoDeclarado ? parseInt(montoDeclarado) : 0,
      diferencia: diferencia,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      estado: 'abierto',
    }

    const csv = generarCSVCorte(orders, turno)
    const fecha = new Date().toISOString().split('T')[0]
    descargarCSV(csv, `corte-caja-${fecha}.csv`)
  }

  const handleFinalizarTurno = async () => {
    if (!montoDeclarado || !turnoId) {
      setError('Ingresa el monto declarado')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await cerrarTurno(turnoId, parseInt(montoDeclarado), totalSistema)
      toast.success('Corte realizado y enviado exitosamente')
      onClose()
    } catch (err) {
      setError('Error al finalizar el turno')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
          >
            <Card className="glass border border-white/10 shadow-2xl">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Corte de Caja</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date().toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Abierto</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Desglose de pagos */}
                <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Desglose
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Efectivo</span>
                      <span className="font-bold text-green-400">
                        ${efectivoTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tarjeta</span>
                      <span className="font-bold text-blue-400">
                        ${tarjetaTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Membresía</span>
                      <span className="font-bold text-primary">
                        ${membresiaTotl.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold">Total Sistema (Efectivo)</span>
                      <span className="font-bold text-lg">${totalSistema.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Input de monto declarado */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Monto Declarado en Caja
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={montoDeclarado}
                    onChange={(e) => setMontoDeclarado(e.target.value)}
                    className="text-lg font-bold h-12"
                    disabled={isProcessing}
                  />
                </div>

                {/* Diferencia */}
                {montoDeclarado && (
                  <div
                    className={`p-4 rounded-lg border ${
                      diferencia === 0
                        ? 'bg-green-500/10 border-green-500/20'
                        : diferencia > 0
                          ? 'bg-yellow-500/10 border-yellow-500/20'
                          : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                    <p
                      className={`text-2xl font-bold ${
                        diferencia === 0
                          ? 'text-green-400'
                          : diferencia > 0
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {diferencia > 0 ? '+' : ''}${diferencia.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleDescargarCSV}
                    disabled={isProcessing}
                  >
                    <Download className="w-4 h-4" />
                    Descargar CSV
                  </Button>

                  <Button
                    className="gap-2"
                    onClick={handleFinalizarTurno}
                    disabled={isProcessing || !montoDeclarado}
                  >
                    {isProcessing ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Finalizar
                  </Button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 mt-2"
                >
                  Cancelar
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
