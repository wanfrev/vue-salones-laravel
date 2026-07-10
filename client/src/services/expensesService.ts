import { apiRequest } from '../lib/api'

export const expensesKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['expenses', businessId, branchId] as const,
  filtered: (businessId?: string | null, branchId?: string | null, start?: string, end?: string) =>
    ['expenses', businessId, branchId, start, end] as const,
}

export type ExpenseFormData = {
  name: string
  category: string
  amount: number
  currency: string
  originalAmount?: number
  exchangeRateUsed?: number
  expenseDate: string
  notes: string
  branchId?: string | null
}

export type ExpenseRow = {
  id: string
  name: string
  category: string
  amount: number
  currency: 'USD' | 'VES'
  original_amount: number
  exchange_rate_used: number
  expense_date: string
  notes: string | null
  branch_id: string | null
}

export const listExpenses = async (
  businessId: string,
  startDate: string,
  endDate: string,
  branchId?: string | null,
): Promise<ExpenseRow[]> => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  if (branchId) params.set('branch_id', branchId)
  return await apiRequest<ExpenseRow[]>('GET', `/expenses?${params.toString()}`)
}

export const saveExpense = async (
  _businessId: string,
  data: ExpenseFormData & { id?: string },
  branchId?: string | null,
  exchangeRate?: number,
): Promise<ExpenseRow> => {
  const rate = data.exchangeRateUsed ?? exchangeRate ?? 1
  const payload: Record<string, unknown> = {
    name: data.name,
    category: data.category,
    amount: data.amount,
    currency: data.currency,
    expense_date: data.expenseDate,
    notes: data.notes || null,
    branch_id: branchId ?? null,
  }

  if (data.currency === 'VES') {
    payload.original_amount = data.originalAmount ?? data.amount
    payload.exchange_rate_used = rate
    payload.amount = data.amount / rate
  } else {
    payload.original_amount = 0
    payload.exchange_rate_used = rate
  }

  if (data.id) {
    return await apiRequest<ExpenseRow>('PUT', `/expenses/${data.id}`, payload)
  }

  return await apiRequest<ExpenseRow>('POST', '/expenses', payload)
}

export const deleteExpense = async (id: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/expenses/${id}`)
}
