import { api as supabase, api as mutate } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { expenseFormSchema } from '../lib/validation'
import type { Expense } from '../types/database'

export const expensesKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['expenses', businessId, branchId] as const,
  filtered: (businessId?: string | null, branchId?: string | null, start?: string, end?: string) =>
    ['expenses', businessId, branchId, start, end] as const,
}

export type ExpenseRow = {
  id: string
  date: string
  name: string
  category: string
  amount: number
  currency: 'USD' | 'VES'
  originalAmount: number
  exchangeRateUsed: number
  notes: string
}

export type ExpenseFormData = {
  name: string
  category: string
  amount: number
  currency: 'USD' | 'VES'
  date: string
  notes: string
}

export const listExpenses = async (businessId: string, startDate: string, endDate: string, branchId?: string | null): Promise<ExpenseRow[]> => {
  let query = supabase
    .from('expenses')
    .select('id, name, category, amount, expense_date, notes, currency, original_amount, exchange_rate_used')
    .eq('business_id', businessId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error
  const raw = (data ?? []) as Array<Expense & { currency?: string; original_amount?: number; exchange_rate_used?: number }>
  return raw.map(row => {
    if (row.currency && row.currency !== 'USD') {
      return {
        id: row.id,
        date: row.expense_date,
        name: row.name,
        category: row.category,
        amount: row.amount,
        currency: row.currency as 'USD' | 'VES',
        originalAmount: Number(row.original_amount ?? 0),
        exchangeRateUsed: Number(row.exchange_rate_used ?? 1),
        notes: row.notes ?? '',
      }
    }

    let currency: 'USD' | 'VES' = 'USD'
    let originalAmount = row.amount
    let exchangeRateUsed = 1
    let cleanNotes = (row.notes ?? '')

    const newMatch = cleanNotes.match(/^\[(VES):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)\]\s?(.*)/s)
    if (newMatch) {
      currency = 'VES'
      originalAmount = Number(newMatch[2])
      exchangeRateUsed = Number(newMatch[3])
      cleanNotes = newMatch[4] || ''
    } else {
      const oldMatch = cleanNotes.match(/^\[(VES):(\d+(?:\.\d+)?)\]\s?(.*)/s)
      if (oldMatch) {
        currency = 'VES'
        originalAmount = Number(oldMatch[2])
        cleanNotes = oldMatch[3] || ''
      }
    }

    return {
      id: row.id,
      date: row.expense_date,
      name: row.name,
      category: row.category,
      amount: row.amount,
      currency,
      originalAmount,
      exchangeRateUsed,
      notes: cleanNotes,
    }
  })
}

export const saveExpense = async (
  businessId: string,
  data: ExpenseFormData & { id?: string },
  branchId?: string | null,
  exchangeRate?: number,
): Promise<void> => {
  const parsed = expenseFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const isVES = parsed.data.currency === 'VES'
  const rate = isVES && exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const usdAmount = isVES ? parsed.data.amount / rate : parsed.data.amount
  const effRate = isVES ? rate : 1

  const payload = {
    name: parsed.data.name,
    category: parsed.data.category,
    amount: Math.round(usdAmount * 100) / 100,
    expense_date: parsed.data.date,
    notes: parsed.data.notes || null,
    currency: parsed.data.currency,
    original_amount: isVES ? parsed.data.amount : 0,
    exchange_rate_used: effRate,
  }

  if (data.id) {
    const { error } = await mutate
      .from('expenses')
      .update(payload)
      .eq('id', data.id)
    if (error) handleDbError(error, 'Error al actualizar el gasto')
  } else {
    const { error } = await mutate.from('expenses').insert({ ...payload, business_id: businessId, branch_id: branchId ?? null })
    if (error) handleDbError(error, 'Error al guardar el gasto')
  }
}

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar el gasto')
}
