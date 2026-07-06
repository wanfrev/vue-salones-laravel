import { api as supabase, api as mutate, apiRequest } from '../lib/api'
import { handleDbError } from '../lib/errors'
import type { EmployeePayment } from '../types/database'

export const employeePaymentKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['employee-payments', businessId, branchId] as const,
}

export interface EmployeePaymentRecord {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  currency: 'USD' | 'VES'
  originalAmount: number
  exchangeRateUsed?: number
  paymentMethod: string
  type: string
  concept: string | null
  notes: string | null
  paymentDate: string
}

export const listEmployeePayments = async (
  businessId: string,
  branchId?: string | null,
  startDate?: string,
  endDate?: string,
): Promise<EmployeePaymentRecord[]> => {
  let query = supabase
    .from('employee_payments')
    .select('id, employee_id, amount, payment_method, type, concept, notes, payment_date, currency, original_amount, exchange_rate_used, employee_profile:profiles!employee_payments_employee_id_fkey(full_name)')
    .eq('business_id', businessId)
    .order('payment_date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (startDate) query = query.gte('payment_date', startDate)
  if (endDate) query = query.lte('payment_date', endDate)

  const { data, error } = await query

  if (error) handleDbError(error, 'Error al cargar pagos de empleados')

  const raw = (data ?? []) as Array<
    Pick<EmployeePayment, 'id' | 'employee_id' | 'amount' | 'payment_method' | 'notes' | 'payment_date'> & {
      type?: string
      concept?: string | null
      currency?: string
      original_amount?: number
      exchange_rate_used?: number
      employee_profile?: { full_name: string } | null
    }
  >

  return raw.map(row => {
    if (row.currency && row.currency !== 'USD') {
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee_profile?.full_name ?? '—',
        amount: Number(row.amount),
        currency: row.currency as 'USD' | 'VES',
        originalAmount: Number(row.original_amount ?? 0),
        exchangeRateUsed: Number(row.exchange_rate_used ?? 1),
        paymentMethod: row.payment_method,
        type: row.type ?? 'payment',
        concept: row.concept ?? null,
        notes: row.notes ?? '',
        paymentDate: row.payment_date,
      }
    }

    let currency: 'USD' | 'VES' = 'USD'
    let originalAmount = Number(row.amount)
    let cleanNotes = (row.notes ?? '')
    const rowType = row.type ?? 'payment'

    const vesMatch = cleanNotes.match(/^\[VES:(\d+(?:\.\d+)?)\]\s?(.*)/s)
    if (vesMatch) {
      currency = 'VES'
      originalAmount = Number(vesMatch[1])
      cleanNotes = vesMatch[2] || ''
    }

    const usdMatch = !vesMatch && cleanNotes.match(/^\[USD:(\d+(?:\.\d+)?)\]\s?(.*)/s)
    if (usdMatch) {
      currency = 'USD'
      originalAmount = Number(usdMatch[1])
      cleanNotes = usdMatch[2] || ''
    }

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_profile?.full_name ?? '—',
      amount: Number(row.amount),
      currency,
      originalAmount,
      exchangeRateUsed: Number(row.amount) > 0 && originalAmount > 0 && currency === 'VES'
        ? originalAmount / Number(row.amount)
        : undefined,
      paymentMethod: row.payment_method,
      type: rowType,
      concept: row.concept ?? null,
      notes: cleanNotes,
      paymentDate: row.payment_date,
    }
  })
}

export const deleteEmployeePayment = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('employee_payments')
    .delete()
    .eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar el pago')
}

export const updateEmployeePayment = async (
  id: string,
  amount: number,
  paymentMethod: string,
  notes: string,
  paymentDate: string,
  currency: 'USD' | 'VES' = 'USD',
  exchangeRate?: number,
): Promise<void> => {
  if (!amount || amount <= 0) throw new Error('El monto debe ser mayor a 0')
  if (!paymentDate) throw new Error('Selecciona una fecha')

  const isVES = currency === 'VES'
  const rate = isVES && exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const usdAmount = isVES ? amount / rate : amount

  const { error } = await mutate
    .from('employee_payments')
    .update({
      amount: Math.round(usdAmount * 100) / 100,
      payment_method: paymentMethod,
      notes: notes || null,
      payment_date: paymentDate,
      currency: currency,
      original_amount: isVES ? amount : 0,
      exchange_rate_used: rate,
    })
    .eq('id', id)

  if (error) {
    console.error('[updateEmployeePayment] supabase error:', error)
    handleDbError(error, 'Error al actualizar el pago del empleado')
  }
}

