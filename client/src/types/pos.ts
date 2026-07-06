import type { PaymentMethod } from './database'

export interface POSProductItem {
  productId: string
  productName: string
  availableQty: number
  variantId: string | null
  variantName: string | null
  quantity: number
  unitPrice: number
  unitCost: number
  subtotal: number
}

export interface POSTransaction {
  appointmentId: string
  amount: number
  method: PaymentMethod
  products: POSProductItem[]
  notes: string
}

export interface PaymentBreakdownItem {
  method: PaymentMethod
  inputAmount: number
  currency: 'USD' | 'VES'
  amount: number
}

export interface TipAllocationItem {
  employee_id: string
  amount: number
  employee_name?: string
}
