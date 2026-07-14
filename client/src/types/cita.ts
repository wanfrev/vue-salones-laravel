export interface Cita {
  id: string
  clientName: string
  clientId?: string
  clientPhone?: string
  service: string
  serviceId?: string
  employee: string
  employeeId?: string
  assistantName?: string
  assistantId?: string
  assistantPercentage?: number
  employeePercentageOverride?: number
  groupId?: string
  date: string
  time: string
  duration: number
  price: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'paid'
  paymentStatus?: 'unpaid' | 'partial' | 'paid'
  statusLabel?: string
  statusColor?: string
  notes?: string
}

export interface CitaFormServiceItem {
  serviceId: string
  employeeId: string
  assistantEmployeeId: string
  assistantPercentage: number
  employeePercentageOverride?: number
  duration: number
  price: number
}

export interface CitaFormData {
  clientId?: string
  clientName: string
  clientPhone: string
  service: string
  employee: string
  assistantEmployee: string
  assistantPercentage: number
  employeePercentageOverride?: number
  duration: number
  price: number
  extraServices: CitaFormServiceItem[]
  date: string
  time: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'paid'
  notes: string
}

export interface PaymentEditContext {
  transactionId: string
  method: 'cash' | 'cash_ves' | 'card' | 'transfer' | 'zelle' | 'pago_movil' | 'punto_venta' | 'mixed' | 'other'
  amount: number
  currency: 'USD' | 'VES'
  exchangeRate: number
  tipAmount?: number
  notes?: string
  breakdown?: import('./pos').PaymentBreakdownItem[]
  appointmentId?: string
}

export interface AppointmentProduct {
  movementId: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
}
