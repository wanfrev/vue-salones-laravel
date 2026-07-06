import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { createMockClient } from './mock/mockClient'

const IS_MOCK = import.meta.env.VITE_USE_LOCAL_MOCK === 'true'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

const FETCH_TIMEOUT_MS = 30_000

const fetchWithTimeout: typeof fetch = (url, opts) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const incomingSignal = opts?.signal
  if (incomingSignal) {
    if (incomingSignal.aborted) {
      controller.abort()
      clearTimeout(timeoutId)
    } else {
      incomingSignal.addEventListener(
        'abort',
        () => {
          controller.abort()
          clearTimeout(timeoutId)
        },
        { once: true },
      )
    }
  }

  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

const realSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})

export const supabase = IS_MOCK ? createMockClient() : realSupabase
