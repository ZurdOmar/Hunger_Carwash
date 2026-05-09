'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save, Loader, CheckCircle2, AlertCircle } from 'lucide-react'
import { Heading } from '@/components/ui/Heading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cajero: 'Cajero',
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile!.id)

    if (updateError) {
      setError('Error al guardar el nombre. Intenta de nuevo.')
      setLoading(false)
      return
    }

    await refreshProfile()
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Heading level={2} className="flex items-center gap-3">
          <User className="w-7 h-7" />
          Mi Perfil
        </Heading>
        <p className="text-muted-foreground mt-2">Edita tu información personal</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass border border-white/10">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/20">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>{profile?.full_name || '(Sin nombre)'}</CardTitle>
                <CardDescription>
                  {profile?.role ? roleLabels[profile.role] : '—'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-sm text-green-400">Nombre actualizado correctamente</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Nombre completo
                </label>
                <Input
                  type="text"
                  placeholder="Ej: María López"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rol
                </label>
                <Input
                  value={profile?.role ? roleLabels[profile.role] : '—'}
                  disabled
                  className="h-11 opacity-60"
                />
                <p className="text-xs text-muted-foreground">El rol solo puede ser modificado por un administrador.</p>
              </div>

              <Button
                type="submit"
                disabled={loading || fullName.trim() === (profile?.full_name || '')}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
