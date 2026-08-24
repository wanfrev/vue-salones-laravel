import { apiRequest } from '../lib/api'
import { toTitleCase } from '../lib/formatters'
import { getDefaultLocation } from './inventarioService'
import type { PaymentMethod } from '../types/database'
import type { POSProductItem, PaymentBreakdownItem } from '../types/pos'

export const posKeys = {
  pending: (businessId?: string | null, branchId?: string | null) => ['pos-pending', businessId, branchId] as const,
  products: (businessId?: string | null, branchId?: string | null) => ['pos-products', businessId, branchId] as const,
  suggestions: (businessId?: string | null, branchId?: string | null, productId?: string | null) =>
    ['pos-product-suggestions', businessId, branchId, productId] as const,
  heldSales: (businessId?: string | null, branchId?: string | null) => ['pos-held-sales', businessId, branchId] as const,
}

export interface HeldSale {
  id: string
  business_id: string
  branch_id: string | null
  created_by: string | null
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  cart: POSProductItem[]
  payment_method: PaymentMethod | null
  payment_currency: 'USD' | 'VES' | null
  payments_breakdown: PaymentBreakdownItem[]
  tip_amount: number
  tip_currency: 'USD' | 'VES' | null
  notes: string | null
  custom_total_amount: number | null
  custom_total_currency: 'USD' | 'VES' | null
  are_products_included: boolean
  total_amount: number
  created_at: string
}

export const listHeldSales = async (businessId: string, branchId?: string | null): Promise<HeldSale[]> => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  const qs = params.toString()
  return await apiRequest<HeldSale[]>('GET', `/pos/held-sales${qs ? `?${qs}` : ''}`)
}

export const holdSale = async (params: {
  branchId?: string | null
  clientId?: string | null
  clientName?: string | null
  clientPhone?: string | null
  cart: POSProductItem[]
  paymentMethod: PaymentMethod
  paymentCurrency: 'USD' | 'VES'
  paymentsBreakdown: PaymentBreakdownItem[]
  tipAmount?: number
  tipCurrency?: 'USD' | 'VES'
  notes?: string | null
  customTotalAmount?: number | null
  customTotalCurrency?: 'USD' | 'VES' | null
  areProductsIncluded?: boolean
}): Promise<HeldSale> => {
  return await apiRequest<HeldSale>('POST', '/pos/held-sales', {
    branch_id: params.branchId || null,
    client_id: params.clientId || null,
    client_name: params.clientName || null,
    client_phone: params.clientPhone || null,
    cart: params.cart,
    payment_method: params.paymentMethod,
    payment_currency: params.paymentCurrency,
    payments_breakdown: params.paymentsBreakdown,
    tip_amount: params.tipAmount ?? 0,
    tip_currency: params.tipCurrency ?? null,
    notes: params.notes || null,
    custom_total_amount: params.customTotalAmount ?? null,
    custom_total_currency: params.customTotalCurrency ?? null,
    are_products_included: params.areProductsIncluded ?? false,
  })
}

export const resumeHeldSale = async (id: string): Promise<HeldSale> => {
  return await apiRequest<HeldSale>('POST', `/pos/held-sales/${id}/resume`)
}

export const cancelHeldSale = async (id: string): Promise<void> => {
  await apiRequest('DELETE', `/pos/held-sales/${id}`)
}

export const listPendingAppointments = async (businessId: string, branchId?: string | null) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  const qs = params.toString()
  return await apiRequest<any[]>('GET', `/pos/pending${qs ? `?${qs}` : ''}`)
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
    const names = members.map((m: any) => m.service?.name ?? m.services?.name ?? 'Servicio').join(' + ')
    const totalPrice = members.reduce((sum, m) =>
      sum + (m.price_override != null ? Number(m.price_override) : Number(m.service?.price ?? m.services?.price ?? 0)), 0
    )

    result.push({
      ...primary,
      services: { ...(primary.service ?? primary.services), name: names },
      groupIds: members.map((m: any) => m.id),
      groupPrice: totalPrice,
      isGroup: true,
      members: members.map((m: any) => ({
        appointmentId: m.id,
        employeeId: m.employee_id,
        serviceName: m.service?.name ?? m.services?.name ?? 'Servicio',
        employeeName: toTitleCase(m.employee_profile?.full_name ?? m.profiles?.full_name) || 'Empleado',
        price: m.price_override != null ? Number(m.price_override) : Number(m.service?.price ?? m.services?.price ?? 0),
        associated_products: m.associated_products,
      })),
    })
  }

  return result
}

export const listSaleableProducts = async (businessId: string, branchId?: string | null) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  const qs = params.toString()
  return await apiRequest<any[]>('GET', `/pos/products${qs ? `?${qs}` : ''}`)
}

export const getFrequentlyBoughtTogether = async (businessId: string, productId: string, branchId?: string | null) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  const qs = params.toString()
  return await apiRequest<any[]>('GET', `/pos/products/${productId}/suggestions${qs ? `?${qs}` : ''}`)
}

