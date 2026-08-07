import { apiRequest, getAuthToken, setAuthToken } from '../../lib/api'
import { impersonateBusinessAdmin } from '../../services/superadminService'

/**
 * Client-side half of "Entrar como este admin". The app only ever holds one bearer token
 * (see lib/api.ts) — impersonating means swapping it for a short-lived token scoped to the
 * target admin, while stashing the superadmin's own token so it can be restored without a
 * fresh login. Both directions do a hard navigation (not a SPA route change): Pinia stores
 * and the TanStack Query cache are full of data keyed to "whoever is logged in right now",
 * and a reload is the only way to guarantee none of that leaks across the identity swap.
 */

const IMPERSONATOR_TOKEN_KEY = 'impersonator_token'
const IMPERSONATOR_LABEL_KEY = 'impersonator_label'

export function isImpersonating(): boolean {
  return !!localStorage.getItem(IMPERSONATOR_TOKEN_KEY)
}

export function getImpersonationLabel(): string | null {
  return localStorage.getItem(IMPERSONATOR_LABEL_KEY)
}

/** Drops any stashed superadmin token without restoring it — used by a full logout. */
export function clearImpersonationState(): void {
  localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATOR_LABEL_KEY)
}

export async function startImpersonation(businessId: string, profileId: string): Promise<void> {
  const currentToken = getAuthToken()
  if (!currentToken) {
    throw new Error('No hay una sesión de superadmin activa.')
  }

  const result = await impersonateBusinessAdmin(businessId, profileId)

  const adminName = result.user.profile?.full_name ?? result.user.email
  const businessName = result.business?.name ?? 'Negocio'
  localStorage.setItem(IMPERSONATOR_TOKEN_KEY, currentToken)
  localStorage.setItem(IMPERSONATOR_LABEL_KEY, `${adminName} · ${businessName}`)

  setAuthToken(result.access_token)
  window.location.href = '/'
}

export async function exitImpersonation(): Promise<void> {
  const superadminToken = localStorage.getItem(IMPERSONATOR_TOKEN_KEY)
  if (!superadminToken) return

  // Best-effort revoke of the impersonation token before switching back. Failures (already
  // expired, offline) are ignored — restoring the superadmin token below is what actually
  // ends the impersonated session on this device regardless of whether this call lands.
  try {
    await apiRequest('POST', '/auth/logout')
  } catch {
    // ignore
  }

  clearImpersonationState()
  setAuthToken(superadminToken)
  window.location.href = '/superadmin'
}
