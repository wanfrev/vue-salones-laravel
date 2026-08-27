import { QueryClient, QueryCache, MutationCache } from '@tanstack/vue-query'
import { db, setAuthToken, getAuthToken } from './lib/api'

const isAuthError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { status?: number; code?: string; message?: string; name?: string }
  if (e.status === 401 || e.code === '401') return true
  const msg = (e.message ?? '').toLowerCase()
  return msg.includes('unauthenticated') || msg.includes('jwt expired') || msg.includes('invalid refresh token') || msg.includes('refresh token not found') || msg.includes('session expired')
}

let authErrorRedirecting = false
let refreshAttempt: Promise<boolean> | null = null

/**
 * A single failed request can look like an auth error for reasons that have nothing to
 * do with the session actually being gone (a slow network, a one-off race on a request
 * fired just as the token was being set). Before nuking the whole SPA with a redirect,
 * try one silent token refresh and only give up if the server explicitly rejects it —
 * a network hiccup on the refresh call itself isn't proof the session is invalid.
 * Concurrent auth errors share the same in-flight attempt instead of each firing their
 * own refresh call.
 */
const trySessionStillValid = (): Promise<boolean> => {
  if (!refreshAttempt) {
    refreshAttempt = db.auth.refreshSession()
      .then(({ error }) => !error || error.code === 'NETWORK_ERROR')
      .catch(() => true)
      .finally(() => { refreshAttempt = null })
  }
  return refreshAttempt
}

const handleAuthError = async () => {
  if (authErrorRedirecting) return
  if (!getAuthToken()) return // nothing to refresh — never logged in, or already logged out
  const stillValid = await trySessionStillValid()
  if (stillValid || authErrorRedirecting) return
  authErrorRedirecting = true
  setAuthToken(null)
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.assign('/')
  } else {
    authErrorRedirecting = false
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (isAuthError(err)) {
        handleAuthError()
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isAuthError(err)) {
        handleAuthError()
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      // No global keepPreviousData: it's a fine UX smoother for a query that just gets new
      // params for the *same* thing (Agenda's date range, Finanzas' filters — each opts into
      // it in its own composable). Applied globally it also covers queries whose key change
      // means "switch to a completely different entity" — e.g. Nómina's employees-for-company
      // query when the company dropdown changes — where showing the *previous* company's
      // roster as a placeholder under the *new* company's label is wrong, not just stale.
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
})
