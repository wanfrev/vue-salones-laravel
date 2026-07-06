import { api as supabase, api as mutate } from '../lib/api'

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_default: boolean
  active: boolean
  ves_exchange_rate: number | null
  created_at: string
  updated_at: string
}

export type BranchFormData = {
  name: string
  address: string
  phone: string
  isDefault: boolean
}

export const branchesKeys = {
  all: (businessId?: string | null) => ['branches', businessId] as const,
}

export const listBranches = async (businessId: string): Promise<Branch[]> => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) throw error
  return (data ?? []) as Branch[]
}

export const saveBranch = async (
  businessId: string,
  data: BranchFormData & { id?: string },
): Promise<Branch> => {
  const payload = {
    business_id: businessId,
    name: data.name.trim(),
    address: data.address.trim() || null,
    phone: data.phone.trim() || null,
    is_default: data.isDefault,
    active: true,
  }

  if (data.id) {
    if (data.isDefault) {
      await mutate
        .from('branches')
        .update({ is_default: false })
        .eq('business_id', businessId)
        .neq('id', data.id)
    }

    const { data: updated, error } = await mutate
      .from('branches')
      .update(payload)
      .eq('id', data.id)
      .select('*')
      .single()

    if (error) throw error
    return updated as Branch
  } else {
    if (data.isDefault) {
      await mutate
        .from('branches')
        .update({ is_default: false })
        .eq('business_id', businessId)
    }

    const { data: created, error } = await mutate
      .from('branches')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return created as Branch
  }
}

export const deleteBranch = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('branches')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}
