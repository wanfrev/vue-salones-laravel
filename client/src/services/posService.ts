import { api as supabase, api as mutate, apiRequest } from '../lib/api'
import { getDefaultLocation } from './inventarioService'
import type { PaymentMethod } from '../types/database'
import type { POSProductItem, PaymentBreakdownItem } from '../types/pos'

export const posKeys = {
  pending: (businessId?: string | null, branchId?: string | null) => ['pos-pending', businessId, branchId] as const,
  products: (businessId?: string | null, branchId?: string | null) => ['pos-products', businessId, branchId] as const,
}

export const recordSale = async (params: {
  appointmentId: string
  amount: number
  method: PaymentMethod
  products?: POSProductItem[]
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  businessId: string
  branchId?: string | null
  tipAmount?: number
}): Promise<string> => {
  const products = params.products ?? []
  const locationId = products.length > 0 ? await getDefaultLocation(params.businessId, params.branchId) : null

  if (products.length > 0 && locationId) {
    const productIds = [...new Set(products.map(p => p.productId))]
    let stockQuery = supabase
      .from('inventory_stock')
      .select('product_id, variant_id, quantity, reserved_qty')
      .eq('business_id', params.businessId)
      .eq('location_id', locationId)
      .in('product_id', productIds)

    if (params.branchId) {
      stockQuery = stockQuery.eq('branch_id', params.branchId)
    }

    const { data: stockRows, error: stockError } = await stockQuery

    if (stockError) throw stockError

    const availableByKey = new Map<string, number>()
    for (const row of (stockRows ?? []) as Array<{ product_id: string; variant_id: string | null; quantity: number; reserved_qty: number }>) {
      const key = `${row.product_id}::${row.variant_id ?? 'null'}`
      const available = Number(row.quantity) - Number(row.reserved_qty)
      availableByKey.set(key, Math.max(0, available))
    }

    for (const product of products) {
      const key = `${product.productId}::${product.variantId ?? 'null'}`
      const available = availableByKey.get(key) ?? 0
      if (product.quantity > available) {
        throw new Error(`Stock insuficiente para ${product.productName}. Disponible: ${available}`)
      }
    }
  }

  const productsPayload = products.map(p => ({
    product_id: p.productId,
    variant_id: p.variantId,
    quantity: p.quantity,
    location_id: locationId,
    unit_cost: p.unitCost,
  }))

  const response = await apiRequest<{ id: string }>('POST', '/pos/sale', {
    appointment_id: params.appointmentId,
    amount: params.amount,
    method: params.method,
    products: productsPayload,
    notes: params.notes ?? null,
    exchange_rate_used: params.exchangeRate,
    payments_breakdown: params.paymentsBreakdown,
    tip_amount: params.tipAmount ?? 0,
  })

  return response.id
}

export const updateTransaction = async (params: {
  transactionId: string
  amount?: number
  method?: PaymentMethod
  notes?: string
  exchangeRate?: number
  paymentsBreakdown?: PaymentBreakdownItem[]
}): Promise<void> => {
  await mutate
    .from('transactions')
    .update({
      total_amount: params.amount,
      method: params.method,
      notes: params.notes,
      exchange_rate_used: params.exchangeRate,
      payments_breakdown: params.paymentsBreakdown,
      ...(params.paymentsBreakdown ? { payments_breakdown: params.paymentsBreakdown } : {}),
    })
    .eq('id', params.transactionId)
}

export const deleteTransaction = async (params: {
  transactionId: string
}): Promise<void> => {
  await mutate
    .from('transactions')
    .delete()
    .eq('id', params.transactionId)
}

export const deleteProductSale = async (movementId: string): Promise<void> => {
  await mutate
    .from('inventory_movements')
    .delete()
    .eq('id', movementId)
}

