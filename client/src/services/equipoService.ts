import { db } from '../lib/api'
import type { UpdateFor } from '../types/helpers'
import { adminCreateEmployee, adminUpdateEmployee, adminDeleteEmployee } from './adminService'
import { mapEmpleadoFormToProfileUpdate, mapEmpleadoFormToScheduleBlocks, mapProfileToEmpleado } from '../mappers/equipoMapper'
import type { EmployeeProfile } from '../mappers/equipoMapper'
import type { Empleado, EmpleadoFormData } from '../types/empleado'

export type EmployeeActiveFilter = 'active' | 'inactive' | 'all'

export const equipoKeys = {
  all: (businessId?: string | null, branchId?: string | null, activeFilter?: EmployeeActiveFilter) =>
    ['equipo', businessId, branchId, activeFilter ?? 'active'] as const,
}

export const listEquipo = async (
  businessId: string,
  branchId?: string | null,
  activeFilter: EmployeeActiveFilter = 'active',
): Promise<Empleado[]> => {
  let query = db
    .from('profiles')
    .select('*, employee_schedules(*)')
    .eq('business_id', businessId)
    .in('role', ['empleado', 'encargado', 'cajero'])
    .order('full_name')

  if (activeFilter !== 'active') {
    // Backend interprets this literally ('inactive' | 'all') — see ProfileService::list().
    query = query.eq('active', activeFilter)
  }

  const { data, error } = await query

  if (error) throw error

  let profiles = (data as EmployeeProfile[])

  if (branchId) {
    profiles = profiles.filter(p =>
      p.branch_id === branchId ||
      p.employee_schedules?.some(s => s.branch_id === branchId)
    )
  }

  return profiles.map(profile => mapProfileToEmpleado(profile))
}

export const saveEmpleado = async (
  data: EmpleadoFormData & { id?: string },
  _businessId?: string,
  branchId?: string | null
): Promise<void> => {
  const scheduleBlocks = mapEmpleadoFormToScheduleBlocks(
    data.id || 'temp_id',
    { ...data, branchId },
  ).map(({ employee_id: _eid, ...rest }) => rest) // remove employee_id, Laravel sets it

  if (!data.id) {
    // CREATE — user + profile + schedules in one call
    const profileUpdate = mapEmpleadoFormToProfileUpdate(data)

    await adminCreateEmployee({
      full_name: profileUpdate.full_name,
      email: data.email,
      password: data.password,
      phone: profileUpdate.phone || undefined,
      job_title: profileUpdate.job_title || undefined,
      role: profileUpdate.role,
      pay_type: profileUpdate.pay_type,
      pay_percentage: profileUpdate.pay_percentage,
      base_salary: profileUpdate.base_salary,
      salary_frequency: profileUpdate.salary_frequency || undefined,
      disable_agenda: data.systemRole === 'cajero' ? true : data.disableAgenda,
      disable_inventory_edit: data.systemRole === 'cajero' ? true : data.disableInventoryEdit,
      can_create_appointments: data.systemRole !== 'cajero' ? data.canCreateAppointments : false,
      can_create_clients: data.systemRole !== 'cajero' ? data.canCreateClients : false,
      can_access_consultorio: data.systemRole !== 'cajero' ? data.canAccessConsultorio : false,
      can_access_inventory: profileUpdate.can_access_inventory,
      can_access_pos: profileUpdate.can_access_pos,
      can_access_suppliers: profileUpdate.can_access_suppliers,
      can_access_finanzas: profileUpdate.can_access_finanzas,
      can_access_requirements: profileUpdate.can_access_requirements,
      can_add_purchase_invoice: profileUpdate.can_add_purchase_invoice,
      staffing_assignments: profileUpdate.staffing_assignments,
      staffing_tax_rate: profileUpdate.staffing_tax_rate,
      address: profileUpdate.address,
      bank_name: profileUpdate.bank_name,
      bank_account_holder: profileUpdate.bank_account_holder,
      bank_account_type: profileUpdate.bank_account_type,
      payment_method: profileUpdate.payment_method,
      bank_routing_number: data.bankRoutingNumber?.trim() || null,
      bank_account_number: data.bankAccountNumber?.trim() || null,
      payroll_card_number: data.payrollCardNumber?.trim() || null,
      ssn: data.ssn?.trim() || null,
      branch_id: branchId ?? null,
      schedules: scheduleBlocks,
    })
    return
  }

  // UPDATE — profile + schedules + optionally email/password
  const profileUpdate = mapEmpleadoFormToProfileUpdate(data)

  await adminUpdateEmployee(data.id, {
    ...(data.email ? { email: data.email } : {}),
    ...(data.password ? { password: data.password } : {}),
    ...profileUpdate,
    // Write-only: only sent when the admin actually typed a new value, so re-saving the
    // employee for an unrelated change (e.g. phone number) never clobbers what's on file.
    ...(data.bankRoutingNumber?.trim() ? { bank_routing_number: data.bankRoutingNumber.trim() } : {}),
    ...(data.bankAccountNumber?.trim() ? { bank_account_number: data.bankAccountNumber.trim() } : {}),
    ...(data.payrollCardNumber?.trim() ? { payroll_card_number: data.payrollCardNumber.trim() } : {}),
    ...(data.ssn?.trim() ? { ssn: data.ssn.trim() } : {}),
    can_create_appointments: data.systemRole !== 'cajero' ? data.canCreateAppointments : false,
    can_create_clients: data.systemRole !== 'cajero' ? data.canCreateClients : false,
    can_access_consultorio: data.systemRole !== 'cajero' ? data.canAccessConsultorio : false,
    branch_id: branchId ?? null,
    schedules: scheduleBlocks,
  })
}

export async function addBusinessArrayField(businessId: string, column: string, value: string): Promise<string[]> {
  const { data: biz, error: fetchError } = await db
    .from('businesses')
    .select(column)
    .eq('id', businessId)
    .single()

  if (fetchError) throw fetchError

  const current: string[] = (biz?.[column] ?? []) as string[]
  if (current.includes(value)) return current

  const updated = [...current, value]

  const { error } = await db
    .from('businesses')
    .update({ [column]: updated } satisfies Partial<UpdateFor<'businesses'>>)
    .eq('id', businessId)

  if (error) throw error
  return updated
}

export const addBusinessCategory = (businessId: string, category: string): Promise<string[]> =>
  addBusinessArrayField(businessId, 'service_categories', category)

export async function addBranchArrayField(branchId: string, column: string, value: string): Promise<string[]> {
  const { data: branch, error: fetchError } = await db
    .from('branches')
    .select(column)
    .eq('id', branchId)
    .single()

  if (fetchError) throw fetchError

  const current: string[] = (branch?.[column] ?? []) as string[]
  if (current.includes(value)) return current

  const updated = [...current, value]

  const { error } = await db
    .from('branches')
    .update({ [column]: updated } satisfies Partial<UpdateFor<'branches'>>)
    .eq('id', branchId)

  if (error) throw error
  return updated
}

export const addBranchCategory = (branchId: string, category: string): Promise<string[]> =>
  addBranchArrayField(branchId, 'service_categories', category)

export const addBusinessJobTitle = (businessId: string, title: string): Promise<string[]> =>
  addBusinessArrayField(businessId, 'job_titles', title)

export const deleteEmpleado = async (profileId: string): Promise<void> => {
  await adminDeleteEmployee(profileId)
}