export const createEmployeePayment = async (
  businessId: string,
  employeeId: string,
  amount: number,
  paymentMethod: string,
  notes: string,
  paymentDate: string,
  currency: 'USD' | 'VES' = 'USD',
  exchangeRate?: number,
  branchId?: string | null,
): Promise<void> => {
  if (!businessId) throw new Error('Falta el negocio (businessId)')
  if (!employeeId) throw new Error('Selecciona un empleado')
  if (!amount || amount <= 0) throw new Error('El monto debe ser mayor a 0')
  if (!paymentDate) throw new Error('Selecciona una fecha')

  let userId: string | null = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    userId = session?.user?.id ?? null
  } catch {
    // Session not available
  }

  const isVES = currency === 'VES'
  const rate = isVES && exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const usdAmount = isVES ? amount / rate : amount

  const { error } = await mutate
    .from('employee_payments')
    .insert({
      business_id: businessId,
      branch_id: branchId ?? null,
      employee_id: employeeId,
      amount: Math.round(usdAmount * 100) / 100,
      payment_method: paymentMethod,
      notes: notes || null,
      payment_date: paymentDate,
      created_by: userId,
      currency: currency,
      original_amount: isVES ? amount : 0,
      exchange_rate_used: rate,
    })
    .select()

  if (error) {
    console.error('[createEmployeePayment] supabase error:', error)
    handleDbError(error, 'Error al registrar el pago del empleado')
  }
}

export const createEmployeeConsumption = async (
  businessId: string,
  employeeId: string,
  amount: number,
  concept: string,
  paymentDate: string,
  currency: 'USD' | 'VES' = 'USD',
  exchangeRate?: number,
  branchId?: string | null,
): Promise<void> => {
  if (!businessId) throw new Error('Falta el negocio (businessId)')
  if (!employeeId) throw new Error('Selecciona un empleado')
  if (!amount || amount <= 0) throw new Error('El monto debe ser mayor a 0')
  if (!concept.trim()) throw new Error('Describe el consumo (servicio o producto)')
  if (!paymentDate) throw new Error('Selecciona una fecha')

  let userId: string | null = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    userId = session?.user?.id ?? null
  } catch {
    // Session not available
  }

  const isVES = currency === 'VES'
  const rate = isVES && exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const usdAmount = isVES ? amount / rate : amount

  const { error } = await mutate
    .from('employee_payments')
    .insert({
      business_id: businessId,
      branch_id: branchId ?? null,
      employee_id: employeeId,
      amount: Math.round(usdAmount * 100) / 100,
      payment_method: 'consumption',
      type: 'consumption',
      concept: concept.trim(),
      notes: null,
      payment_date: paymentDate,
      created_by: userId,
      currency: currency,
      original_amount: isVES ? amount : 0,
      exchange_rate_used: rate,
    })
    .select()

  if (error) {
    console.error('[createEmployeeConsumption] supabase error:', error)
    handleDbError(error, 'Error al registrar el consumo del empleado')
  }
}

export interface EmployeeBalance {
  employeeId: string
  employeeName: string
  payType: 'salary' | 'percentage' | 'mixed' | null
  payPercentage: number
  baseSalary: number
  totalEarned: number
  totalPaid: number
  pendingBalance: number
}

export const getEmployeeBalance = async (
  _businessId: string,
  employeeId: string,
  _branchId?: string | null,
): Promise<EmployeeBalance> => {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const data = await apiRequest<any>('GET', `/employee-balance/${employeeId}?year_month=${yearMonth}`)

  return {
    employeeId: data.employee_id,
    employeeName: data.employee_name,
    payType: data.pay_type,
    payPercentage: data.pay_percentage,
    baseSalary: data.base_salary,
    totalEarned: data.total_earned,
    totalPaid: data.total_paid,
    pendingBalance: data.pending_balance,
  }
}
