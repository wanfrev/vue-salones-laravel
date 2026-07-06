/**
 * API client types — standalone types matching api.ts shapes.
 */
export type ApiError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

export type ApiResponse<T> = {
  data: T | null
  error: ApiError | null
}

export interface ApiSession {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_at?: number
  user: ApiUser
}

export interface ApiUser {
  id: string
  email?: string
  role?: string
  [key: string]: unknown
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY'
