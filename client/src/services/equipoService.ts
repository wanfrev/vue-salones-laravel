import { api as supabase, api as mutate } from '../lib/api'
import type { UpdateFor } from '../types/helpers'
import { createAuthUser, deleteAuthUser, updateAuthUser } from './adminService'
import { mapEmpleadoFormToProfileUpdate, mapEmpleadoFormToScheduleBlocks, mapProfileToEmpleado } from '../mappers/equipoMapper'
import type { EmployeeProfile } from '../mappers/equipoMapper'
import type { Empleado, EmpleadoFormData } from '../types/empleado'

export const equipoKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['equipo', businessId, branchId] as const,
}

export const listEquipo = async (businessId: string, branchId?: string | null): Promise<Empleado[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, employee_schedules(*)')
    .eq('business_id', businessId)
    .eq('role', 'empleado')
    .order('full_name')

  if (error) throw error

  let profiles = (data as EmployeeProfile[])

  if (branchId) {
    profiles = profiles.filter(p =>
      p.employee_schedules?.some(s => s.branch_id === branchId)
    )
  }

  return profiles.map(profile => mapProfileToEmpleado(profile))
}

export const saveEmpleado = async (
  data: EmpleadoFormData & { id?: string },
  businessId?: string,
  branchId?: string | null
): Promise<void> => {
  if (!data.id) {
    const profileUpdate = mapEmpleadoFormToProfileUpdate(data)

    const { user } = await createAuthUser({
      email: data.email,
      password: data.password,
      user_metadata: {
        full_name: profileUpdate.full_name,
        business_id: businessId!,
        role: 'empleado',
        phone: profileUpdate.phone || undefined,
        job_title: profileUpdate.job_title || undefined,
        pay_type: profileUpdate.pay_type,
        pay_percentage: profileUpdate.pay_percentage,
        base_salary: profileUpdate.base_salary,
        salary_frequency: profileUpdate.salary_frequency,
      },
    })

    const scheduleBlocks = mapEmpleadoFormToScheduleBlocks(user.id, { ...data, branchId })
    const { error: scheduleError } = await mutate
      .from('employee_schedules')
      .insert(scheduleBlocks)

    if (scheduleError) throw scheduleError
    return
  }

  const { error: profileError } = await mutate
    .from('profiles')
    .update(mapEmpleadoFormToProfileUpdate(data))
    .eq('id', data.id)

  if (profileError) throw profileError

  if (data.email || data.password) {
    await updateAuthUser(data.id, { email: data.email, password: data.password || undefined })
  }

  const { error: deleteScheduleError } = await supabase
    .from('employee_schedules')
    .delete()
    .eq('employee_id', data.id)

  if (deleteScheduleError) throw deleteScheduleError

  const scheduleBlocks = mapEmpleadoFormToScheduleBlocks(data.id, { ...data, branchId })
  const { error: scheduleError } = await mutate
    .from('employee_schedules')
    .insert(scheduleBlocks)

  if (scheduleError) throw scheduleError
}

async function addBusinessArrayField(businessId: string, column: 'service_categories' | 'job_titles', value: string): Promise<string[]> {
  const { data: biz, error: fetchError } = await supabase
    .from('businesses')
    .select(column)
    .eq('id', businessId)
    .single()

  if (fetchError) throw fetchError

  const current: string[] = (biz?.[column] ?? []) as string[]
  if (current.includes(value)) return current

  const updated = [...current, value]

  const { error } = await mutate
    .from('businesses')
    .update({ [column]: updated } satisfies Partial<UpdateFor<'businesses'>>)
    .eq('id', businessId)

  if (error) throw error
  return updated
}

export const addBusinessCategory = (businessId: string, category: string): Promise<string[]> =>
  addBusinessArrayField(businessId, 'service_categories', category)

export const addBusinessJobTitle = (businessId: string, title: string): Promise<string[]> =>
  addBusinessArrayField(businessId, 'job_titles', title)

export const deleteEmpleado = async (profileId: string): Promise<void> => {
  await deleteAuthUser(profileId)
}
