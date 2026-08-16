export interface Cita {
  id: string
  clientName: string
  clientId?: string
  clientPhone?: string
  petId?: string
  petName?: string
  service: string
  serviceId?: string
  employee: string
  employeeId?: string
  assistantName?: string
  assistantId?: string
  assistantPercentage?: number
  employeePercentageOverride?: number
  isFixedCommissionOverride?: boolean
  employeeAmountOverride?: number
  assistantAmountOverride?: number
  groupId?: string
  date: string
  time: string
  duration: number
  price: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'paid'
  source?: string
  paymentStatus?: 'unpaid' | 'partial' | 'paid'
  statusLabel?: string
  statusColor?: string
  notes?: string
  diagnosis?: string
  treatment?: string
  associatedProducts?: CitaAssociatedProduct[]
  clinicalHistory?: Record<string, string>
}

export interface CitaAssociatedProduct {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unitCost?: number
}

export interface CitaFormServiceItem {
  serviceId: string
  employeeId: string
  assistantEmployeeId: string
  assistantPercentage: number
  employeePercentageOverride?: number
  isFixedCommissionOverride?: boolean
  employeeAmountOverride?: number
  assistantAmountOverride?: number
  duration: number
  price: number
}

export interface CitaFormData {
  clientId?: string
  clientName: string
  clientPhone: string
  petId?: string
  service: string
  employee: string
  assistantEmployee: string
  assistantPercentage: number
  employeePercentageOverride?: number
  isFixedCommissionOverride?: boolean
  employeeAmountOverride?: number
  assistantAmountOverride?: number
  duration: number
  price: number
  extraServices: CitaFormServiceItem[]
  date: string
  time: string
  status: 'confirmed' | 'pending' | 'paid'
  notes: string
  diagnosis?: string
  treatment?: string
  associatedProducts?: CitaAssociatedProduct[]
  clinicalHistory?: Record<string, string>
}

export interface PaymentEditContext {
  transactionId: string
  method: 'cash' | 'cash_ves' | 'card' | 'transfer' | 'zelle' | 'binance' | 'cashea' | 'pago_movil' | 'punto_venta' | 'mixed' | 'other' | 'credito'
  amount: number
  currency: 'USD' | 'VES'
  exchangeRate: number
  tipAmount?: number
  notes?: string
  breakdown?: import('./pos').PaymentBreakdownItem[]
  appointmentId?: string
  clientName?: string
  employeeName?: string
  invoiceProducts?: AppointmentProduct[]
  receipt_code?: string
}

export interface AppointmentProduct {
  movementId: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
}
