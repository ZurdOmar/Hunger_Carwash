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
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => void
  getRole: () => string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const INACTIVITY_MS = 30 * 60 * 1000
const WARNING_BEFORE_MS = 60 * 1000
const SESSION_CHECK_MS = 5 * 60 * 1000

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

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const initializeAuth = async () => {
      try {
        // Race against 6 s: if getSession blocks on a hung token-refresh
        // (expired token + unresponsive network), we still unblock the UI.
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>(resolve =>
            setTimeout(() => resolve({ data: { session: null } }), 6000)
          ),
        ])
        const session = result.data.session
        setUser(session?.user || null)

        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('perfiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single()

          if (profileError) console.error('[AuthContext] profile fetch error:', profileError)
          if (profileData) {
            setProfile(profileData as UserProfile)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)

        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('perfiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single()

          if (profileError) console.error('[AuthContext] onAuthStateChange profile fetch error:', profileError)
          if (profileData) {
            setProfile(profileData as UserProfile)
          }
        } else {
          setProfile(null)
        }

      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setProfile(null)
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (sessionCheckRef.current) clearInterval(sessionCheckRef.current)

    // Read the access token BEFORE clearing storage.
    let accessToken: string | undefined
    try {
      accessToken = Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .map(k => { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } })
        .find(v => v?.access_token)?.access_token
    } catch {}

    // Clear tokens synchronously so a racing background refresh can't re-save them.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sb-')) localStorage.removeItem(k)
      }
    } catch {}

    // Fire-and-forget server revocation — no await so signOut never hangs.
    if (accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }).catch(() => {})
    }

    // Hard reload destroys the current JS context (releases any pending locks)
    // and boots a clean Supabase client on the login page.
    window.location.href = '/login'
  // All dependencies (setUser, setProfile, refs) are stable — empty dep array is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (!user) return

    setShowWarning(false)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    inactivityTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(60)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
            signOut()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_MS - WARNING_BEFORE_MS)
  }, [user])

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

  useEffect(() => {
    if (!user) return

    sessionCheckRef.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        signOut()
      }
    }, SESSION_CHECK_MS)

    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current)
    }
  }, [user])

  const getRole = () => profile?.role || null

  const refreshProfile = async () => {
    if (!user) return
    const { data } = await supabase
      .from('perfiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data as UserProfile)
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
                  onClick={signOut}
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
