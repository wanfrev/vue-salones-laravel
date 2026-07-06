import { api as supabase, api as mutate } from '../lib/api'
import { resolveFunctionErrorMessage } from '../lib/errors'
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

export const listBusinesses = async (): Promise<Business[]> => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as Business[]) || []
}

export const createBusinessWithOwner = async (input: CreateBusinessInput): Promise<CreateBusinessResult> => {
  const email = input.ownerEmail.trim().toLowerCase()

  // Pre-check: verify email is not already in use
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    throw new Error('Ya existe un usuario registrado con este correo electrónico.')
  }

  let invokeResult: { data: any; error: any }
  try {
    invokeResult = await mutate.functions.invoke('superadmin-invite', {
      body: {
        action: 'create',
        businessName: input.businessName.trim(),
        ownerEmail: email,
        ownerPassword: input.ownerPassword,
        nicheType: input.nicheType?.trim() || null,
      },
    })
  } catch (thrown) {
    const message = await resolveFunctionErrorMessage(thrown, 'No fue posible crear el negocio.')
    throw new Error(message)
  }

  const { data, error } = invokeResult
  if (error) {
    const message = await resolveFunctionErrorMessage(error, 'No fue posible crear el negocio.')
    throw new Error(message)
  }
  if (!data?.business || !data?.invitedUserId) {
    throw new Error('No fue posible crear el negocio.')
  }

  return data as CreateBusinessResult
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
  try {
    const { data, error } = await mutate.functions.invoke('superadmin-invite', {
      body: {
        action: 'update_business',
        ...input,
      },
    })

    if (!error && data?.business) return data.business as Business
  } catch {
    // Edge function not available, fall back to direct update
  }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.address !== undefined) patch.address = input.address
  if (input.timezone !== undefined) patch.timezone = input.timezone
  if (input.currency !== undefined) patch.currency = input.currency
  if (input.niche_type !== undefined) patch.niche_type = input.niche_type
  if (input.active !== undefined) patch.active = input.active
  if (input.ves_exchange_rate !== undefined) patch.ves_exchange_rate = input.ves_exchange_rate
  if (input.multi_branch_enabled !== undefined) patch.multi_branch_enabled = input.multi_branch_enabled
  if (input.features !== undefined) patch.features = input.features

  const { data, error } = await mutate
    .from('businesses')
    .update(patch)
    .eq('id', input.business_id)
    .select('*')
    .single()

  if (error) {
    const message = await resolveFunctionErrorMessage(error, 'No fue posible actualizar el negocio.')
    throw new Error(message)
  }
  if (!data) throw new Error('No fue posible actualizar el negocio.')

  return data as Business
}

export const deleteBusiness = async (businessId: string): Promise<void> => {
  const { data, error } = await mutate.functions.invoke('superadmin-invite', {
    body: {
      action: 'delete_business',
      business_id: businessId,
    },
  })

  if (error) {
    const message = await resolveFunctionErrorMessage(error, 'No fue posible eliminar el negocio.')
    throw new Error(message)
  }
  if (!data?.success) {
    throw new Error('No fue posible eliminar el negocio.')
  }
}

export const suspendBusiness = async (businessId: string): Promise<void> => {
  try {
    const { data, error } = await mutate.functions.invoke('superadmin-invite', {
      body: {
        action: 'suspend_business',
        business_id: businessId,
      },
    })
    if (!error && data?.success) return
  } catch {
    // Edge function not available, fall back to direct update
  }

  const { error: bizErr } = await mutate
    .from('businesses')
    .update({ active: false })
    .eq('id', businessId)

  if (bizErr) throw bizErr

  const { error: profilesErr } = await mutate
    .from('profiles')
    .update({ active: false })
    .eq('business_id', businessId)
    .neq('role', 'superadmin')

  if (profilesErr) throw profilesErr
}

export const resumeBusiness = async (businessId: string): Promise<void> => {
  try {
    const { data, error } = await mutate.functions.invoke('superadmin-invite', {
      body: {
        action: 'resume_business',
        business_id: businessId,
      },
    })
    if (!error && data?.success) return
  } catch {
    // Edge function not available, fall back to direct update
  }

  const { error: bizErr } = await mutate
    .from('businesses')
    .update({ active: true })
    .eq('id', businessId)

  if (bizErr) throw bizErr

  const { error: profilesErr } = await mutate
    .from('profiles')
    .update({ active: true })
    .eq('business_id', businessId)
    .neq('role', 'superadmin')

  if (profilesErr) throw profilesErr
}

export const listBusinessAdmins = async (businessId: string): Promise<AuthProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_id, full_name, role, phone, avatar_url')
    .eq('business_id', businessId)
    .eq('role', 'admin')
    .order('full_name')

  if (error) throw error
  return (data as AuthProfile[]) || []
}
