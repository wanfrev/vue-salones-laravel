import { db, apiRequest } from '../lib/api'
import type { ApiUser } from '../lib/api'
import type { Business } from '../types/database'
import type { AuthProfile } from '../types/auth'

export type ImpersonateResult = {
  access_token: string
  token_type: string
  expires_at: string
  user: ApiUser
  business: Business | null
}

export type SuperadminAuditLogEntry = {
  id: string
  actor_id: string
  action: string
  business_id: string | null
  target_profile_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor?: { id: string; full_name: string; email: string | null } | null
  business?: { id: string; name: string } | null
}

export type CreateBusinessInput = {
  businessName: string
  ownerEmail: string
  ownerPassword: string
  nicheType?: string
}

export type CreateBusinessResult = {
  business: Business
  invitedUserId: string
}

export type SuperadminAccount = {
  id: string
  full_name: string
  email: string | null
  active: boolean
  created_at: string
}

export type CreateSuperadminInput = {
  fullName: string
  email: string
  password: string
}

export const superadminKeys = {
  businesses: () => ['superadmin', 'businesses'] as const,
  businessAdmins: (businessId: string) => ['superadmin', 'business-admins', businessId] as const,
  globalAuditLogs: (action?: string | null) => ['superadmin', 'audit-logs', action ?? 'all'] as const,
  superadmins: () => ['superadmin', 'accounts'] as const,
}

// ── READ ──

export const listBusinesses = async (): Promise<Business[]> => {
  const { data, error } = await db
    .from('admin/businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Error al listar negocios')
  return (data ?? []) as Business[]
}

export const listBusinessAdmins = async (businessId: string): Promise<AuthProfile[]> => {
  return apiRequest<AuthProfile[]>('GET', `/admin/businesses/${businessId}/admins`)
}

// ── WRITE ──

export const createBusinessWithOwner = async (input: CreateBusinessInput): Promise<CreateBusinessResult> => {
  const email = input.ownerEmail.trim().toLowerCase()

  const { data: existingProfile } = await db
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    throw new Error('Ya existe un usuario registrado con este correo electrónico.')
  }

  const result = await apiRequest<CreateBusinessResult>('POST', '/admin/businesses', {
    name: input.businessName.trim(),
    ownerEmail: email,
    ownerPassword: input.ownerPassword,
    nicheType: input.nicheType?.trim() || null,
  })

  if (!result?.business) {
    throw new Error('No fue posible crear el negocio.')
  }

  return result
}

export type UpdateBusinessInput = {
  business_id: string
  name?: string
  phone?: string | null
  address?: string | null
  timezone?: string
  currency?: string
  niche_type?: string
  active?: boolean
  ves_exchange_rate?: number
  multi_branch_enabled?: boolean
  features?: Record<string, boolean>
}

export const updateBusiness = async (input: UpdateBusinessInput): Promise<Business> => {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.phone !== undefined) payload.phone = input.phone
  if (input.address !== undefined) payload.address = input.address
  if (input.timezone !== undefined) payload.timezone = input.timezone
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.niche_type !== undefined) payload.niche_type = input.niche_type
  if (input.active !== undefined) payload.active = input.active
  if (input.ves_exchange_rate !== undefined) payload.ves_exchange_rate = input.ves_exchange_rate
  if (input.multi_branch_enabled !== undefined) payload.multi_branch_enabled = input.multi_branch_enabled
  if (input.features !== undefined) payload.features = input.features

  return apiRequest<Business>('PUT', `/admin/businesses/${input.business_id}`, payload)
}

