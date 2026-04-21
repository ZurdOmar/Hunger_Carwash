import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase variables are missing from .env.local')
}

// navigator.locks is used by gotrue-js by default and can orphan a lock when
// React Strict Mode mounts/unmounts the provider twice, which hangs any
// subsequent query waiting for an auth refresh.
const noOpLock = async <T,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => fn()

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noOpLock as any,
    // The invite flow manually handles tokens in the URL hash in
    // src/app/(auth)/login/page.tsx. Auto-detection would race with
    // that logic, consume the tokens, and clear the hash before the
    // login useEffect reads it — leaving the page stuck on a spinner.
    detectSessionInUrl: false,
  },
})
