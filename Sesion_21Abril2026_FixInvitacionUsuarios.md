# Hunger Carwash — Sesión Técnica: 21 de Abril 2026
## Fix Definitivo: Flujo de Invitación de Usuarios (Spinner Infinito)

---

## 1. Contexto del Problema

Después del deploy exitoso del 20 de abril, el flujo de invitación de usuarios presentaba un bug crítico:

**Síntoma**: Al abrir un enlace de invitación y presionar "Crear Contraseña", el botón se quedaba girando indefinidamente (spinner infinito). El usuario SÍ se creaba en Supabase, pero la contraseña NO se guardaba.

**Impacto**: Los nuevos usuarios invitados no podían establecer su contraseña ni acceder al sistema.

---

## 2. Rama de Respaldo

Antes de iniciar las correcciones, se creó una rama de respaldo:

```bash
git checkout -b respaldo-validacion-usuarios
git push origin respaldo-validacion-usuarios
```

**Rama**: `respaldo-validacion-usuarios`  
**Commit base**: El estado funcional antes de los cambios de esta sesión.

---

## 3. Diagnóstico Progresivo (4 intentos)

### Intento 1: `setLoading(false)` faltante
**Commit**: `3a5fca7`  
**Hipótesis**: El spinner giraba porque `setLoading(false)` no se llamaba en el path de éxito.  
**Cambio**: Añadir `setLoading(false)` antes de `setSuccess(...)`.  
**Resultado**: ❌ No resolvió el problema. El `await` de `setSession()` nunca terminaba, así que el código nunca llegaba a esa línea.

**Extras de este commit**:
- Se añadió campo "Tu nombre completo" al formulario de invitación
- Se añadió import del icono `User` de lucide-react
- Se añadió estado `fullName` para almacenar el nombre
- Se cambió la redirección de `router.push('/pos')` a `window.location.href = '/pos'`

### Intento 2: `finally` block + timeout de seguridad
**Commit**: `da0127b`  
**Hipótesis**: `setSession()` se cuelga. Usar `Promise.race` con timeout de 10s y `finally` para siempre apagar el loading.  
**Cambio**: Envolver `setSession` en `Promise.race` con timeout de 10 segundos.  
**Resultado**: ❌ Parcial. El spinner ya no giraba eternamente (se detenía a los 10s), pero mostraba error "El enlace ya fue usado o ha expirado" — porque el timeout siempre ganaba la carrera.

### Intento 3: `setSession()` en background al montar
**Commit**: `d368502`  
**Hipótesis**: Si lanzamos `setSession()` en background (fire-and-forget) al detectar los tokens, para cuando el usuario llene el formulario la sesión ya estará lista.  
**Cambio**: Mover `setSession` al `useEffect` como fire-and-forget, y en el submit verificar con `getSession()`.  
**Resultado**: ❌ No funcionó. `setSession()` NUNCA resuelve su promesa con la configuración actual del cliente (ver causa raíz abajo), así que `getSession()` siempre retornaba `null`, y el fallback `setSession` en el submit también se colgaba.

### Intento 4 (DEFINITIVO): Bypass completo del SDK
**Commit**: `633b737`  
**Hipótesis**: `supabase.auth.setSession()` está fundamentalmente roto con `createBrowserClient` + `noOpLock`. Hay que eliminar TODA dependencia de esa función.  
**Cambio**: Usar `fetch()` directo a la API REST de Supabase (`PUT /auth/v1/user`) con el `access_token` como Bearer.  
**Resultado**: ✅ FUNCIONA PERFECTAMENTE.

---

## 4. Causa Raíz

```
src/lib/supabase.ts → createBrowserClient() con:
  - auth.lock = noOpLock  (workaround para React Strict Mode)
  - auth.detectSessionInUrl = false
```

La función `supabase.auth.setSession()` del paquete `@supabase/ssr` entra en un deadlock interno cuando se usa con el `noOpLock` personalizado. La promesa que devuelve **nunca se resuelve ni se rechaza** — se queda colgada para siempre.

**¿Por qué existe el `noOpLock`?** Porque `navigator.locks` (usado por defecto por GoTrue JS) puede dejar un lock huérfano cuando React Strict Mode monta/desmonta el provider dos veces, lo cual cuelga todas las consultas de auth subsiguientes. El `noOpLock` soluciona ese problema pero rompe `setSession()`.

**¿Por qué `detectSessionInUrl: false`?** Porque la auto-detección del SDK competía con nuestra lógica manual en `useEffect`, consumía los tokens antes de que nuestro código los leyera, y dejaba la página en blanco.

---

## 5. Solución Implementada

