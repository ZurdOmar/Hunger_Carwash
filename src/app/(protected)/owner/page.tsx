'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Heading } from '@/components/ui/Heading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Eye, EyeOff, Loader, UserPlus, DatabaseBackup, RotateCcw, Trash2, Clock, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'
import {
  createDemoUserAction,
  setVigenciaAction,
  deleteDemoUserAction,
  listDemoUsersAction,
  snapshotDemoAction,
  restoreDemoAction,
} from '@/app/owner-actions'

type DemoUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  vigencia_hasta: string | null
}

// datetime-local (sin tz) → ISO; vacío → null
function localToISO(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function fmt(iso: string | null): string {
  if (!iso) return 'Sin límite'
  return new Date(iso).toLocaleString()
}

export default function OwnerPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [vigencia, setVigencia] = React.useState('')

  const [users, setUsers] = React.useState<DemoUser[]>([])
  const [busy, setBusy] = React.useState<string | null>(null)
  const [confirm, setConfirm] = React.useState<{ title: string; message: string; action: () => Promise<void> } | null>(null)

  const isOwner = profile?.es_owner === true

  const refresh = React.useCallback(async () => {
    try {
      setUsers(await listDemoUsersAction())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo listar usuarios')
    }
  }, [])

  React.useEffect(() => {
    if (!loading && !isOwner) {
      router.replace('/pos')
      return
    }
    if (isOwner) refresh()
  }, [loading, isOwner, router, refresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }
  if (!isOwner) return null

  const handleCreate = async () => {
    setBusy('create')
    try {
      const res = await createDemoUserAction(email, password, localToISO(vigencia), fullName || undefined)
      toast.success(`Demo creada: ${res.email}`)
      setEmail(''); setPassword(''); setFullName(''); setVigencia('')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear la demo')
    } finally {
      setBusy(null)
    }
  }

  const runConfirmed = async () => {
    if (!confirm) return
    const fn = confirm.action
    setConfirm(null)
    await fn()
  }

  const doSnapshot = async () => {
    setBusy('snapshot')
    try { await snapshotDemoAction(); toast.success('Respaldo generado') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo generar el respaldo') }
    finally { setBusy(null) }
  }

  const doRestore = async () => {
    setBusy('restore')
    try { await restoreDemoAction(); toast.success('Datos restaurados al respaldo') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo restaurar') }
    finally { setBusy(null) }
  }

  const doSetVigencia = async (u: DemoUser, localValue: string) => {
    setBusy(`vig-${u.id}`)
    try {
      await setVigenciaAction(u.id, localToISO(localValue))
      toast.success('Vigencia actualizada')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la vigencia')
    } finally {
      setBusy(null)
    }
  }

  const doDelete = async (u: DemoUser) => {
    setBusy(`del-${u.id}`)
    try {
      await deleteDemoUserAction(u.id)
      toast.success('Usuario eliminado')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><ShieldAlert className="w-5 h-5 text-primary" /></div>
        <Heading>Panel Owner</Heading>
      </div>

      {/* Crear demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Crear demo</CardTitle>
          <CardDescription>Alta de una cuenta admin para un cliente, con fecha de vigencia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Correo</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@ejemplo.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Nombre (opcional)</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Cliente Demo" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Vigencia (vacío = sin límite)</label>
              <Input type="datetime-local" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={busy === 'create'}>
            {busy === 'create' ? <Loader className="w-4 h-4 animate-spin" /> : 'Crear demo'}
          </Button>
        </CardContent>
      </Card>

      {/* Respaldo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseBackup className="w-4 h-4" /> Respaldo de datos</CardTitle>
          <CardDescription>Congela el estado actual y restáuralo cuando quieras. No afecta cuentas de usuario.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => setConfirm({ title: 'Generar respaldo', message: 'Se sobrescribirá el respaldo anterior con el estado actual de los datos. ¿Continuar?', action: doSnapshot })}
            disabled={busy === 'snapshot'}
          >
            {busy === 'snapshot' ? <Loader className="w-4 h-4 animate-spin" /> : <><DatabaseBackup className="w-4 h-4 mr-2" /> Generar respaldo</>}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirm({ title: 'Restaurar respaldo', message: 'Se descartarán los cambios en los datos y se volverá al último respaldo. ¿Continuar?', action: doRestore })}
            disabled={busy === 'restore'}
          >
            {busy === 'restore' ? <Loader className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4 mr-2" /> Restaurar respaldo</>}
          </Button>
        </CardContent>
      </Card>

      {/* Usuarios demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> Usuarios demo</CardTitle>
          <CardDescription>Cuentas de clientes (no incluye tu cuenta owner). Cambia su vigencia o elimínalas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios demo todavía.</p>}
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              busy={busy}
              onSetVigencia={doSetVigencia}
              onDelete={() => setConfirm({ title: 'Eliminar usuario', message: `¿Eliminar a ${u.email}? Esta acción no se puede deshacer.`, action: () => doDelete(u) })}
            />
          ))}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        isDestructive
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function UserRow({
  user, busy, onSetVigencia, onDelete,
}: {
  user: DemoUser
  busy: string | null
  onSetVigencia: (u: DemoUser, localValue: string) => Promise<void>
  onDelete: () => void
}) {
  // ISO → valor para datetime-local (YYYY-MM-DDTHH:mm en hora local)
  const initial = user.vigencia_hasta
    ? (() => { const d = new Date(user.vigencia_hasta as string); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` })()
    : ''
  const [val, setVal] = React.useState(initial)

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-white/10">
      <div className="min-w-[180px] flex-1">
        <p className="text-sm font-medium text-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">Vence: {fmt(user.vigencia_hasta)}</p>
      </div>
      <Input type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} className="w-[220px]" />
      <Button size="sm" variant="outline" onClick={() => onSetVigencia(user, val)} disabled={busy === `vig-${user.id}`}>
        {busy === `vig-${user.id}` ? <Loader className="w-4 h-4 animate-spin" /> : 'Guardar vigencia'}
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy === `del-${user.id}`}>
        {busy === `del-${user.id}` ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </Button>
    </div>
  )
}
