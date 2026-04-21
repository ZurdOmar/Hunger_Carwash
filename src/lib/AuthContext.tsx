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
        const { data: { session } } = await supabase.auth.getSession()
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
    try {
      // Limpiamos los estados de forma inmediata para una respuesta instantánea en la UI
      setUser(null)
      setProfile(null)
      
      await supabase.auth.signOut()
      
      // Usamos window.location con un parámetro especial para romper el bucle de auto-login del middleware
      window.location.href = '/login?logout=true'
    } catch (error) {
      console.error('Error signing out:', error)
      // En caso de error, intentamos forzar la salida igualmente con la señal de logout
      window.location.href = '/login?logout=true'
    }
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
