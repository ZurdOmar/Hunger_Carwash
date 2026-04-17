'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { AlertCircle, Loader } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // Login exitoso
      router.push('/pos')
      router.refresh()
    } catch (err) {
      setError('Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-surface-container-lowest border border-white/5 rounded-2xl p-8 backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Bienvenido</h1>
          <p className="text-muted-foreground text-center mb-8">
            Inicia sesión en Hunger Car Wash ERP
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-10"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-bold uppercase tracking-widest"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-muted-foreground text-center">
              Demo: admin@ejemplo.com / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
