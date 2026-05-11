# Hunger Car Wash — Documentación de Arquitectura

> **Propósito**: Este documento es la referencia única para entender cómo funciona la app. Léelo antes de cualquier cambio. Actualízalo cada vez que agregues una nueva característica.

---

## 1. Visión General

**Hunger Car Wash** es un ERP para gestionar operaciones de lavado de autos. Stack: **Next.js 16** + **Supabase** + **Tailwind + Framer Motion**.

**Roles**:
- **Admin**: Acceso completo. Gestiona usuarios, configuración, reportes.
- **Supervisor**: Gestiona Kanban, abre/cierra turnos, ve reportes.
- **Cajero**: Opera POS, crea órdenes. NO puede cambiar estados ni cerrar turnos.

**Flujo**:
1. Login (email + password) → Supabase session
2. AuthContext carga user + profile (rol, nombre)
3. Middleware (proxy.ts) valida rol y ruta
4. ConfigContext carga catálogos y órdenes (Supabase = fuente de verdad)
5. Usuario interactúa: POS → Kanban → Corte

---

## 2. Estructura de Carpetas

```
src/
├── app/
│   ├── layout.tsx                 ← HTML + Providers (root)
│   ├── (auth)/login/page.tsx      ← Login (público)
│   └── (protected)/               ← Requiere sesión + rol válido
│       ├── layout.tsx             ← Sidebar + TopBar + children
│       ├── pos/page.tsx           ← Punto de Venta
│       ├── operations/page.tsx    ← Kanban
│       ├── dashboard/page.tsx     ← Stats + Corte
│       ├── reports/page.tsx       ← Reportes (admin+)
│       ├── users/page.tsx         ← Gestión usuarios (admin)
│       ├── members/page.tsx       ← Clientes
│       ├── resources/page.tsx     ← Cajones + Lavadores
│       ├── settings/page.tsx      ← Catálogos (admin)
│       └── profile/page.tsx       ← Perfil usuario
├── components/
│   ├── Sidebar.tsx                ← Nav + usuario + logout
│   ├── TopBar.tsx                 ← Encabezado
│   ├── ConfirmModal.tsx           ← Modal confirmación
│   ├── CorteModal.tsx             ← Modal corte + CSV
│   ├── AuthGuard.tsx              ← Protección por rol
│   ├── Providers.tsx              ← Auth + Config + Theme
│   └── ui/                        ← Componentes base
├── lib/
│   ├── AuthContext.tsx            ← user, profile, signOut
│   ├── ConfigContext.tsx          ← órdenes, catálogos, métodos
│   ├── supabase.ts                ← Cliente (client)
│   ├── supabase-server.ts         ← Cliente (server + middleware)
│   ├── types.ts                   ← Interfaces
│   ├── database.types.ts          ← Tipos Supabase (auto)
│   ├── turnosService.ts           ← CSV + corte de caja
│   ├── errorHandler.ts            ← Validaciones
│   ├── utils.ts                   ← Utilities
│   └── data.ts                    ← Defaults
├── proxy.ts                       ← Middleware: roles + redirect
└── app/actions.ts                 ← Server Actions
```

---

## 3. Autenticación

### Login Flow
1. Usuario ingresa email + password
2. `supabase.auth.signInWithPassword()`
3. Éxito → Sesión creada (cookie `sb-*`)
4. Middleware redirige a `/pos`
5. Fallo → Toast error

### AuthContext
```typescript
user = Supabase session user
profile = { id, full_name, role } de tabla perfiles
loading = bool (true mientras carga)
```

**Métodos**:
- `signOut()`: Borra sesión → redirect `/login?logout=true`
- `getRole()`: Retorna role o null

---

## 4. Middleware (proxy.ts)

Ejecuta **ANTES** de cualquier request.

```
Si NO sesión + ruta ≠ /login → /login
Si sesión + ruta = /login → /pos
Si sesión + ADMIN_ONLY → valida role = 'admin', si no → /pos
Si sesión + SUPERVISOR → valida role in ['admin', 'supervisor'], si no → /pos
```

