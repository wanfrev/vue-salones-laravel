import { supabase } from '../lib/supabase'
import { mutate } from '../lib/typedSupabase'
import { mapServiceToServicio, mapServicioFormToServiceInsert } from '../mappers/serviciosMapper'
import type { Service } from '../types/database'
import type { UpdateFor } from '../types/helpers'
import type { Servicio, ServicioFormData } from '../types/servicio'

export const serviciosKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['servicios', businessId, branchId] as const,
}

export const listServicios = async (businessId: string, branchId?: string | null): Promise<Servicio[]> => {
  let query = supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error

  const services = (data as Service[])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  let apptsQuery = supabase
    .from('appointments')
    .select('service_id, transactions(total_amount)')
    .eq('business_id', businessId)
    .gte('start_time', monthStart.toISOString())
    .lte('start_time', monthEnd.toISOString())

  if (branchId) {
    apptsQuery = apptsQuery.eq('branch_id', branchId)
  }

  const { data: apptsData } = await apptsQuery

  const statsByService = new Map<string, { count: number; revenue: number }>()
  for (const a of (apptsData ?? []) as any[]) {
    const sid = a.service_id
    const current = statsByService.get(sid) ?? { count: 0, revenue: 0 }
    current.count++
    if (a.transactions?.length) {
      for (const tx of a.transactions) {
        current.revenue += Number(tx.total_amount ?? 0)
      }
    }
    statsByService.set(sid, current)
  }

  return services.map(service => {
    const stats = statsByService.get(service.id)
    return mapServiceToServicio(service, stats?.count ?? 0, stats?.revenue ?? 0)
  })
}

export const listActiveDbServices = async (businessId: string, branchId?: string | null): Promise<Service[]> => {
  let query = supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Service[]
}

export const saveServicio = async (
  businessId: string,
  data: ServicioFormData & { id?: string },
  branchId?: string | null
): Promise<Servicio> => {
  const payload = { ...mapServicioFormToServiceInsert(businessId, data), branch_id: branchId || null }

  const query = data.id
    ? mutate.from('services').update(payload).eq('id', data.id).select('*').single()
    : mutate.from('services').insert(payload).select('*').single()

  const { data: saved, error } = await query
  if (error) {
    console.error('[saveServicio] Error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    })
    throw error
  }

  return mapServiceToServicio(saved as Service)
}

export const deleteServicio = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('services')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar el servicio porque tiene citas asociadas.')
    }
    throw error
  }
}

async function getBusinessServiceCategories(businessId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('service_categories')
    .eq('id', businessId)
    .single()

  if (error) throw error
  return (data?.service_categories ?? []) as string[]
}

async function updateBusinessServiceCategories(businessId: string, categories: string[]): Promise<string[]> {
  const { error } = await mutate
    .from('businesses')
    .update({ service_categories: categories } satisfies Partial<UpdateFor<'businesses'>>)
    .eq('id', businessId)

  if (error) throw error
  return categories
}

export const renameBusinessCategory = async (
  businessId: string,
  fromCategory: string,
  toCategory: string
): Promise<string[]> => {
  const nextName = toCategory.trim()
  if (!fromCategory.trim() || !nextName || fromCategory === nextName) {
    return getBusinessServiceCategories(businessId)
  }

  const { error: updateServicesError } = await mutate
    .from('services')
    .update({ category: nextName })
    .eq('business_id', businessId)
    .eq('category', fromCategory)

  if (updateServicesError) throw updateServicesError

  const currentCategories = await getBusinessServiceCategories(businessId)
  const withoutOld = currentCategories.filter((cat) => cat !== fromCategory)
  const withNew = withoutOld.includes(nextName) ? withoutOld : [...withoutOld, nextName]

  return updateBusinessServiceCategories(businessId, withNew)
}

export const deleteBusinessCategory = async (
  businessId: string,
  categoryToDelete: string,
  replacementCategory: string
): Promise<string[]> => {
  const category = categoryToDelete.trim()
  const replacement = replacementCategory.trim()

  if (!category || !replacement || category === replacement) {
    return getBusinessServiceCategories(businessId)
  }

  const { error: updateServicesError } = await mutate
    .from('services')
    .update({ category: replacement })
    .eq('business_id', businessId)
    .eq('category', category)

  if (updateServicesError) throw updateServicesError

  const currentCategories = await getBusinessServiceCategories(businessId)
  const withoutDeleted = currentCategories.filter((cat) => cat !== category)
  const withReplacement = withoutDeleted.includes(replacement)
    ? withoutDeleted
    : [...withoutDeleted, replacement]

  return updateBusinessServiceCategories(businessId, withReplacement)
}
