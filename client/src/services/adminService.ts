import { db } from '../lib/api'

export interface EmployeeInput {
  full_name: string
  // Blank for staffing workers, who have no login — see adminCreateEmployee, which sends null
  // rather than '' so Laravel's `nullable|email` rule actually treats it as absent.
  email: string
  password?: string
  phone?: string | null
  job_title?: string | null
  role?: string
  pay_type?: string
  pay_percentage?: number
  base_salary?: number
  salary_frequency?: string
  product_commission_percentage?: number
  disable_agenda?: boolean
  disable_inventory_edit?: boolean
  can_create_appointments?: boolean
  can_create_clients?: boolean
  can_access_consultorio?: boolean
  can_access_inventory?: boolean
  can_access_pos?: boolean
  can_access_suppliers?: boolean
  can_access_finanzas?: boolean
  can_access_requirements?: boolean
  can_add_purchase_invoice?: boolean
  active?: boolean
  /** A staffing worker can be assigned to more than one client company at once, each with its own role. */
  staffing_assignments?: { company_id: string; role: string }[]
  staffing_tax_rate?: number | null
  address?: string | null
  bank_name?: string | null
  bank_account_holder?: string | null
  bank_account_type?: string | null
  payment_method?: string | null
  /** Write-only — omit the key entirely to leave what's on file unchanged (see saveEmpleado). */
  bank_routing_number?: string | null
  bank_account_number?: string | null
  payroll_card_number?: string | null
  ssn?: string | null
  schedules?: Array<{
    branch_id?: string | null
    weekday: number
    start_time: string
    end_time: string
  }>
}

/** Create employee: user + profile + schedules in one call */
export const adminCreateEmployee = async (input: EmployeeInput): Promise<{ id: string }> => {
  const trimmedEmail = input.email.trim()
  const email = trimmedEmail ? trimmedEmail.toLowerCase() : null

  const { data, error } = await db
    .from('profiles')
    .insert({
      full_name: input.full_name,
      email,
      password: input.password || null,
      phone: input.phone || null,
      job_title: input.job_title || null,
      role: input.role ?? 'empleado',
      pay_type: input.pay_type || 'percentage',
      pay_percentage: input.pay_percentage ?? 50,
      base_salary: input.base_salary ?? 0,
      salary_frequency: input.salary_frequency || null,
      product_commission_percentage: input.product_commission_percentage ?? 0,
      disable_agenda: input.disable_agenda ?? false,
      disable_inventory_edit: input.disable_inventory_edit ?? false,
      can_create_appointments: input.can_create_appointments ?? true,
      can_create_clients: input.can_create_clients ?? true,
      can_access_consultorio: input.can_access_consultorio ?? true,
      can_access_inventory: input.can_access_inventory ?? false,
      can_access_pos: input.can_access_pos ?? false,
      can_access_suppliers: input.can_access_suppliers ?? false,
      can_access_finanzas: input.can_access_finanzas ?? false,
      can_access_requirements: input.can_access_requirements ?? false,
      can_add_purchase_invoice: input.can_add_purchase_invoice ?? false,
      staffing_assignments: input.staffing_assignments ?? [],
      staffing_tax_rate: input.staffing_tax_rate ?? null,
      address: input.address || null,
      bank_name: input.bank_name || null,
      bank_account_holder: input.bank_account_holder || null,
      bank_account_type: input.bank_account_type || null,
      payment_method: input.payment_method || null,
      bank_routing_number: input.bank_routing_number || null,
      bank_account_number: input.bank_account_number || null,
      payroll_card_number: input.payroll_card_number || null,
      ssn: input.ssn || null,
      schedules: input.schedules || [],
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message || 'No fue posible crear el empleado.')
  return { id: (data as any).id }
}

/** Update employee + schedules */
export const adminUpdateEmployee = async (userId: string, input: Partial<EmployeeInput>): Promise<void> => {
  const { error } = await db
    .from('profiles')
    .update(input)
    .eq('id', userId)

  if (error) throw new Error(error.message || 'No fue posible actualizar el empleado.')
}

/** Deletes the employee outright when they have no real history (appointments, staffing
 *  hours, tax entries) to protect; falls back to marking them inactive when they do — see
 *  ProfileService::destroy. `deleted: false` means the fallback happened. */
export const adminDeleteEmployee = async (userId: string): Promise<{ deleted: boolean }> => {
  const { data, error } = await db
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) throw new Error(error.message || 'No fue posible eliminar el empleado.')
  return (data as { deleted: boolean } | null) ?? { deleted: true }
}
