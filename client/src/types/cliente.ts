export interface PetFormData {
  id?: string
  name: string
  breed?: string
  weight?: string
  notes?: string
  metadata?: Record<string, unknown>
  _delete?: boolean
}

export interface Cliente {
  id: string
  name: string
  phone: string
  email?: string
  lastVisit?: string
  totalAppointments?: number
  totalSpent?: string
  joinDate?: string
  notes?: string
  birthday?: string
  preferredServices?: string[]
  metadata?: Record<string, unknown>
  pets?: PetFormData[]
}

export interface ClienteFormData {
  name: string
  phone: string
  email: string
  notes: string
  birthday: string
  preferredServices: string[]
  metadata?: Record<string, unknown>
  pets?: PetFormData[]
}
