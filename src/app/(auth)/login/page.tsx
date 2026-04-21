'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { AlertCircle, CheckCircle2, Loader, Eye, EyeOff } from 'lucide-react'

type PageMode = 'login' | 'set-password' | 'loading'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<PageMode>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    // Check if the URL has a hash fragment
    const hash = window.location.hash
    
    if (hash && hash.includes('error=')) {
      // Parse error from hash e.g. #error=access_denied&error_description=Email+link+is+invalid+or+has+expired
      const params = new URLSearchParams(hash.substring(1))
      const errorDesc = params.get('error_description')
      
      if (errorDesc) {
        // Replace pluses with spaces
        const msg = errorDesc.replace(/\+/g, ' ')
        setError(msg === 'Email link is invalid or has expired' 
          ? 'El enlace de invitación es inválido o ya ha expirado. Solicita uno nuevo.' 
          : msg)
      } else {
        setError('Ocurrió un error con el enlace.')
      }
      setMode('login')
      return
    }

    if (hash && hash.includes('access_token')) {
      const searchParams = new URLSearchParams(window.location.search)
      const isInviteLink = hash.includes('type=invite') || searchParams.get('type') === 'invite'

      // Helper to handle an authenticated invited user
      const handleInvitedUser = (session: { user: { email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } }) => {
        const userMeta = session.user.user_metadata
        // Si viene de un link de invitación explícito O el proveedor es email y no tiene password_set
        const isInvited = isInviteLink || (session.user.app_metadata?.provider === 'email' && !userMeta?.password_set)

        if (isInvited) {
          setEmail(session.user.email || '')
          setMode('set-password')
        } else {
          router.push('/pos')
          router.refresh()
        }
      }

      // Explicitly process the tokens from the URL to avoid race conditions
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(({ data, error }) => {
          if (error) {
            console.error('Error setting session from url:', error.message)
            setError('El enlace de invitación no es válido o ha expirado.')
            setMode('login')
          } else if (data.session) {
            handleInvitedUser(data.session)
          } else {
            setError('No se pudo establecer la sesión.')
            setMode('login')
          }
        }).catch(() => {
          setError('Error inesperado al procesar la invitación.')
          setMode('login')
        })
      } else {
        // Fallback check just in case Supabase handled it already
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            handleInvitedUser(session)
          } else {
            setMode('login')
          }
        })
      }
      return
    } else {
      // No hash fragment — show normal login
      setMode('login')
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isBlocked) {
      setError('Demasiados intentos fallidos. Intenta más tarde.')
      return
    }

    setLoading(true)

    try {
      if (!email || !password) {
        setError('Ingresa tu correo y contraseña')
        setLoading(false)
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Correo inválido')
        setLoading(false)
        return
      }

      if (email.length > 254 || password.length > 128) {
        setError('Entrada muy larga')
        setLoading(false)
        return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (authError) {
        const newAttempts = loginAttempts + 1
        setLoginAttempts(newAttempts)

        if (newAttempts >= 5) {
          setIsBlocked(true)
          setError('Cuenta bloqueada temporalmente. Intenta en 15 minutos.')

          setTimeout(() => {
            setIsBlocked(false)
            setLoginAttempts(0)
          }, 15 * 60 * 1000)
        } else {
          setError('Correo o contraseña incorrectos')
        }
        setLoading(false)
        return
      }

      setLoginAttempts(0)
      setIsBlocked(false)
      router.push('/pos')
      router.refresh()
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!password || !confirmPassword) {
      setError('Ingresa y confirma tu contraseña')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess('¡Contraseña creada exitosamente! Redirigiendo...')

      setTimeout(() => {
        router.push('/pos')
        router.refresh()
      }, 1500)
    } catch {
      setError('Error al establecer la contraseña. Intenta de nuevo.')
      setLoading(false)
    }
  }

  // Loading state while checking for invite token
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
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

          {/* ===== SET PASSWORD MODE (Invited User) ===== */}
          {mode === 'set-password' && (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
                ¡Bienvenido al equipo!
              </h1>
              <p className="text-muted-foreground text-center mb-2">
                Crea tu contraseña para acceder
              </p>
              <p className="text-sm text-primary text-center mb-6">
                {email}
              </p>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-400">{success}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || !!success}
                      className="w-full h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirmar contraseña
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || !!success}
                    className="w-full h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full h-10 font-bold uppercase tracking-widest"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : success ? (
                    '✓ Listo'
                  ) : (
                    'Crear Contraseña'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* ===== LOGIN MODE (Normal) ===== */}
          {mode === 'login' && (
            <>
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
                  disabled={loading || isBlocked}
                  className="w-full h-10 font-bold uppercase tracking-widest"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : isBlocked ? (
                    'Bloqueado temporalmente'
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
