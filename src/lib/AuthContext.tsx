'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  signOut: () => Promise<void>
  getRole: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

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
          const { data: profileData } = await supabase
            .from('perfiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single()

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
          const { data: profileData } = await supabase
            .from('perfiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single()

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

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    // Clear session from localStorage directly — no SDK call, no navigator.lock acquired.
    // This avoids blocking on a hung token-refresh that may be holding the lock.
    // Tokens expire naturally; for a higher-security app, add a background server revocation.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sb-')) localStorage.removeItem(k)
      }
    } catch {}
    // Hard reload destroys the current JS context (releases any pending locks)
    // and boots a clean Supabase client on the login page.
    window.location.href = '/login'
  }

  const getRole = () => profile?.role || null

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signOut,
    getRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
