import { apiRequest } from '../lib/api'

export const dashboardKeys = {
  appointments: (employeeId?: string | null) => ['employee-appointments', employeeId] as const,
  earnings: (businessId?: string | null, employeeId?: string | null, branchId?: string | null, start?: string, end?: string) => ['employee-earnings', businessId, employeeId, branchId, start, end] as const,
  history: (businessId?: string | null, employeeId?: string | null, branchId?: string | null) => ['employee-history', businessId, employeeId, branchId] as const,
  payments: (businessId?: string | null, employeeId?: string | null, branchId?: string | null, start?: string, end?: string) => ['employee-payment-history', businessId, employeeId, branchId, start, end] as const,
}

export type EmployeeAppointmentRecord = {
  id: string
  date: string
  time: string
  client_name: string
  service_name: string
  service_price: number
  amount: number
  percentage: number
  earnings: number
  tip_amount: number
  status: string
  payment_status: string
}

export type EmployeeEarningRecord = {
  id: string
  date: string
  clientName: string
  serviceName: string
  totalAmount: number
  currency: 'USD' | 'VES'
  exchangeRateUsed: number
  employeePercentage: number
  employeeEarnings: number
}

export type EmployeePaymentHistoryRecord = {
  id: string
  payment_date: string
  amount: number
  currency: string
  original_amount: number
  exchange_rate_used: number
  payment_method: string
  notes: string | null
  displayAmount?: string
}

export const listEmployeeAppointments = async (businessId: string, employeeId: string, branchId?: string | null) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  const qs = params.toString()
  return await apiRequest<EmployeeAppointmentRecord[]>('GET', `/employee-history/${employeeId}${qs ? `?${qs}` : ''}`)
}

export const listEmployeeEarnings = async (businessId: string, employeeId: string, branchId?: string | null, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString()
  return await apiRequest<EmployeeEarningRecord[]>('GET', `/employee-history/${employeeId}${qs ? `?${qs}` : ''}`)
}

export const listEmployeeTransactions = async (businessId: string, employeeId: string, branchId?: string | null, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString()
  const raw = await apiRequest<any[]>('GET', `/employee-history/${employeeId}${qs ? `?${qs}` : ''}`)
  return (raw ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    paidAt: r.date,
    appointmentDate: r.date,
    clientName: r.client_name ?? '—',
    serviceName: r.service_name ?? '—',
    totalAmount: Number(r.amount ?? 0),
    currency: (Number(r.exchange_rate_used ?? 1) > 1 ? 'VES' : 'USD') as 'USD' | 'VES',
    exchangeRateUsed: Number(r.exchange_rate_used ?? 1),
    employeePercentage: Number(r.percentage ?? 0),
    employeeEarnings: Number(r.earnings ?? 0),
    tipAmount: Number(r.tip_amount ?? 0),
  })) as EmployeeEarningRecord[]
}

export const listEmployeePayments = async (businessId: string, employeeId: string, branchId?: string | null, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  if (employeeId) params.set('employee_id', employeeId)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const qs = params.toString()
  return await apiRequest<EmployeePaymentHistoryRecord[]>('GET', `/employee-payments?${qs}`)
}

export const listEmployeePaymentHistory = async (employeeId: string) => {
  return [] as EmployeePaymentHistoryRecord[]
}
