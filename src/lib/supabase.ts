import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase variables are missing from .env.local')
}

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
})
