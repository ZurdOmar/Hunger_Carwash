"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  UserCog,
  Mail,
  Shield,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { changeUserRoleAction, toggleUserActiveAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type Usuario = {
  id: string;
  full_name: string | null;
  email: string;
  role: 'admin' | 'supervisor' | 'cajero';
  activo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  supervisor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  cajero: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cajero: 'Cajero'
};

export default function UsersPage() {
  const { profile } = useAuth();
  const [usuarios, setUsuarios] = React.useState<Usuario[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newRole, setNewRole] = React.useState<'admin' | 'supervisor' | 'cajero'>('cajero');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');



  // Cargar usuarios
  React.useEffect(() => {
    // Si no es admin, no cargar (el return temprano principal está abajo)
    if (profile?.role !== 'admin') return;

    const loadUsuarios = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .rpc('get_todos_usuarios');

        if (err) {
          setError(err.message || 'Error al cargar usuarios');
          console.error(err);
          return;
        }

        setUsuarios((data || []) as Usuario[]);
      } catch (err) {
        setError('Error inesperado');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUsuarios();
  }, [profile?.role]);

  const handleChangeRole = async (userId: string, role: 'admin' | 'supervisor' | 'cajero') => {
    setIsSubmitting(true);
    try {
      await changeUserRoleAction(userId, role);
      setUsuarios(usuarios.map(u => u.id === userId ? { ...u, role } : u));
      setEditingId(null);
      setSuccessMessage('Rol actualizado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar rol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, activo: boolean) => {
    setIsSubmitting(true);
    try {
      await toggleUserActiveAction(userId, !activo);
      setUsuarios(usuarios.map(u => u.id === userId ? { ...u, activo: !activo } : u));
      setSuccessMessage(activo ? 'Usuario desactivado' : 'Usuario activado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Protección: solo admin puede ver esta página (DEBE IR DESPUÉS DE LOS HOOKS)
  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Solo administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading level={2} className="flex items-center gap-3">
          <UserCog className="w-7 h-7" />
          Gestión de Usuarios
        </Heading>
        <p className="text-muted-foreground mt-2">Administra roles y estado de acceso de tus usuarios</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3"
          >
            <Check className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="text-left font-semibold py-3 px-4">Nombre</th>
                    <th className="text-left font-semibold py-3 px-4">Email</th>
                    <th className="text-left font-semibold py-3 px-4">Rol</th>
                    <th className="text-left font-semibold py-3 px-4">Estado</th>
                    <th className="text-left font-semibold py-3 px-4">Último Acceso</th>
                    <th className="text-center font-semibold py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usuarios.map((usuario) => (
                    <motion.tr
                      key={usuario.id}
                      layout
                      className={cn(
                        "hover:bg-white/5 transition-colors",
                        !usuario.activo && "opacity-50"
                      )}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{usuario.full_name || 'Sin nombre'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{usuario.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {editingId === usuario.id ? (
                          <div className="flex gap-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value as any)}
                              className="text-xs rounded border border-white/20 bg-white/5 px-2 py-1"
                            >
                              <option value="admin">Administrador</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="cajero">Cajero</option>
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeRole(usuario.id, newRole)}
                              disabled={isSubmitting}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(usuario.id);
                              setNewRole(usuario.role);
                            }}
                            className={cn(
                              "inline-block px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                              roleColors[usuario.role]
                            )}
                          >
                            {roleLabels[usuario.role]}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {usuario.activo ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-xs">Activo</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-xs">Inactivo</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-muted-foreground">
                        {usuario.last_sign_in_at
                          ? new Date(usuario.last_sign_in_at).toLocaleDateString('es-MX')
                          : 'Nunca'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(usuario.id, usuario.activo)}
                            disabled={isSubmitting || usuario.id === profile.id}
                            title={usuario.id === profile.id ? 'No puedes desactivar tu propia cuenta' : ''}
                          >
                            {usuario.activo ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">ℹ️ Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p>• <strong>Límite de Cajeros:</strong> Solo puedes tener máximo 2 cajeros activos simultáneamente.</p>
          <p>• <strong>Desactivar usuarios:</strong> Al desactivar un usuario, no podrá acceder a la aplicación. Sus datos quedan en el historial.</p>
          <p>• <strong>Cambiar roles:</strong> Haz clic en el rol para editarlo. Puedes asignar: Administrador, Supervisor o Cajero.</p>
        </CardContent>
      </Card>
    </div>
  );
}
