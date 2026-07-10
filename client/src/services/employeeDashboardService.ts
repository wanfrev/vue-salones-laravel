export const dashboardKeys = {
  appointments: (employeeId?: string | null) => ['employee-appointments', employeeId] as const,
  earnings: (employeeId?: string | null, start?: string, end?: string) => ['employee-earnings', employeeId, start, end] as const,
  history: (employeeId?: string | null) => ['employee-history', employeeId] as const,
  payments: (employeeId?: string | null) => ['employee-payment-history', employeeId] as const,
}

export type EmployeeAppointmentRecord = {
  id: string
  date: string
  client: string
  service: string
  amount: number
  status: string
}

export type EmployeeEarningRecord = {
  id: string
  date: string
  client: string
  service: string
  amount: number
  percentage: number
  earnings: number
  tipAmount: number
}

export type EmployeePaymentHistoryRecord = {
  id: string
  paymentDate: string
  amount: number
  method: string
  type: string
  concept: string
}

export const listEmployeeAppointments = async (_employeeId: string) => {
  return [] as EmployeeAppointmentRecord[]
}

export const listEmployeeEarnings = async (_employeeId: string, _start?: string, _end?: string) => {
  return [] as EmployeeEarningRecord[]
}

export const listEmployeePaymentHistory = async (_employeeId: string) => {
  return [] as EmployeePaymentHistoryRecord[]
}

export const listEmployeeTransactions = async (_businessId: string, _employeeId: string, _branchId?: string | null) => {
  return [] as EmployeeEarningRecord[]
}

export const listEmployeePayments = async (_businessId: string, _employeeId: string, _branchId?: string | null) => {
  return [] as EmployeePaymentHistoryRecord[]
}
