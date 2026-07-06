export interface Cita {
  id: string
  clientName: string
  clientId?: string
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
