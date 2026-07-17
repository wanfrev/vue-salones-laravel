import { db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { supplierFormSchema, supplierPaymentFormSchema } from '../lib/validation'
import type { Supplier, SupplierPayment } from '../types/database'

export const supplierKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['suppliers', businessId, branchId] as const,
}

export const supplierPaymentKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['supplier-payments', businessId, branchId] as const,
  filtered: (businessId?: string | null, branchId?: string | null, start?: string, end?: string) =>
    ['supplier-payments', businessId, branchId, start, end] as const,
}

export interface SupplierRow {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  company: string
  totalDebt: number
  debtCurrency: 'USD' | 'VES'
  debtOriginalAmount: number
  debtExchangeRate: number
  remainingDebt: number
  notes: string
  active: boolean
}

export interface SupplierPaymentRow {
  id: string
  supplierId: string
  supplierName: string
  amount: number
  currency: 'USD' | 'VES'
  originalAmount: number
  exchangeRateUsed: number
  paymentMethod: string
  paymentDate: string
  notes: string
}

export interface SupplierFormData {
  firstName: string
  lastName: string
  phone: string
  company: string
  totalDebt: number
  debtCurrency: 'USD' | 'VES'
  notes: string
}

export interface SupplierPaymentFormData {
  supplierId: string
  amount: number
  currency: 'USD' | 'VES'
  paymentMethod: string
  paymentDate: string
  notes: string
}

export const listSuppliers = async (businessId: string, branchId?: string | null): Promise<SupplierRow[]> => {
  let query = db
    .from('suppliers')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) handleDbError(error, 'Error al cargar proveedores')

  const raw = (data ?? []) as Supplier[]
  return raw.map(row => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    phone: row.phone ?? '',
    company: row.company ?? '',
    totalDebt: Number(row.total_debt ?? 0),
    debtCurrency: (row.debt_currency as 'USD' | 'VES') || 'USD',
    debtOriginalAmount: Number(row.debt_original_amount ?? 0),
    debtExchangeRate: Number(row.debt_exchange_rate ?? 1),
    remainingDebt: Number(row.total_debt ?? 0),
    notes: row.notes ?? '',
    active: row.active,
  }))
}

export const saveSupplier = async (
  businessId: string,
  data: SupplierFormData & { id?: string },
  branchId?: string | null
): Promise<SupplierRow> => {
  const parsed = supplierFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const isVES = parsed.data.debtCurrency === 'VES'
  const rate = isVES ? await getCurrentExchangeRate(businessId) : 1
  const debtUSD = isVES ? parsed.data.totalDebt / rate : parsed.data.totalDebt

  const basePayload = {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone || null,
    company: parsed.data.company || null,
    total_debt: Math.round(debtUSD * 100) / 100,
    debt_currency: parsed.data.debtCurrency,
    debt_original_amount: parsed.data.totalDebt,
    debt_exchange_rate: rate,
    notes: parsed.data.notes || null,
    branch_id: branchId ?? null,
  }

  if (data.id) {
    const { data: updated, error } = await db
      .from('suppliers')
      .update(basePayload)
      .eq('id', data.id)
      .select('*')
      .single()

    if (error) handleDbError(error, 'Error al actualizar el proveedor')

    const row = updated as Supplier
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      phone: row.phone ?? '',
      company: row.company ?? '',
      totalDebt: Number(row.total_debt ?? 0),
      debtCurrency: (row.debt_currency as 'USD' | 'VES') || 'USD',
      debtOriginalAmount: Number(row.debt_original_amount ?? 0),
      debtExchangeRate: Number(row.debt_exchange_rate ?? 1),
      remainingDebt: Number(row.total_debt ?? 0),
      notes: row.notes ?? '',
      active: row.active,
    }
  }

  const { data: created, error } = await db
    .from('suppliers')
    .insert({
      business_id: businessId,
      ...basePayload,
      active: true,
    })
    .select('*')
    .single()

  if (error) handleDbError(error, 'Error al crear el proveedor')

  const row = created as Supplier
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    phone: row.phone ?? '',
    company: row.company ?? '',
    totalDebt: Number(row.total_debt ?? 0),
    debtCurrency: (row.debt_currency as 'USD' | 'VES') || 'USD',
    debtOriginalAmount: Number(row.debt_original_amount ?? 0),
    debtExchangeRate: Number(row.debt_exchange_rate ?? 1),
    remainingDebt: Number(row.total_debt ?? 0),
    notes: row.notes ?? '',
    active: row.active,
  }
}

export const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await db
    .from('suppliers')
    .update({ active: false })
    .eq('id', id)

  if (error) handleDbError(error, 'Error al eliminar el proveedor')
}