**Rutas**:
- `PUBLIC_PATHS = ['/login']`
- `ADMIN_ONLY_PATHS = ['/settings', '/reports']`
- `SUPERVISOR_PATHS = ['/dashboard', '/reports']`

---

## 5. ConfigContext

**Estado global de la app**. Todo flujo lee/escribe aquí.

```typescript
// Catálogos
vehicleSizes: VehicleSizeConfig[]
services: Service[]
basePrices: Record<string, number>

// Operativa
orders: Order[]                     // Estado ≠ 'Entregado'
washers: Washer[]
bays: Bay[]

// Métodos clave
addOrder(order)                     // Crea en Supabase
updateOrderStatus(id, status)       // UPDATE estado
updateOrderAssignment(id, washerId, bayNumber)
addOrUpdateMember(placa)
addWasher(name)
addBay(label)
```

**Init**:
1. Espera AuthContext cargue user
2. Limpia localStorage (claves `hunger_*`)
3. Query Supabase: catálogos + órdenes
4. Fill state
5. Guard: `lastSyncedUserId` ref para evitar re-sincronizar

---

## 6. Base de Datos (Supabase)

**Tablas principales**:

### `perfiles`
```sql
id (uuid, PK)
full_name (text)
role ('admin' | 'supervisor' | 'cajero')
activo (boolean)
```

### `ordenes_servicio`
```sql
id (uuid, PK)
folio (int)
estado ('Recepción' | 'Lavado' | 'Secado' | 'Listo' | 'Entregado')
lavador_id (uuid, FK)
cajon_id (int, FK)
turno_id (uuid, FK)
monto_total (numeric)
metodo_pago ('Efectivo' | 'Transferencia' | 'Tarjeta')
fecha_cierre (timestamptz, nullable)
```

### `turnos`
```sql
id (uuid, PK)
estado ('abierto' | 'cerrado')
monto_inicial (numeric)
monto_sistema (numeric)
monto_declarado (numeric, nullable)
fecha_apertura (timestamptz)
fecha_cierre (timestamptz, nullable)
```

### Otras
- `tamaños_vehiculos`, `servicios`, `precios_base`
- `lavadores`, `cajones`
- `clientes`, `vehiculos`
- `promociones`

---

## 7. Páginas Principales

### `/pos` — Punto de Venta
1. Formulario: tamaño + servicios + placa + pago
2. Calcula total en tiempo real
3. Clickea "Crear Orden"
4. Server Action valida
5. INSERT `ordenes_servicio` estado='Recepción'
6. Aparece en Kanban

### `/operations` — Kanban
1. Órdenes agrupadas por estado
2. Mover orden → Server Action → UPDATE estado
3. Clickea orden → Modal: asignar lavador + cajón
4. Mover a "Entregado" → `fecha_cierre` se llena

### `/dashboard` — Stats + Corte
1. Calcula: órdenes hoy, ingresos, pendientes
2. Clickea "Cerrar Turno"
3. `<CorteModal>`:
   - `monto_sistema` (suma Efectivo de hoy)
   - Input `monto_declarado`
   - Diferencia = declarado - sistema
   - "Descargar CSV" → genera + descarga
   - "Finalizar" → Server Action → UPDATE turnos

### `/reports` — Reportes (Admin/Supervisor)
1. Carga órdenes del mes
2. Filtros: rango de fechas
3. Calcula stats
4. Exportar CSV

### `/users` — Usuarios (Admin)
1. Tabla: email, nombre, rol, activo
2. Cambiar rol, desactivar, crear usuario

### `/members` — Clientes
1. Tabla: nombre, teléfono, órdenes
2. Crear cliente, agregar vehículo, marcar miembro

### `/resources` — Recursos (Supervisor+)
1. **Cajones**: crear, eliminar, asignar lavador default
2. **Lavadores**: crear, desactivar

### `/settings` — Configuración (Admin)
1. Tamaños: crear, ocultar, actualizar precio
2. Servicios: crear, ocultar, actualizar precio
3. % aumentar todos precios

### `/profile` — Mi Perfil
1. Ver nombre, email, rol
2. Cambiar nombre, contraseña

