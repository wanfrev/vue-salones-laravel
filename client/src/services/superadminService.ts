import { db, apiRequest } from '../lib/api'
import type { Business } from '../types/database'
import type { AuthProfile } from '../types/auth'

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

export const superadminKeys = {
  businesses: () => ['superadmin', 'businesses'] as const,
  businessAdmins: (businessId: string) => ['superadmin', 'business-admins', businessId] as const,
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

export const suspendBusiness = async (businessId: string): Promise<void> => {
  await apiRequest('POST', `/admin/businesses/${businessId}/suspend`)
}

export const resumeBusiness = async (businessId: string): Promise<void> => {
  await apiRequest('POST', `/admin/businesses/${businessId}/resume`)
}