export const listPendingAppointments = async (businessId: string, branchId?: string | null) => {
  let query = supabase
    .from('appointments')
    .select('*, clients(id, full_name, phone), services(id, name, duration_minutes, price), profiles!appointments_employee_id_fkey(id, full_name), assistant_profile:profiles!appointments_assistant_employee_id_fkey(id, full_name)')
    .eq('business_id', businessId)
    .in('status', ['confirmed', 'completed', 'pending'])
    .neq('payment_status', 'paid')
    .order('start_time', { ascending: false })
    .limit(200)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? [])
}

export const groupPendingAppointments = (appointments: any[]) => {
  const groups = new Map<string, any[]>()
  const singles: any[] = []

  for (const appt of appointments) {
    if (appt.group_id && typeof appt.group_id === 'string' && appt.group_id.length > 10) {
      const arr = groups.get(appt.group_id)
      if (arr) arr.push(appt)
      else groups.set(appt.group_id, [appt])
    } else {
      singles.push(appt)
    }
  }

  const result: any[] = [...singles]

  for (const [, members] of groups) {
    members.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const primary = members[0]
    const names = members.map(m => m.services?.name ?? 'Servicio').join(' + ')
    const totalPrice = members.reduce((sum, m) =>
      sum + (m.price_override != null ? Number(m.price_override) : Number(m.services?.price ?? 0)), 0
    )

    const memberDetails = members.map(m => ({
      appointmentId: m.id,
      employeeId: m.employee_id,
      serviceName: m.services?.name ?? 'Servicio',
      employeeName: m.profiles?.full_name ?? 'Empleado',
      price: m.price_override != null ? Number(m.price_override) : Number(m.services?.price ?? 0),
    }))

    result.push({
      ...primary,
      services: { ...primary.services, name: names },
      groupIds: members.map(m => m.id),
      groupPrice: totalPrice,
      isGroup: true,
      members: memberDetails,
    })
  }

  return result
}

export const recordPaymentOnly = async (params: {
  appointmentId: string
  amount: number
  method: PaymentMethod
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  tipAmount?: number
}): Promise<string> => {
  const response = await apiRequest<{ id: string }>('POST', '/pos/payment', {
    appointment_id: params.appointmentId,
    amount: params.amount,
    method: params.method,
    notes: params.notes ?? null,
    exchange_rate_used: params.exchangeRate,
    payments_breakdown: params.paymentsBreakdown,
    tip_amount: params.tipAmount ?? 0,
  })

  return response.id
}

export const markAppointmentsAsPaid = async (appointmentIds: string[]): Promise<void> => {
  const { error } = await mutate
    .from('appointments')
    .update({ payment_status: 'paid' as any })
    .in('id', appointmentIds)

  if (error) throw error
}

export const listSaleableProducts = async (businessId: string, branchId?: string | null) => {
  let productsQuery = supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .eq('is_sellable', true)
    .order('name')

  if (branchId) {
    productsQuery = productsQuery.eq('branch_id', branchId)
  }

  const { data, error } = await productsQuery

  if (error) throw error

  const products = data ?? []
  const productIds = products.map((p: any) => p.id)
  if (productIds.length === 0) return []

  let stockQuery = supabase
    .from('inventory_stock')
    .select('product_id, quantity, reserved_qty')
    .eq('business_id', businessId)
    .in('product_id', productIds)

  if (branchId) {
    stockQuery = stockQuery.eq('branch_id', branchId)
  }

  const { data: stockRows, error: stockError } = await stockQuery

  if (stockError) throw stockError

  const availableByProduct = new Map<string, number>()
  for (const row of (stockRows ?? []) as Array<{ product_id: string; quantity: number; reserved_qty: number }>) {
    const current = availableByProduct.get(row.product_id) ?? 0
    const available = Number(row.quantity) - Number(row.reserved_qty)
    availableByProduct.set(row.product_id, current + available)
  }

  return products.map((product: any) => ({
    ...product,
    available_qty: Math.max(0, availableByProduct.get(product.id) ?? 0),
  }))
}
