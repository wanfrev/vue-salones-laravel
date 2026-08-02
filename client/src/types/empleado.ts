export interface Empleado {
  id: string
  name: string
  role: string
  systemRole?: string
  isCajero?: boolean
  citasHoy: number
  producido: string
  schedule?: { start: string; end: string; break: string }
  phone?: string
  email?: string
  specialties?: string[]
  joinDate?: string
  payType: 'salary' | 'percentage' | 'mixed'
  payPercentage?: number
  baseSalary?: number
  salaryFrequency?: 'weekly' | 'biweekly' | 'monthly'
  payTypeLabel: string
  payValueLabel: string
  disableAgenda?: boolean
  disableInventoryEdit?: boolean
  canCreateAppointments?: boolean
  canCreateClients?: boolean
  canAccessConsultorio?: boolean
}

export interface EmpleadoFormData {
  name: string
  role: string
  systemRole: 'empleado' | 'encargado' | 'cajero'
  phone: string
  email: string
  password: string
  specialties: string[]
  scheduleStart: string
  scheduleEnd: string
  scheduleBreak: string
  payType: 'salary' | 'percentage' | 'mixed'
  payPercentage: number
  baseSalary: number
  salaryFrequency: 'weekly' | 'biweekly' | 'monthly'
  activeDays: number[]
  disableAgenda: boolean
  disableInventoryEdit: boolean
  canCreateAppointments: boolean
  canCreateClients: boolean
  canAccessConsultorio: boolean
}
