'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, LogOut } from 'lucide-react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  full_name: string | null
  role: 'admin' | 'supervisor' | 'cajero'
  es_owner?: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: (reason?: 'inactivity' | 'expired' | 'trial_expired') => void
  getRole: () => string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 1 hora de inactividad → se cierra sesión y se manda a /login.
const INACTIVITY_MS = 60 * 60 * 1000
const WARNING_BEFORE_MS = 60 * 1000
const SESSION_CHECK_MS = 5 * 60 * 1000
const ACTIVITY_WRITE_THROTTLE_MS = 30 * 1000

// Persistimos la última actividad en localStorage (sobrevive reload y cierre de
// pestaña) para medir la inactividad por RELOJ DE PARED. Los timers setTimeout no
// sirven para esto: el SO los congela mientras la laptop duerme, así que al
// reabrir la pestaña nunca dispararían el cierre por inactividad — ese era el
// bug por el que la sesión "seguía viva tras un día".
const LAST_ACTIVITY_KEY = 'hunger_last_activity'

const readTs = (k: string): number | null => {
  try {
    const v = localStorage.getItem(k)
    return v ? parseInt(v, 10) : null
  } catch {
    return null
  }
}
const writeTs = (k: string, v: number) => {
  try { localStorage.setItem(k, String(v)) } catch {}
}
const clearSessionTs = () => {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityWriteRef = useRef(0)

  // Escribe la marca de última actividad (throttled: no en cada mousemove).
  const markActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return
    lastActivityWriteRef.current = now
    writeTs(LAST_ACTIVITY_KEY, now)
  }, [])

  // ¿La sesión lleva demasiado tiempo inactiva (reloj de pared)? Motivo o null.
  const getStaleReason = useCallback((): 'inactivity' | null => {
    const last = readTs(LAST_ACTIVITY_KEY)
    if (last !== null && Date.now() - last >= INACTIVITY_MS) return 'inactivity'
    return null
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // onAuthStateChange fires INITIAL_SESSION when the listener is registered.
    // CRÍTICO: NO hacemos await del fetch de perfil aquí — eso bloqueaba
    // setLoading(false) cuando la consulta a `perfiles` tardaba (RLS, latencia).
    // El perfil se carga en un useEffect separado que depende de `user`.
    // A 12-second fallback covers the edge case where the SDK hangs entirely.
    const fallback = setTimeout(() => setLoading(false), 12000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        if (!session?.user) setProfile(null)

        // En login real reiniciamos la marca de actividad para no arrastrar un
        // valor viejo de una sesión previa que dispararía un cierre inmediato.
        if (event === 'SIGNED_IN') {
          const now = Date.now()
          writeTs(LAST_ACTIVITY_KEY, now)
          lastActivityWriteRef.current = now
        }

        // Unblock the UI as soon as we know the auth state — no esperamos al perfil.
        if (event === 'INITIAL_SESSION') {
          clearTimeout(fallback)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  // Carga del perfil desacoplada del flujo principal de auth.
  // Si la consulta tarda, el resto de la app (ConfigContext, dashboard) ya está
  // funcionando con `user` válido; solo el nombre en sidebar dirá "Cargando…"
  // unos segundos hasta que termine este fetch.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      // es_owner se lee directo de la columna (no vía RPC is_owner): la lectura
      // de perfiles ya está probada que funciona, mientras que la RPC dependía
      // del caché de esquema de PostgREST.
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, full_name, role, es_owner')
        .eq('id', user.id)
        .single()

      if (cancelled) return
      if (error) {
        console.error('[AuthContext] profile fetch error:', error)
        return
      }
      if (data) setProfile(data as unknown as UserProfile)
    })()

    return () => { cancelled = true }
  }, [user])

  const signOut = useCallback((reason?: 'inactivity' | 'expired' | 'trial_expired') => {
    setUser(null)
    setProfile(null)
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (sessionCheckRef.current) clearInterval(sessionCheckRef.current)

    // Guardar razón del cierre para que la pantalla de login muestre mensaje claro.
    // sessionStorage se borra al cerrar pestaña → no contamina sesiones futuras.
    if (reason) {
      try { sessionStorage.setItem('session_end_reason', reason) } catch {}
    }

    // @supabase/ssr's createBrowserClient stores the session in cookies (chunked
    // as sb-<ref>-auth-token, sb-<ref>-auth-token.0, etc), NOT localStorage.
    // We must wipe these cookies; otherwise the login page's getSession()
    // restores the session and redirects right back to /pos.
    try {
      const host = window.location.hostname
      const past = 'Thu, 01 Jan 1970 00:00:00 GMT'
      const cookieNames = document.cookie
        .split(';')
        .map(c => c.split('=')[0].trim())
        .filter(name => name.startsWith('sb-'))

      for (const name of cookieNames) {
        // Try every plausible attribute combo — browsers only delete a cookie
        // when the path/domain match the original Set-Cookie exactly.
        document.cookie = `${name}=; expires=${past}; path=/`
        document.cookie = `${name}=; expires=${past}; path=/; domain=${host}`
        document.cookie = `${name}=; expires=${past}; path=/; domain=.${host}`
      }
    } catch {}

    // Belt-and-suspenders: clear any legacy localStorage entries from older
    // builds that used the default supabase-js storage.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sb-')) localStorage.removeItem(k)
      }
    } catch {}

    // Borra las marcas de reloj de pared para no arrastrar tiempos viejos a la
    // próxima sesión (el SIGNED_IN las reinicia de todos modos).
    clearSessionTs()

    // Hard reload destroys the current JS context (releases any pending locks)
    // and boots a clean Supabase client on the login page.
    window.location.href = '/login'
  // All dependencies (setUser, setProfile, refs) are stable — empty dep array is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enforcement por reloj de pared: al montar / cuando `user` queda definido
  // (incluye reabrir la pestaña tras dormir la laptop), cierra la sesión si lleva
  // más de 1 h inactiva. Es la red de seguridad que los timers setTimeout no
  // pueden dar tras un sleep (el SO los congela y nunca disparan al reabrir).
  useEffect(() => {
    if (!user) return
    const reason = getStaleReason()
    if (reason) {
      signOut(reason)
      return
    }
    markActivity()
  }, [user, getStaleReason, signOut, markActivity])

  const resetTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (!user) return

    markActivity()
    setShowWarning(false)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    inactivityTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(60)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
            signOut('inactivity')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_MS - WARNING_BEFORE_MS)
  }, [user, markActivity])

  const extendSession = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setShowWarning(false)
    setCountdown(60)
    resetTimer()
  }

  useEffect(() => {
    if (!user) return

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [user, resetTimer])

  // Validación robusta: getSession() puede devolver null transitoriamente justo
  // después de un F5 (mientras Supabase hidrata desde cookies) o durante el refresh
  // interno del token. Si confiásemos en la primera lectura, deslogueariamos por error
  // a usuarios con sesión válida. La estrategia correcta es:
  //   1. getSession() devuelve null → no concluir nada todavía.
  //   2. Intentar refreshSession() — si trae sesión válida, todo bien.
  //   3. Solo desloguear si refreshSession() también falla.
  const validateSessionOrSignOut = useCallback(async () => {
    // Primero, reloj de pared: si la sesión lleva >1 h inactiva, ciérrala aunque
    // el refresh token siga siendo válido. Ese es justo el caso que permitía
    // "seguir logueado tras un día" (refreshSession renovaba y nunca deslogueaba).
    const staleReason = getStaleReason()
    if (staleReason) {
      signOut(staleReason)
      return false
    }

    // Trial del proyecto demo: si venció, cerrar sesión con mensaje. Fail-open
    // si la RPC no existe (proyectos sin trial, p.ej. producción) o si falla.
    // La función no está en los tipos generados → cast tipado (sin `any`).
    try {
      // Llamar .rpc() sobre el objeto (conservar `this`), no como función suelta.
      const client = supabase as unknown as {
        rpc: (name: string) => Promise<{ data: boolean | null; error: unknown | null }>
      }
      const { data: trialActive, error: trialErr } = await client.rpc('is_trial_active')
      if (!trialErr && trialActive === false) {
        signOut('trial_expired')
        return false
      }
    } catch { /* fail-open: sin trial, seguimos */ }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) return true

    const { data: refreshed, error } = await supabase.auth.refreshSession()
    if (refreshed?.session) return true

    // Solo aquí estamos seguros de que la sesión expiró de verdad.
    console.warn('[AuthContext] sesión expirada confirmada:', error?.message)
    signOut('expired')
    return false
  }, [signOut, getStaleReason])

  useEffect(() => {
    if (!user) return

    sessionCheckRef.current = setInterval(() => {
      validateSessionOrSignOut()
    }, SESSION_CHECK_MS)

    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current)
    }
  }, [user, validateSessionOrSignOut])

  // Cuando el navegador vuelve a estar visible (laptop reabierto), revalida la sesión.
  // - Solo escuchamos `visibilitychange`, NO `focus`: focus se dispara al volver a la
  //   pestaña aunque nunca se haya dormido el equipo (p.ej. simplemente cambiando entre
  //   pestañas), causando revalidaciones innecesarias.
  // - Debounce de 60s evita disparos en cadena si el evento se repite rápido.
  // - Usa validateSessionOrSignOut para no desloguear en falsos negativos transitorios.
  useEffect(() => {
    if (!user) return
    let lastCheck = 0

    const checkSessionOnResume = () => {
      if (document.hidden) return
      const now = Date.now()
      if (now - lastCheck < 60_000) return
      lastCheck = now
      validateSessionOrSignOut()
    }

    document.addEventListener('visibilitychange', checkSessionOnResume)

    return () => {
      document.removeEventListener('visibilitychange', checkSessionOnResume)
    }
  }, [user, validateSessionOrSignOut])

  const getRole = () => profile?.role || null

  const refreshProfile = async () => {
    if (!user) return
    const { data } = await supabase
      .from('perfiles')
      .select('id, full_name, role, es_owner')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data as unknown as UserProfile)
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signOut,
    getRole,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Sesión a punto de expirar</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Tu sesión se cerrará en <span className="font-bold text-amber-500">{countdown}</span> segundos por inactividad. ¿Deseas continuar?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => signOut()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
                <button
                  onClick={extendSession}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
