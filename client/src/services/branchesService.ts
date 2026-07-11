import { api as supabase, api as mutate } from '../lib/api'
import { apiRequest } from '../lib/api'
import type { UpdateFor } from '../types/helpers'

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_default: boolean
  active: boolean
  ves_exchange_rate: number | null
  service_categories: string[]
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

    if (error) throw new Error(error.message || 'Error al guardar la sucursal')
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

    if (error) throw new Error(error.message || 'Error al guardar la sucursal')
    return created as Branch
  }
}

export const deleteBranch = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message || 'Error al eliminar la sucursal')
}

async function updateBranchCategories(branchId: string, categories: string[]): Promise<string[]> {
  const { error } = await mutate
    .from('branches')
    .update({ service_categories: categories } satisfies Partial<UpdateFor<'branches'>>)
    .eq('id', branchId)

  if (error) throw error
  return categories
}

export async function getBranchServiceCategories(branchId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('service_categories')
    .eq('id', branchId)
    .single()

  if (error) throw error
  return (data?.service_categories ?? []) as string[]
}

export async function addBranchCategory(branchId: string, category: string): Promise<string[]> {
  const current = await getBranchServiceCategories(branchId)
  if (current.includes(category)) return current
  return updateBranchCategories(branchId, [...current, category])
}

export const renameBranchCategory = async (
  businessId: string,
  branchId: string,
  fromCategory: string,
  toCategory: string
): Promise<string[]> => {
  const nextName = toCategory.trim()
  if (!fromCategory.trim() || !nextName || fromCategory === nextName) {
    return getBranchServiceCategories(branchId)
  }

  await apiRequest('POST', '/services/categories/rename', {
    data: { oldName: fromCategory, newName: nextName, branch_id: branchId },
  })

  return getBranchServiceCategories(branchId)
}

export const deleteBranchCategory = async (
  businessId: string,
  branchId: string,
  categoryToDelete: string,
  replacementCategory?: string
): Promise<string[]> => {
  const category = categoryToDelete.trim()
  const replacement = (replacementCategory ?? '').trim()

  if (!category || category === replacement) {
    return getBranchServiceCategories(branchId)
  }

  await apiRequest('DELETE', '/services/categories', {
    data: { categoryName: category, replacementCategory: replacement || null, branch_id: branchId },
  })

  return getBranchServiceCategories(branchId)
}
