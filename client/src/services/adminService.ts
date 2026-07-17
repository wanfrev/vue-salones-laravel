import { db } from '../lib/api'

export interface EmployeeInput {
  full_name: string
  email: string
  password?: string
  phone?: string | null
  job_title?: string | null
  pay_type?: string
  pay_percentage?: number
  base_salary?: number
  salary_frequency?: string
  disable_agenda?: boolean
  can_create_appointments?: boolean
  can_create_clients?: boolean
  schedules?: Array<{
    branch_id?: string | null
    weekday: number
    start_time: string
    end_time: string
  }>
}

/** Create employee: user + profile + schedules in one call */
export const adminCreateEmployee = async (input: EmployeeInput): Promise<{ id: string }> => {
  const email = input.email.trim().toLowerCase()

  const { data, error } = await db
    .from('profiles')
    .insert({
      full_name: input.full_name,
      email,
      password: input.password,
      phone: input.phone || null,
      job_title: input.job_title || null,
      pay_type: input.pay_type || 'percentage',
      pay_percentage: input.pay_percentage ?? 50,
      base_salary: input.base_salary ?? 0,
      salary_frequency: input.salary_frequency || null,
      disable_agenda: input.disable_agenda ?? false,
      can_create_appointments: input.can_create_appointments ?? true,
      can_create_clients: input.can_create_clients ?? true,
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

/** Soft-delete employee */
export const adminDeleteEmployee = async (userId: string): Promise<void> => {
  const { error } = await db
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) throw new Error(error.message || 'No fue posible eliminar el empleado.')
}
