import { createBrowserClient } from '@supabase/ssr'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase variables are missing from .env.local')
}

// Cota máxima de vida de la cookie de sesión (segundos). Por defecto
// @supabase/ssr fija maxAge = 400 días e IGNORA cualquier maxAge que se pase por
// `cookieOptions`, así que la única forma de acortarla es interceptar la escritura
// con un handler `cookies` propio (abajo). Se alinea con la ventana de inactividad
// de 1 h de AuthContext.tsx: así, si el navegador se cierra y se reabre pasada 1 h,
// la cookie ya expiró. La expiración por inactividad la fuerza AuthContext por
// reloj de pared; esto solo evita que el refresh token viva 400 días en disco.
const SESSION_MAX_AGE_SECONDS = 60 * 60

// In development, React Strict Mode mounts/unmounts providers twice, which can
// orphan a navigator.locks lock and hang every subsequent auth refresh.
// noOpLock bypasses the lock to prevent that. In production the default lock
// MUST be active: without it, two concurrent refresh calls each consume the
// same refresh_token — the second call's Promise never resolves, hanging all
// Supabase queries until the 10-second timeout fires.
const noOpLock = async <T,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => fn()

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(process.env.NODE_ENV === 'development' ? { lock: noOpLock as any } : {}),
    // The invite flow manually handles tokens in the URL hash in
    // src/app/(auth)/login/page.tsx. Auto-detection would race with
    // that logic, consume the tokens, and clear the hash before the
    // login useEffect reads it — leaving the page stuck on a spinner.
    detectSessionInUrl: false,
  },
  // Handler de cookies del navegador. Replica el comportamiento por defecto de
  // @supabase/ssr (parse/serialize sobre document.cookie), pero ACOTA maxAge para
  // que la cookie de auth no persista 400 días. Se preserva la semántica de
  // borrado (value vacío o maxAge 0) para no romper el logout ni la limpieza de
  // chunks obsoletos que hace el SDK.
  cookies: {
    getAll() {
      // Durante SSR / prerender (next build) no existe `document`. El handler por
      // defecto de @supabase/ssr también hace no-op fuera del navegador; sin este
      // guard, __loadSession explota con "document is not defined".
      if (typeof document === 'undefined') return []
      const parsed = parseCookie(document.cookie)
      return Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? '' }))
    },
    setAll(cookiesToSet) {
      if (typeof document === 'undefined') return
      for (const { name, value, options } of cookiesToSet) {
        const isRemoval = value === '' || options?.maxAge === 0
        const finalOptions = isRemoval
          ? options
          : {
              ...options,
              maxAge: Math.min(options?.maxAge ?? SESSION_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS),
              // Si el SDK trae un `expires` largo, lo descartamos: maxAge manda.
              expires: undefined,
            }
        document.cookie = serializeCookie(name, value, finalOptions)
      }
    },
  },
})
