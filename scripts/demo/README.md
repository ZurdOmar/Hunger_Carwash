# Demo para clientes potenciales — Panel Owner

Corre sobre **tu proyecto Supabase actual** (no requiere un proyecto nuevo ni pagar).
El respaldo/restauración vive **dentro de la misma base de datos** (esquema `demo_bak`):
congelas el estado, el cliente prueba, y restauras. Un **Panel Owner** in-app, visible
solo para tu cuenta super-admin (`omarml@ucol.mx`), hace todo desde `/owner`:

- **Crear demo**: email + contraseña + fecha de vigencia → cuenta admin lista.
- **Generar respaldo** / **Restaurar respaldo**: un clic (snapshot de datos en la misma BD).
- **Usuarios demo**: cambiar vigencia o eliminar (incluye los que cree el cliente).

Al vencer la vigencia, la app muestra *"Tu período de prueba ha expirado"* y bloquea
el acceso (a nivel **DB + App**). Los usuarios que cree el cliente **heredan** su fecha.

> Modelo: **mismo proyecto** (respaldo in-DB) · rol admin para el cliente · vigencia
> **por usuario** con herencia · bloqueo DB+App · todo desde el Panel Owner.

---

## Arquitectura

| Capa | Pieza |
|---|---|
| DB | `01_owner_demo.sql`: `perfiles.es_owner` + `vigencia_hasta` + `is_owner()` + `is_trial_active()` (por-usuario) + gate de escritura en `check_role()` + trigger de herencia + `demo_snapshot()`/`demo_restore()` (esquema `demo_bak`) |
| DB | `02_rls_trial_read_gate.sql`: gate de **lectura** (políticas SELECT con `AND is_trial_active()`) |
| App (servidor) | `src/lib/supabase-admin.ts` (cliente `service_role`) · `src/app/owner-actions.ts` (crear/eliminar usuarios, vigencia, snapshot, restore — todo tras `assertOwner`) |
| App (cliente) | `src/app/(protected)/owner/page.tsx` (el panel) · link en Sidebar · guard en `src/proxy.ts` (`OWNER_PATHS`) |

Todo el bloqueo de trial es **fail-open**: si `is_trial_active()`/`is_owner()` no
existen (como en producción), la app funciona igual que siempre.

---

## Puesta en marcha (3 pasos únicos, sobre tu proyecto ACTUAL)

Todo corre en el proyecto y el deploy que ya tienes. No se crea proyecto ni instancia
nueva. Después de esto, todo es botón.

### 1. Aplicar owner + trial (SQL Editor de tu proyecto)
Ejecuta, en orden:
1. `01_owner_demo.sql`
2. `02_rls_trial_read_gate.sql`

(Ya tienes aplicado `FIX_RLS_USE_CHECK_ROLE.sql` en producción; si no, córrelo antes.)

### 2. Marcarte owner
En el SQL Editor:
```sql
update public.perfiles set es_owner = true
where id = (select id from auth.users where email = 'omarml@ucol.mx');
```

### 3. Agregar la service_role key (solo servidor)
El botón "Crear demo" da de alta usuarios con `service_role`. Es la key de tu
proyecto actual (Supabase → Settings → API → `service_role`).

- **Local** (`.env.local`):
  ```
  SUPABASE_SERVICE_ROLE_KEY=<service_role key de tu proyecto>
  ```
- **Vercel** (tu proyecto actual → Settings → Environment Variables → Production):
  ```
  SUPABASE_SERVICE_ROLE_KEY = <service_role key>   (⚠️ NO uses prefijo NEXT_PUBLIC_)
  ```
  Redeploy para que tome la variable.

> Nunca pongas la service_role key en una variable `NEXT_PUBLIC_*` ni la subas al
> repo. `.env.local` ya está gitignoreado.

---

## Uso diario (desde `/owner`)

1. Entra como owner → verás **Panel Owner** en el sidebar.
2. **Crear demo**: correo + contraseña + vigencia → se crea la cuenta admin del cliente.
3. Antes de dar acceso, pulsa **Generar respaldo** (fija el punto de restauración).
4. El cliente usa la app. Puede crear sub-usuarios; heredan su vigencia.
5. Cuando quieras, **Restaurar respaldo** vuelve los datos al punto guardado.
6. En **Usuarios demo**: cambia la vigencia o elimina cuentas (p.ej. las que creó el cliente).
7. Al vencer, el cliente ve *"Tu período de prueba ha expirado"* y no puede operar.

---

## Fallback: scripts locales (opcional)

Si prefieres respaldo/restauración por archivo (no in-DB), están `demo-snapshot.sh`,
`demo-reset.sh`, `set-trial.sh` (+ `_env.sh`, `.env.demo.example`). Ver comentarios
en cada uno. Requieren la conexión **directa** `db.<ref>.supabase.co` y validan que
apuntas al demo. No son necesarios si usas el Panel Owner.

## Seguridad
- `service_role` solo en el servidor, detrás de `assertOwner()` (RPC `is_owner()`).
- `/owner` protegido en middleware (fail-closed) y en la página.
- Bloqueo de trial en DB (RLS) además de la App: no se evade desde el navegador.
- El owner (`es_owner`) nunca expira y es invisible para los demás roles.