export const deleteBusiness = async (businessId: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/admin/businesses/${businessId}`)
}

/**
 * Sets a new password for a business admin. Write-only by nature — passwords are stored
 * one-way hashed (bcrypt), so there is no counterpart function to read one back.
 * Revokes the target's active sessions server-side, forcing them to log in again.
 */
export const resetBusinessAdminPassword = async (
  businessId: string,
  profileId: string,
  newPassword: string,
): Promise<void> => {
  await apiRequest('PUT', `/admin/businesses/${businessId}/admins/${profileId}/password`, {
    password: newPassword,
  })
}

/**
 * Requests a short-lived token to browse the app as this business admin. Does not touch
 * the admin's password or revoke their own sessions — see useImpersonation.ts for the
 * token-swap + audit-visible "volver a superadmin" flow built on top of this call.
 */
export const impersonateBusinessAdmin = async (
  businessId: string,
  profileId: string,
): Promise<ImpersonateResult> => {
  return apiRequest<ImpersonateResult>('POST', `/admin/businesses/${businessId}/admins/${profileId}/impersonate`)
}

export const listAuditLogs = async (businessId: string): Promise<SuperadminAuditLogEntry[]> => {
  return apiRequest<SuperadminAuditLogEntry[]>('GET', `/admin/businesses/${businessId}/audit-logs`)
}

/** Every superadmin action across every business — backs the standalone "Auditoría" page. */
export const listGlobalAuditLogs = async (action?: string | null): Promise<SuperadminAuditLogEntry[]> => {
  const params = new URLSearchParams()
  if (action) params.set('action', action)
  const qs = params.toString()
  return apiRequest<SuperadminAuditLogEntry[]>('GET', `/admin/audit-logs${qs ? `?${qs}` : ''}`)
}

// ── Shared with both the per-business "Actividad reciente" panel and the global Auditoría page ──

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_business: 'Negocio creado',
  update_business: 'Negocio actualizado',
  delete_business: 'Negocio eliminado',
  suspend_business: 'Negocio suspendido',
  resume_business: 'Negocio reactivado',
  reset_admin_password: 'Contraseña restablecida',
  impersonate_admin: 'Sesión de soporte iniciada',
  create_superadmin: 'Superadmin creado',
  revoke_superadmin: 'Superadmin revocado',
  restore_superadmin: 'Superadmin restaurado',
}

export function describeAuditAction(log: SuperadminAuditLogEntry): string {
  return AUDIT_ACTION_LABELS[log.action] ?? log.action
}

const FIELD_LABELS: Record<string, string> = {
  active: 'Activo',
  name: 'Nombre',
  niche_type: 'Nicho',
  timezone: 'Zona horaria',
  currency: 'Moneda',
  ves_exchange_rate: 'Tasa VES',
  multi_branch_enabled: 'Multi-sucursal',
  phone: 'Teléfono',
  address: 'Dirección',
}

/** "Nombre: A → B, Activo: true → false" — the one-line summary of an update_business diff. */
export function describeAuditChanges(log: SuperadminAuditLogEntry): string | null {
  const changes = log.metadata?.changes as Record<string, unknown> | undefined
  if (!changes) return null

  const parts: string[] = []
  for (const [field, value] of Object.entries(changes)) {
    if (field === 'features') {
      const featureChanges = value as Record<string, [unknown, unknown]>
      for (const [feature, [wasOn, isOn]] of Object.entries(featureChanges)) {
        parts.push(`${feature}: ${wasOn ? 'activo' : 'inactivo'} → ${isOn ? 'activo' : 'inactivo'}`)
      }
      continue
    }
    const [before, after] = value as [unknown, unknown]
    const label = FIELD_LABELS[field] ?? field
    parts.push(`${label}: ${formatAuditValue(before)} → ${formatAuditValue(after)}`)
  }
  return parts.join(', ')
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

export const suspendBusiness = async (businessId: string): Promise<void> => {
  await apiRequest('POST', `/admin/businesses/${businessId}/suspend`)
}

export const resumeBusiness = async (businessId: string): Promise<void> => {
  await apiRequest('POST', `/admin/businesses/${businessId}/resume`)
}

// ── Superadmin account management ──

export const listSuperadmins = async (): Promise<SuperadminAccount[]> => {
  return apiRequest<SuperadminAccount[]>('GET', '/admin/superadmins')
}

export const createSuperadmin = async (input: CreateSuperadminInput): Promise<SuperadminAccount> => {
  return apiRequest<SuperadminAccount>('POST', '/admin/superadmins', {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  })
}

export const revokeSuperadmin = async (id: string): Promise<void> => {
  await apiRequest('POST', `/admin/superadmins/${id}/revoke`)
}

export const restoreSuperadmin = async (id: string): Promise<void> => {
  await apiRequest('POST', `/admin/superadmins/${id}/restore`)
}

// ── Features matrix ──

export type FeatureMatrixBusiness = {
  id: string
  name: string
  active: boolean
  features: Record<string, boolean>
}

export type FeatureMatrixNiche = {
  niche: string
  features: string[]
  businesses: FeatureMatrixBusiness[]
}

export const getFeaturesMatrix = async (): Promise<FeatureMatrixNiche[]> => {
  return apiRequest<FeatureMatrixNiche[]>('GET', '/admin/features-matrix')
}
