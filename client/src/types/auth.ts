import type { Role } from '../constants/roles'

export interface AuthProfile {
  id: string
  business_id: string | null
  branch_id: string | null
  full_name: string
  role: Role
  phone: string | null
  avatar_url: string | null
  job_title?: string | null
  pay_type?: 'salary' | 'percentage' | 'mixed' | null
  pay_percentage?: number | null
  base_salary?: number | null
  disable_agenda?: boolean
  disable_inventory_edit?: boolean
  can_create_appointments?: boolean
  can_access_consultorio?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}
