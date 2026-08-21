import type { Role } from '../constants/roles'

export interface AuthProfile {
  id: string
  business_id: string | null
  branch_id: string | null
  full_name: string
  role: Role
  email?: string | null
  phone: string | null
  avatar_url: string | null
  job_title?: string | null
  pay_type?: 'salary' | 'percentage' | 'mixed' | null
  pay_percentage?: number | null
  base_salary?: number | null
  disable_agenda?: boolean
  disable_inventory_edit?: boolean
  can_create_appointments?: boolean
  can_create_clients?: boolean
  can_access_consultorio?: boolean
  can_access_inventory?: boolean
  can_access_pos?: boolean
  can_access_suppliers?: boolean
  can_access_finanzas?: boolean
  can_access_requirements?: boolean
  can_add_purchase_invoice?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}