---

## 8. Server Actions (app/actions.ts)

**Solo admin/supervisor** pueden llamar:

### `updateOrderStatusAction(orderId, newStatus)`
- Valida rol
- UPDATE `ordenes_servicio.estado`
- Si newStatus = 'Entregado', llena `fecha_cierre`

### `cerrarTurnoAction(turnoId, montoDeclarado, montoSistema)`
- Valida rol
- UPDATE `turnos`: estado='cerrado', fecha_cierre, monto_declarado, diferencia

### `assignWasherAction(orderId, washerId, bayNumber)`
- Valida rol
- UPDATE `ordenes_servicio.lavador_id`, `cajon_id`

---

## 9. Componentes Reutilizables

### `<ConfirmModal>`
Modal genérico confirmación.

### `<CorteModal>`
Modal cerrar turno + CSV.

### `<AuthGuard>`
Wrapper protección por rol.

### UI Components
`<Button>`, `<Input>`, `<Card>`, `<Badge>`, `<Heading>`

---

## 10. Servicios

### `turnosService.ts`
- `abrirTurno()`, `cerrarTurno()`, `getTurnoActivo()`
- `generarCSVCorte()`, `generarCSVReporte()`, `descargarCSV()`

### `errorHandler.ts`
- `validateRequired()`, `validateNumberRange()`, `validateMoney()`
- `handleError()`: mapea errores a mensajes legibles

---

## 11. Hooks

### `useAuth()`
```typescript
const { user, profile, loading, signOut, getRole } = useAuth();
```

### `useConfig()`
```typescript
const { orders, washers, bays, addOrder, updateOrderStatus } = useConfig();
```

### `useTheme()`
```typescript
const { theme, setTheme } = useTheme();
```

---

## 12. Convenciones

### Nombres
- Tablas: `snake_case` (ordenes_servicio, tamaños_vehiculos)
- Columnas: `snake_case` (cliente_id, fecha_cierre)
- Funciones: `camelCase` (updateOrderStatus)
- Componentes: `PascalCase` (OrderCard, TopBar)

### Estado
- **Local** (useState): datos temporales (inputs, modal open/close)
- **ConfigContext**: órdenes, catálogos (global)
- **AuthContext**: user, profile (global)
- **ThemeProvider**: tema (global)

### Async
- Server actions: siempre `await` + try-catch + `handleError()`
- Cliente: `toast.error()` o `toast.success()`
- NO usar `alert()`

### RLS
- Supabase valida en BD ANTES de retornar
- NO confiar en cliente
- Middleware + Server Actions validan también (defense in depth)

---

## 13. Data Flow

1. Usuario dispara acción (click, submit)
2. Si sensible → Server Action (valida auth, autorización, DB ops)
3. Si lectura → ConfigContext o direct query
4. Respuesta → setState (optimistic) + toast (feedback)
5. Revalidación: ConfigContext re-sincroniza si detecta cambio (refs guard)

---

## 14. Troubleshooting

| Problema | Solución |
|----------|----------|
| No logueado pero no redirige | Revisa `proxy.ts`: ¿ruta en PUBLIC_PATHS? |
| Estado no refleja en Kanban | Server action OK pero ConfigContext no re-sincronizó. Recarga (Ctrl+Shift+R) |
| CSV no descarga | ¿Orders vacío? Revisa fetch en `turnosService.ts` |
| Rol cambió pero permisos iguales | AuthContext cachea perfil. Requiere logout + login |

---

## 15. Próximas Mejoras

- [ ] **Session Limits**: 1 admin, 1 supervisor, 2 cajeros en línea (heartbeat + server check)
- [ ] **Test Database**: Copia aislada de BD con datos ficticios
- [ ] **Realtime**: WebSockets para Kanban (vs polling)
- [ ] **Backup**: Daily export a Google Drive

---

## 16. Actualizar Este Doc

Cada vez que:
- Agregues página nueva
- Cambies flujo existente
- Agregues tabla/columna a BD
- Crees contexto/hook nuevo

**Actualiza sección relevante** y haz commit junto con los cambios de código.
