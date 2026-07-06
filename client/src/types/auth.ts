import type { Role } from '../constants/roles'

export interface AuthProfile {
  id: string
  business_id: string | null
  full_name: string
  role: Role
  phone: string | null
  avatar_url: string | null
  job_title?: string | null
  pay_type?: 'salary' | 'percentage' | 'mixed' | null
  pay_percentage?: number | null
  base_salary?: number | null
  disable_agenda?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}
