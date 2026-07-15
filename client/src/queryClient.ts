import { QueryClient, QueryCache, MutationCache, keepPreviousData } from '@tanstack/vue-query'
import { setAuthToken } from './lib/api'

const isAuthError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { status?: number; code?: string; message?: string; name?: string }
  if (e.status === 401 || e.code === '401') return true
  const msg = (e.message ?? '').toLowerCase()
  return msg.includes('unauthenticated') || msg.includes('jwt expired') || msg.includes('invalid refresh token') || msg.includes('refresh token not found') || msg.includes('session expired')
}

let authErrorRedirecting = false

const handleAuthError = () => {
  if (authErrorRedirecting) return
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
      placeholderData: keepPreviousData,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
})