### Arquitectura final del flujo de invitación:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LINK DE INVITACIÓN                                       │
│    Supabase /auth/v1/verify → redirect con #access_token    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. useEffect EN LOGIN PAGE                                  │
│    - Detecta #access_token en el hash                       │
│    - Extrae email del JWT (decodeJwtPayload)                │
│    - Guarda token en estado pendingInvite                   │
│    - Muestra formulario set-password                        │
│    - Limpia hash de la URL (seguridad)                      │
│    ⚠ NO llama a setSession() (está roto)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ (usuario llena formulario)
┌──────────────────────▼──────────────────────────────────────┐
│ 3. handleSetPassword (al hacer submit)                      │
│                                                             │
│  a) fetch() directo → PUT /auth/v1/user                     │
│     Headers: Authorization: Bearer <access_token>           │
│     Body: { password, data: { password_set: true } }        │
│     → Establece la contraseña en Supabase                   │
│                                                             │
│  b) supabase.auth.signInWithPassword()                      │
│     → Inicia sesión con email + contraseña recién creada    │
│     → (esta función SÍ funciona con el SDK)                 │
│                                                             │
│  c) supabase.from('perfiles').update({ full_name })         │
│     → Actualiza el nombre real del usuario                  │
│                                                             │
│  d) Redirige a /pos                                         │
└─────────────────────────────────────────────────────────────┘
```

### Código clave (handleSetPassword):

```typescript
// BYPASS DEL SDK: fetch directo a la API REST de Supabase
const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pendingInvite.accessToken}`,
    'apikey': supabaseKey,
  },
  body: JSON.stringify({
    password,
    data: { password_set: true },
  }),
})

// Después, login normal con el SDK (esto SÍ funciona)
await supabase.auth.signInWithPassword({ email, password })
```

---

## 6. Archivos Modificados

### `src/app/(auth)/login/page.tsx`
**Cambios totales**: 84 líneas añadidas, 27 eliminadas.

| Sección | Cambio |
|---------|--------|
| **Imports** | Añadido icono `User` de lucide-react |
| **Estados** | Nuevo estado `fullName` para nombre del invitado |
| **useEffect** (hash detection) | Eliminado `setSession()` fire-and-forget. Solo extrae tokens y muestra formulario. |
| **handleSetPassword** | Reescrito completamente: usa `fetch()` a REST API en vez del SDK |
| **JSX set-password** | Nuevo campo "Tu nombre completo" con icono de usuario |

---

## 7. Nuevas Funcionalidades

### Campo "Tu nombre completo" en invitación
- Aparece al abrir un enlace de invitación
- El invitado puede escribir su nombre real (ej: "Elida López")
- Al crear la contraseña, se actualiza `perfiles.full_name` en Supabase
- Si no se llena, queda como "Nuevo Usuario" (default del trigger)

### Manejo de errores robusto
- Si la API REST falla → muestra error específico del servidor
- Si el sign-in falla después de crear contraseña → muestra "Contraseña creada, inicia sesión" y cambia a modo login
- `finally` block garantiza que el spinner siempre se apaga
- `console.error` registra errores reales para debugging en DevTools

---

## 8. Configuración Necesaria en Supabase

Para que las invitaciones funcionen correctamente:

| Configuración | Valor | Ubicación |
|---------------|-------|-----------|
| **Site URL** | `https://hunger-carwash.vercel.app` | Authentication → URL Configuration |
| **Redirect URLs** | Añadir `https://hunger-carwash.vercel.app/login` | Authentication → URL Configuration |

---

## 9. Scripts de Utilidad (existentes)

| Script | Uso |
|--------|-----|
| `generar-invitacion.js` | Genera link de invitación sin enviar email |
| `resetear-password.js` | Resetea contraseña de un usuario existente |

### Ejemplo de uso:
```bash
node generar-invitacion.js "sb_secret_..." "correo@ejemplo.com"
node resetear-password.js "sb_secret_..." "correo@ejemplo.com" "NuevaClave123"
```

---

## 10. Historial de Commits

```
633b737 fix(login): bypass broken setSession SDK, use direct REST API fetch   ← DEFINITIVO ✅
d368502 fix(login): establish session in background on mount                  ← Intento 3 ❌
da0127b fix(login): add timeout safety net and finally block                  ← Intento 2 ❌
3a5fca7 fix(login): resolve infinite spinner and add full name field          ← Intento 1 ❌
```

**Rama de respaldo**: `respaldo-validacion-usuarios` (estado antes de los cambios)  
**Rama de producción**: `produccion` → mergeado a `main` → desplegado en Vercel

---

## 11. Lección Aprendida

> **`supabase.auth.setSession()` de `@supabase/ssr` con `noOpLock` NO FUNCIONA.**
> Para cualquier flujo que requiera establecer una sesión desde tokens (invitaciones, magic links, password reset), 
> usar `fetch()` directo a la API REST de Supabase en vez del SDK.
> Las funciones que SÍ funcionan del SDK: `signInWithPassword()`, `signOut()`, `getSession()`, `updateUser()` (con sesión ya establecida).
