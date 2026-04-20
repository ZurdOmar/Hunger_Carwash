'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { AlertCircle, Check, Loader } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
          setSessionReady(true)
          setCheckingSession(false)
        }
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
      setCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password.length > 128) {
      setError('Contraseña demasiado larga')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message || 'Error al actualizar contraseña')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/pos')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-surface-container-lowest border border-white/5 rounded-2xl p-8 backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Definir Contraseña</h1>
          <p className="text-muted-foreground text-center mb-8">
            Crea una contraseña segura para tu cuenta
          </p>

          {checkingSession ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !sessionReady ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                Enlace inválido o expirado. Pide al administrador una nueva invitación.
              </p>
            </div>
          ) : success ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-500">
                Contraseña actualizada. Redirigiendo...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nueva contraseña
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-10"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirmar contraseña
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-10"
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Usa una combinación de letras, números y símbolos.
              </p>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-bold uppercase tracking-widest"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Guardar Contraseña'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