export const recordSale = async (params: {
  appointmentId: string
  serviceAmount?: number
  amount?: number
  productsAmount?: number
  method: PaymentMethod
  products?: POSProductItem[]
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  businessId: string
  branchId?: string | null
  tipAmount?: number
  tipCurrency?: 'USD' | 'VES'
}): Promise<{ id: string, receipt_code?: string }> => {
  const serviceAmount = params.serviceAmount ?? params.amount ?? 0
  const products = params.products ?? []
  const productsPayload = products.map(p => ({
    product_id: p.productId,
    variant_id: p.variantId,
    quantity: p.quantity,
    location_id: (p as any).locationId ?? null,
    unit_cost: Number(p.unitCost ?? (p as any).unit_cost ?? 0),
    name: p.productName,
  }))

  const response = await apiRequest<{ id: string, receipt_code?: string }>('POST', '/pos/sale', {
    appointment_id: params.appointmentId,
    service_amount: serviceAmount,
    products_amount: params.productsAmount ?? 0,
    method: params.method,
    products: productsPayload,
    notes: params.notes ?? null,
    exchange_rate_used: params.exchangeRate,
    payments_breakdown: params.paymentsBreakdown,
    tip_amount: params.tipAmount ?? 0,
    tip_currency: params.tipCurrency ?? null,
  })

  return response
}

export const recordPaymentOnly = async (params: {
  appointmentId: string
  amount: number
  method: PaymentMethod
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  tipAmount?: number
}): Promise<{ id: string, receipt_code?: string }> => {
  return await recordSale({
    appointmentId: params.appointmentId,
    serviceAmount: params.amount,
    method: params.method,
    products: [],
    notes: params.notes,
    exchangeRate: params.exchangeRate,
    paymentsBreakdown: params.paymentsBreakdown,
    tipAmount: params.tipAmount,
    businessId: '',
    branchId: null,
  })
}

export const recordDirectSale = async (params: {
  totalAmount: number
  method: PaymentMethod
  products: POSProductItem[]
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  businessId: string
  branchId?: string | null
  clientId?: string | null
  clientNameInput?: string | null
  clientPhoneInput?: string | null
}): Promise<{ id: string, receipt_code?: string }> => {
  const productsPayload = params.products.map(p => ({
    product_id: p.productId,
    variant_id: p.variantId,
    quantity: p.quantity,
    location_id: (p as any).locationId ?? null,
    unit_cost: Number(p.unitCost ?? (p as any).unit_cost ?? 0),
    name: p.productName,
  }))

  const response = await apiRequest<{ id: string, receipt_code?: string }>('POST', '/pos/direct-sale', {
    total_amount: params.totalAmount,
    method: params.method,
    products: productsPayload,
    notes: params.notes ?? null,
    exchange_rate_used: params.exchangeRate,
    payments_breakdown: params.paymentsBreakdown,
    client_id: params.clientId || null,
    client_name: params.clientNameInput || null,
    client_phone: params.clientPhoneInput || null,
    branch_id: params.branchId || null,
  })

  return response
}

export const recordDirectServiceSale = async (params: {
  services?: Array<{
    serviceId: string
    employeeId: string
    assistantEmployeeId?: string | null
    price: number
  }>
  serviceId?: string
  employeeId?: string
  assistantEmployeeId?: string | null
  clientId?: string | null
  serviceAmount?: number
  productsAmount?: number
  method: PaymentMethod
  products?: POSProductItem[]
  notes?: string
  exchangeRate: number
  paymentsBreakdown: PaymentBreakdownItem[]
  businessId: string
  branchId?: string | null
  tipAmount?: number
  tipCurrency?: 'USD' | 'VES'
}): Promise<{ id: string, receipt_code?: string }> => {
  const products = params.products ?? []
  const productsPayload = products.map(p => ({
    product_id: p.productId,
    variant_id: p.variantId,
    quantity: p.quantity,
    location_id: (p as any).locationId ?? null,
    unit_cost: p.unitCost,
    name: p.productName,
  }))

  const servicesPayload = params.services?.map(s => ({
    service_id: s.serviceId,
    employee_id: s.employeeId,
    assistant_employee_id: s.assistantEmployeeId ?? null,
    price: s.price,
  }))

  const response = await apiRequest<{ id: string, receipt_code?: string }>('POST', '/pos/direct-service-sale', {
    services: servicesPayload,
    service_id: params.serviceId,
    employee_id: params.employeeId,
    assistant_employee_id: params.assistantEmployeeId || null,
    client_id: params.clientId || null,
    service_amount: params.serviceAmount ?? 0,
    products_amount: params.productsAmount ?? 0,
    method: params.method,
    products: productsPayload,
    notes: params.notes || null,
    exchange_rate_used: params.exchangeRate,
    payments_breakdown: params.paymentsBreakdown,
    tip_amount: params.tipAmount ?? 0,
    tip_currency: params.tipCurrency ?? null,
    branch_id: params.branchId || null,
  })

  return response
}

export const updateTransaction = async (params: {
  transactionId: string
  amount: number
  method: string
  notes?: string | null
  exchangeRate?: number
  paymentsBreakdown?: any[]
  tipAmount?: number
}): Promise<void> => {
  await apiRequest('PUT', `/transactions/${params.transactionId}`, {
    total_amount: params.amount,
    method: params.method,
    notes: params.notes ?? null,
    exchange_rate_used: params.exchangeRate ?? null,
    payments_breakdown: params.paymentsBreakdown ?? undefined,
    tip_amount: params.tipAmount ?? 0,
  })
}

export const deleteTransaction = async (_params: any): Promise<void> => {}

export const deleteProductSale = async (_movementId: string): Promise<void> => {}

export const markAppointmentsAsPaid = async (_appointmentIds: string[]): Promise<void> => {}
