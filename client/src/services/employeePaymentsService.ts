import { apiRequest } from '../lib/api'

export const employeePaymentKeys = {
  all: (businessId?: string | null) => ['employee-payments', businessId] as const,
}

export type EmployeePaymentRecord = {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  currency: 'USD' | 'VES'
  originalAmount: number
  exchangeRateUsed: number
  paymentMethod: string
  type: string
  concept: string | null
  notes: string | null
  paymentDate: string
}

export type EmployeeBalance = {
  commission: number
  tips: number
  base_salary: number
  total_earned: number
  total_paid: number
  total_consumed: number
  pending: number
  pay_type?: string | null
  pay_percentage?: number
  employee_ves_rate?: number
  /** Bs totals computed with each service's own exchange rate (locked to the day it was sold). */
  commission_bs?: number
  tips_bs?: number
  total_earned_bs?: number
  pending_bs_estimated?: number
  /** Tips received, split by the currency they were actually paid in. */
  tips_usd?: number
  tips_ves?: number
  tips_unspecified?: number
  /**
   * Service commission split by the currency the client actually paid in (per-transaction
   * majority currency; an exact 50/50 mixed payment splits that transaction's commission in
   * half). Only present when `payroll_currency_breakdown_enabled` is on.
   */
  commission_usd_actual?: number
  commission_ves_actual_bs?: number
  commission_unspecified_actual?: number
}

export const listEmployeePayments = async (
  businessId: string,
  startDate?: string,
  endDate?: string,
  branchId?: string | null,
  employeeId?: string | null,
): Promise<EmployeePaymentRecord[]> => {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (branchId) params.set('branch_id', branchId)
  if (employeeId) params.set('employee_id', employeeId)
  return await apiRequest<EmployeePaymentRecord[]>('GET', `/employee-payments?${params.toString()}`)
}

export const createEmployeePayment = async (
  businessId: string,
  data: {
    employee_id: string
    amount: number
    currency: string
    original_amount?: number
    exchange_rate_used?: number
    payment_method: string
    type: string
    concept?: string
    notes?: string
    payment_date: string
    branch_id?: string | null
  },
): Promise<EmployeePaymentRecord> => {
  return await apiRequest<EmployeePaymentRecord>('POST', '/employee-payments', data)
}

export const createEmployeeConsumption = async (
  businessId: string,
  data: {
    employee_id: string
    amount: number
    currency: string
    concept: string
    notes?: string
    payment_date: string
    branch_id?: string | null
    product_id?: string | null
    quantity?: number | null
  },
): Promise<EmployeePaymentRecord> => {
  return await createEmployeePayment(businessId, {
    ...data,
    type: 'consumption',
    payment_method: 'other',
  })
}

export const updateEmployeePayment = async (
  id: string,
  data: { amount?: number; currency?: string; original_amount?: number; exchange_rate_used?: number; payment_method?: string; payment_date?: string; notes?: string },
): Promise<EmployeePaymentRecord> => {
  return await apiRequest<EmployeePaymentRecord>('PUT', `/employee-payments/${id}`, data)
}

export const deleteEmployeePayment = async (id: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/employee-payments/${id}`)
}

export const getCommissions = async (
  businessId: string,
  startDate?: string,
  endDate?: string,
  branchId?: string | null,
): Promise<any[]> => {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (branchId) params.set('branch_id', branchId)
  return await apiRequest<any[]>('GET', `/employee-commissions?${params.toString()}`)
}

export const getEmployeeDebt = async (
  businessId: string,
  startDate?: string,
  endDate?: string,
  branchId?: string | null,
): Promise<any[]> => {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  if (branchId) params.set('branch_id', branchId)
  return await apiRequest<any[]>('GET', `/employee-debt?${params.toString()}`)
}

export const getEmployeeBalance = async (
  businessId: string,
  employeeId: string,
  branchId?: string | null,
  startDate?: string,
  endDate?: string,
): Promise<EmployeeBalance> => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  return await apiRequest<EmployeeBalance>('GET', `/employee-balance/${employeeId}?${params.toString()}`)
}

export const listSchedules = async (businessId: string): Promise<any[]> => {
  return await apiRequest<any[]>('GET', `/employee-schedules`)
}

export const createSchedule = async (data: { employee_id: string; branch_id?: string | null; weekday: number; start_time: string; end_time: string }): Promise<any> => {
  return await apiRequest<any>('POST', '/employee-schedules', data)
}

export const deleteSchedule = async (id: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/employee-schedules/${id}`)
}