export const listSupplierPayments = async (
  businessId: string,
  branchId?: string | null,
  startDate?: string,
  endDate?: string,
): Promise<SupplierPaymentRow[]> => {
  let query = db
    .from('supplier_payments')
    .select('id, supplier_id, amount, payment_method, payment_date, notes, suppliers!inner(first_name, last_name)')
    .eq('business_id', businessId)
    .order('payment_date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (startDate) query = query.gte('payment_date', startDate)
  if (endDate) query = query.lte('payment_date', endDate)

  const { data, error } = await query

  if (error) handleDbError(error, 'Error al cargar abonos a proveedores')

  type Raw = Pick<SupplierPayment, 'id' | 'supplier_id' | 'amount' | 'payment_method' | 'payment_date' | 'notes'> & {
    suppliers?: { first_name: string; last_name: string } | null
  }

  return ((data ?? []) as Raw[]).map(row => {
    let currency: 'USD' | 'VES' = 'USD'
    let originalAmount = Number(row.amount)
    let exchangeRateUsed = 1
    let cleanNotes = (row.notes ?? '')

    const vesMatch = cleanNotes.match(/^\[VES:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)\]\s?(.*)/s)
    if (vesMatch) {
      currency = 'VES'
      originalAmount = Number(vesMatch[1])
      exchangeRateUsed = Number(vesMatch[2])
      cleanNotes = vesMatch[3] || ''
    } else {
      const oldMatch = cleanNotes.match(/^\[VES:(\d+(?:\.\d+)?)\]\s?(.*)/s)
      if (oldMatch) {
        currency = 'VES'
        originalAmount = Number(oldMatch[1])
        exchangeRateUsed = Number(row.amount) > 0 ? originalAmount / Number(row.amount) : 1
        cleanNotes = oldMatch[2] || ''
      }
    }

    const supplierName = row.suppliers
      ? `${row.suppliers.first_name} ${row.suppliers.last_name}`
      : '—'

    return {
      id: row.id,
      supplierId: row.supplier_id,
      supplierName,
      amount: Number(row.amount),
      currency,
      originalAmount,
      exchangeRateUsed,
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      notes: cleanNotes,
    }
  })
}

export const createSupplierPayment = async (
  businessId: string,
  data: SupplierPaymentFormData,
  branchId?: string | null,
  exchangeRate?: number,
): Promise<void> => {
  const parsed = supplierPaymentFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  let userId: string | null = null
  try {
    const { data: { session } } = await db.auth.getSession()
    userId = session?.user?.id ?? null
  } catch { /* no session */ }

  const isVES = parsed.data.currency === 'VES'
  const rate = isVES && exchangeRate && exchangeRate > 0 ? exchangeRate : 1
  const usdAmount = isVES ? parsed.data.amount / rate : parsed.data.amount

  let notesContent = parsed.data.notes || ''
  if (isVES) {
    notesContent = `[VES:${parsed.data.amount}:${rate}]` + (notesContent ? ' ' + notesContent : '')
  }

  const { error } = await db
    .from('supplier_payments')
    .insert({
      business_id: businessId,
      branch_id: branchId ?? null,
      supplier_id: parsed.data.supplierId,
      amount: Math.round(usdAmount * 100) / 100,
      payment_method: parsed.data.paymentMethod,
      payment_date: parsed.data.paymentDate,
      notes: notesContent || null,
      created_by: userId,
    })

  if (error) handleDbError(error, 'Error al registrar el abono')
}

export const deleteSupplierPayment = async (id: string): Promise<void> => {
  const { error } = await db
    .from('supplier_payments')
    .delete()
    .eq('id', id)

  if (error) handleDbError(error, 'Error al eliminar el abono')
}

export interface SupplierBalance {
  supplierId: string
  supplierName: string
  totalDebt: number
  debtCurrency: 'USD' | 'VES'
  debtOriginalAmount: number
  totalPaid: number
  pendingBalance: number
}

export const getSupplierBalance = async (
  businessId: string,
  supplierId: string,
  branchId?: string | null,
): Promise<SupplierBalance> => {
  const { data: supplier, error: supplierError } = await db
    .from('suppliers')
    .select('id, first_name, last_name, total_debt, debt_currency, debt_original_amount')
    .eq('id', supplierId)
    .single()

  if (supplierError || !supplier) throw new Error('Proveedor no encontrado')

  const s = supplier as any

  let paymentsQuery = db
    .from('supplier_payments')
    .select('amount')
    .eq('business_id', businessId)
    .eq('supplier_id', supplierId)

  if (branchId) {
    paymentsQuery = paymentsQuery.eq('branch_id', branchId)
  }

  const { data: payments, error: paymentsError } = await paymentsQuery

  if (paymentsError) handleDbError(paymentsError, 'Error al cargar abonos')

  const rawP = (payments ?? []) as Array<{ amount: number }>
  const totalPaid = rawP.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalDebt = Number(s.total_debt ?? 0)

  return {
    supplierId: s.id,
    supplierName: `${s.first_name} ${s.last_name}`,
    totalDebt,
    debtCurrency: s.debt_currency || 'USD',
    debtOriginalAmount: Number(s.debt_original_amount ?? 0),
    totalPaid,
    pendingBalance: Math.max(0, totalDebt - totalPaid),
  }
}

async function getCurrentExchangeRate(businessId: string): Promise<number> {
  const { data } = await db
    .from('businesses')
    .select('ves_exchange_rate')
    .eq('id', businessId)
    .single()
  return Number((data as any)?.ves_exchange_rate ?? 1) || 1
}
