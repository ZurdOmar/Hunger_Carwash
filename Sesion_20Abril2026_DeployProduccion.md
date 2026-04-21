# Hunger Carwash — Sesión Técnica: 20 de Abril 2026
## Deploy a Producción y Flujo de Invitación de Usuarios

---

## 1. Contexto
El sistema Hunger Carwash (ERP/POS para autolavado) estaba desplegado en Vercel (`hunger-carwash.vercel.app`) con Supabase como backend. Al intentar invitar nuevos usuarios (cajeros) desde el Dashboard de Supabase, se presentaron múltiples errores que impedían el funcionamiento del flujo de onboarding.

**Stack**: Next.js 15 (App Router) + TypeScript + Supabase SSR + Vercel

---

## 2. Problemas Encontrados y Soluciones

### 2.1 Error: "Database error saving new user"
**Síntoma**: Al invitar un usuario desde Authentication > Users en Supabase, aparecía:
```
Failed to invite user: Database error saving new user
```

**Causa raíz**: El trigger `trigger_validate_cajeros_limit` en la tabla `public.perfiles` invocaba la función `validate_cajeros_limit()`, la cual referenciaba la tabla `perfiles` **sin el prefijo de esquema `public.`**. Cuando el servicio de autenticación de Supabase (`auth`) ejecutaba el trigger, no encontraba la tabla porque buscaba en el esquema `auth` en lugar de `public`.

**Cadena de error**:
1. Se invita al usuario → se crea registro en `auth.users`
2. Trigger `on_auth_user_created` → ejecuta `handle_new_user()`
3. `handle_new_user()` → INSERT en `public.perfiles`
4. Trigger `trigger_validate_cajeros_limit` → ejecuta `validate_cajeros_limit()`
5. `validate_cajeros_limit()` → `SELECT COUNT(*) FROM perfiles` ← **FALLA** (debería decir `public.perfiles`)

**Solución**: Se corrigieron ambas funciones añadiendo el prefijo `public.`:

```sql
-- Función 1: Validación de límite de cajeros
CREATE OR REPLACE FUNCTION public.validate_cajeros_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cajeros_count INT;
BEGIN
  IF (NEW.role = 'cajero' AND NEW.activo = true) THEN
    SELECT COUNT(*) INTO cajeros_count
    FROM public.perfiles  -- ← CORREGIDO: añadido "public."
    WHERE role = 'cajero' AND activo = true AND id != NEW.id;
    IF cajeros_count >= 2 THEN
      RAISE EXCEPTION 'Solo se permiten máximo 2 cajeros activos.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Función 2: Verificación de rol (usada por RLS)
CREATE OR REPLACE FUNCTION public.check_role(required_role TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.perfiles WHERE id = auth.uid()) = required_role;
  -- ← CORREGIDO: añadido "public."
END;
$$;
```

---

### 2.2 Error: Link de invitación apunta a localhost
**Síntoma**: El correo de invitación enviaba al usuario a `http://localhost:3000/login#access_token=...` en lugar de la URL de producción.

**Causa raíz**: El **Site URL** en Supabase estaba configurado como `http://localhost:3000`.

**Solución**: Se cambió en **Authentication > URL Configuration > Site URL** a:
```
https://hunger-carwash.vercel.app
```

---

### 2.3 Error: La página de login no maneja invitaciones
**Síntoma**: Al hacer clic en el enlace de invitación, el usuario llegaba a la pantalla de login normal pidiendo correo y contraseña, pero como era un usuario nuevo, no tenía contraseña.

**Causa raíz**: La página `src/app/(auth)/login/page.tsx` solo tenía el formulario de inicio de sesión estándar y no detectaba tokens de invitación en la URL.

**Solución**: Se reescribió la página de login con dos modos:

| Modo | Cuándo se activa | Qué muestra |
|------|------------------|-------------|
| `login` | URL sin hash fragment | Formulario estándar de correo + contraseña |
| `set-password` | URL con `#access_token=...` (invitación) | Formulario "¡Bienvenido al equipo!" con campos para crear contraseña |
| `loading` | Mientras detecta el modo | Spinner de carga |

**Flujo técnico del modo invitación**:
1. `useEffect` detecta `#access_token` en `window.location.hash`
2. El cliente Supabase auto-procesa el token del hash
3. `onAuthStateChange` dispara evento `SIGNED_IN`
4. Se verifica si es invitación nueva → muestra formulario de crear contraseña
5. Al enviar, se llama a `supabase.auth.updateUser({ password })` para establecer la contraseña
6. Redirección a `/pos`

**Archivo modificado**: `src/app/(auth)/login/page.tsx`
- 240 líneas añadidas, 66 eliminadas
- Commit: `feat: add invitation password setup flow on login page`

---

### 2.4 Deploy a rama incorrecta
**Síntoma**: El push a la rama `produccion` solo generó un deploy de Preview en Vercel, no el de producción.

**Causa raíz**: Vercel estaba configurado para desplegar producción desde la rama `main`, no `produccion`.

**Solución**: Se hizo merge de `produccion` → `main` y push a `main`.

```bash
git checkout main
git merge produccion
git push origin main
```

---

## 3. Rate Limit de Emails
Durante las pruebas se alcanzó el límite de correos de Supabase (plan Free: 3 emails/hora). Este límite no es modificable en el plan gratuito. Se debe esperar ~1 hora para poder enviar nuevas invitaciones.

---

## 4. Estado de la Base de Datos
### Tablas principales (12):
`perfiles`, `ordenes_servicio`, `turnos`, `vehiculos`, `clientes`, `cajones`, `lavadores`, `precios_base`, `servicios`, `sucursales`, `membresias`, `reglas_promocion`

### Triggers activos:
- `on_auth_user_created` → `handle_new_user()` (crea perfil automáticamente al registrar usuario)
- `trigger_validate_cajeros_limit` → `validate_cajeros_limit()` (máximo 2 cajeros activos)

### RLS: Activo en las 12 tablas
- Catálogos: lectura para todos, escritura solo admin
- Perfiles: lectura para todos, actualización solo del propio
- Operativa: acceso completo para autenticados
- Órdenes: solo admin puede borrar

---

## 5. Configuración Actual de Producción

| Componente | Valor |
|-----------|-------|
| URL de producción | `https://hunger-carwash.vercel.app` |
| Supabase Project ID | `mmarhgfumtzsmppntylh` |
| Rama de producción (Vercel) | `main` |
| Rama de desarrollo | `produccion` |
| Site URL (Supabase) | `https://hunger-carwash.vercel.app` |
| Usuario admin | `omarml@ucol.mx` (uid: `ba078f75-...`) |

---

## 6. Pendientes
- [ ] Esperar reset del rate limit y probar invitación completa
- [ ] Verificar que el perfil del usuario invitado se cree correctamente en `public.perfiles`
- [ ] Evaluar si agregar columna `sucursal_id` a `perfiles` para soporte multi-sucursal
- [ ] Considerar renombrar rama de Vercel de `main` a `produccion` para consistencia
