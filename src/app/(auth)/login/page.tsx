'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import { AlertCircle, CheckCircle2, Loader, Eye, EyeOff, User } from 'lucide-react'

type PageMode = 'login' | 'set-password' | 'loading'

type PendingInvite = { accessToken: string; refreshToken: string }

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    // base64url → base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '==='.slice((b64.length + 3) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

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
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    const searchParams = new URLSearchParams(window.location.search)

    // Si detectamos la señal de logout, forzamos limpieza local y limpiamos la URL
    if (searchParams.get('logout') === 'true') {
      supabase.auth.signOut().then(() => {
        router.replace('/login')
        setMode('login')
      })
      return
    }

    // Error explícito en el hash (link inválido/expirado entregado por Supabase)
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1))
      const errorDesc = params.get('error_description')
      const msg = errorDesc ? errorDesc.replace(/\+/g, ' ') : null
      setError(msg === 'Email link is invalid or has expired'
        ? 'El enlace de invitación es inválido o ya ha expirado. Solicita uno nuevo.'
        : (msg || 'Ocurrió un error con el enlace.'))
      setMode('login')
      return
    }

    // Invitación con tokens en el hash — pintamos el formulario INMEDIATAMENTE.
    // NO usamos supabase.auth.setSession() porque se cuelga con el cliente SSR.
    // En su lugar, el token se usa directamente vía fetch en el submit.
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')

      if (accessToken) {
        const payload = decodeJwtPayload(accessToken)
        const emailFromToken = (payload?.email as string) || ''
        setEmail(emailFromToken)
        setPendingInvite({ accessToken, refreshToken: '' })
        setMode('set-password')

        // Limpiamos el hash para que no quede expuesto en la barra de direcciones
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        } catch { /* noop */ }
        return
      }

      setError('El enlace no contiene un token válido.')
      setMode('login')
      return
    }

    // Sin hash — rebote común: el usuario ya tiene cookie de sesión pero no ha puesto contraseña.
    // Consultamos sesión; si existe y no tiene password_set, mostramos set-password.
    const isInviteSearch = searchParams.get('type') === 'invite'
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userMeta = session.user.user_metadata as Record<string, unknown> | undefined
        const appMeta = session.user.app_metadata as Record<string, unknown> | undefined
        const needsPassword = isInviteSearch || (appMeta?.provider === 'email' && !userMeta?.password_set)
        if (needsPassword) {
          setEmail(session.user.email || '')
          setMode('set-password')
        } else {
          router.push('/pos')
          router.refresh()
        }
      } else {
        setMode('login')
      }
    }).catch(() => setMode('login'))
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
      if (!pendingInvite) {
        setError('No hay un enlace de invitación activo.')
        return
      }

      // ======= BYPASS DEL SDK: usar fetch directo a la API REST =======
      // supabase.auth.setSession() se cuelga con createBrowserClient + noOpLock,
      // así que llamamos directamente al endpoint PUT /auth/v1/user
      // con el access_token como bearer.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingInvite.accessToken}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          password,
          data: { password_set: true },
        }),
      })

      if (!updateRes.ok) {
        const errData = await updateRes.json().catch(() => ({}))
        setError(errData.message || errData.msg || 'Error al establecer la contraseña.')
        return
      }

      const userData = await updateRes.json()

      // Ahora iniciar sesión normalmente con email/password (esto SÍ funciona con el SDK)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (signInError) {
        // La contraseña se guardó, pero el sign-in falló.
        // Mandamos al usuario al login normal.
        setPendingInvite(null)
        setSuccess('¡Contraseña creada! Inicia sesión con tus credenciales.')
        setTimeout(() => {
          setMode('login')
          setSuccess(null)
          setPassword('')
          setConfirmPassword('')
        }, 2000)
        return
      }

      // Actualizar el nombre real en la tabla de perfiles
      if (fullName.trim() && userData.id) {
        try {
          await supabase
            .from('perfiles')
            .update({ full_name: fullName.trim() })
            .eq('id', userData.id)
        } catch {
          console.error('Error updating profile name')
        }
      }

      setPendingInvite(null)
      setSuccess('¡Contraseña creada exitosamente! Redirigiendo...')

      setTimeout(() => {
        window.location.href = '/pos'
      }, 1500)
    } catch (err) {
      console.error('handleSetPassword error:', err)
      setError('Error al establecer la contraseña. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking for invite token
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary/15 blur-[150px] rounded-full pointer-events-none" style={{ animation: 'gradient-shift 8s ease-in-out infinite' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${6 + i * 1.5}s`,
            width: `${4 + (i % 3) * 2}px`,
            height: `${4 + (i % 3) * 2}px`,
          }}
        />
      ))}

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="login-card p-8">

          {/* ===== SET PASSWORD MODE (Invited User) ===== */}
          {mode === 'set-password' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Invitación Verificada</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  ¡Bienvenido al equipo!
                </h1>
                <p className="text-muted-foreground text-sm">
                  Crea tu contraseña para acceder
                </p>
                <p className="text-sm text-primary font-medium mt-1">
                  {email}
                </p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tu nombre completo
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Ej: María López"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading || !!success}
                      className="w-full h-10 pl-10"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
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
                  className="w-full h-12 font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 text-sm"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : success ? (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Listo</span>
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
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido</h1>
                <p className="text-muted-foreground text-sm">
                  Inicia sesión en Hunger Car Wash ERP
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Correo electrónico
                  </label>
                  <Input
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-300"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || isBlocked}
                  className="w-full h-12 font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 text-sm"
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

              <p className="text-center text-[10px] text-muted-foreground/40 mt-6 font-medium tracking-wider">
                Hunger Car Wash ERP &copy; {new Date().getFullYear()}
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
