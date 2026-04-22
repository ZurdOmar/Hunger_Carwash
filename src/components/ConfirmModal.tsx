'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-sm"
          >
            <Card className="glass border border-white/10 shadow-2xl overflow-hidden relative">
              {isDestructive && (
                <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
              )}
              <CardHeader className="pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDestructive ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-black italic tracking-tighter uppercase">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {message}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="font-black tracking-widest uppercase text-xs h-12"
                    onClick={onCancel}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    className={`font-black tracking-widest uppercase text-xs h-12 ${isDestructive ? 'bg-destructive hover:bg-destructive/90 text-white shadow-destructive/20' : 'shadow-primary/20'} shadow-xl`}
                    onClick={onConfirm}
                  >
                    {confirmText}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
