# Hunger Carwash — Documentación de Roles de Usuario

Este documento detalla la arquitectura, implementación y reglas de negocio del sistema de gestión de accesos (RBAC - Role Based Access Control) del ERP/POS Hunger Carwash.

---

## 1. Definición de Roles

El sistema está diseñado para manejar tres niveles de acceso claramente diferenciados, garantizando que cada usuario vea y manipule solo lo necesario para su función:

| Rol | Descripción | Permisos Clave |
| :--- | :--- | :--- |
| **admin** | Administrador total del sistema. | Gestión de precios, servicios, empleados y reportes financieros globales. |
| **supervisor** | Personal con autoridad sobre la operación diaria. | Supervisión de órdenes, gestión de inventarios y visualización de reportes de sucursal. |
| **cajero** | Personal operativo del punto de venta. | Creación de órdenes, asignación de lavadores, recepción de pagos y corte de caja. |

> [!IMPORTANT]
> **Restricción de Cajeros**: Por regla de negocio, el sistema limita el número de cajeros activos a un máximo de **2** simultáneos, controlado mediante triggers en la base de datos para prevenir el uso indebido de licencias o el acceso no supervisado.

---

## 2. Arquitectura de Datos

### Tabla `public.perfiles`
La información de roles no se guarda en el servicio de autenticación nativo, sino en una tabla de perfiles sincronizada para permitir consultas complejas y seguridad RLS:

- **Sincronización Automática**: Cada vez que se crea un usuario en `auth.users` (vía invitación o registro), un trigger (`on_auth_user_created`) dispara la función `handle_new_user()`, la cual crea automáticamente el registro en `public.perfiles`.
- **Campos Principales**: `id` (UUID vinculado a Auth), `full_name`, `role` (enum: admin, supervisor, cajero).

---

## 3. Seguridad y Protección de Rutas

La protección del sistema es "multicapa", combinando seguridad en el servidor, en la base de datos y en la interfaz:

### A. Middleware de Next.js (`src/middleware.ts`)
Es el primer filtro de seguridad. Antes de que React renderice cualquier página, el middleware verifica:
1. **Sesión Activa**: Si no hay sesión, redirige automáticamente a `/login`.
2. **Autorización**: Si un usuario con rol `cajero` intenta entrar manualmente a rutas de configuración o administración (ej: `/settings`), el sistema lo rebota de inmediato a la ruta operativa principal.

### B. Row Level Security (RLS) en Supabase
Incluso si alguien lograra saltarse la interfaz, la base de datos tiene "candados" por fila:
- **Lectura**: Solo usuarios autenticados pueden ver datos operativos.
- **Escritura**: Las tablas de catálogos (precios, servicios, cajones) tienen **escritura exclusiva para el `admin`**.
- **Borrado**: **Solo el `admin`** tiene permisos para eliminar registros (órdenes, servicios, etc.). Los cajeros y supervisores solo pueden actualizar estados.

### C. Contexto de Autenticación (`AuthContext.tsx`)
En el frontend, el hook `useAuth()` expone el rol del usuario actual, permitiendo que la interfaz oculte o muestre botones y secciones de forma dinámica y fluida.

---

## 4. Flujo de Invitación de Usuarios

Para garantizar que solo personal autorizado ingrese, el flujo es el siguiente:
1. El **Admin** genera una invitación desde el panel administrativo.
2. El sistema envía un correo electrónico de confirmación con un enlace seguro.
3. Al hacer clic, el usuario es dirigido a una pantalla especial de registro donde establece su contraseña y completa su perfil.
4. Una vez completado, el usuario es redirigido automáticamente a la sección que le corresponde según su rol asignado.

---

> [!NOTE]
> Esta documentación refleja la versión técnica implementada a partir del 22 de Abril de 2026.
