import { apiRequest } from '../lib/api'

export interface PublicBusiness {
  id: string
  name: string
  timezone: string
  currency: string
  niche_type: string | null
  theme_config: any
  terminology: any
  phone: string | null
  address: string | null
  features: Record<string, boolean> | null
}

export interface PublicService {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  color: string | null
  branch_id: string | null
}

export interface PublicEmployee {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface TimeSlot {
  start: string
  end: string
}

export const publicBookingKeys = {
  business: (slug: string) => ['public-business', slug] as const,
  services: (slug: string) => ['public-services', slug] as const,
  slots: (slug: string, employeeId: string, serviceId: string, from: string, to: string) =>
    ['public-slots', slug, employeeId, serviceId, from, to] as const,
}

export const getBusinessPublic = async (slug: string) =>
  apiRequest<PublicBusiness>('GET', `/public/business/${slug}`)

export const getEmployeePublic = async (slug: string, employeeId: string) =>
  apiRequest<PublicEmployee>('GET', `/public/business/${slug}/employee/${employeeId}`)

export const listPublicServices = async (slug: string) =>
  apiRequest<PublicService[]>('GET', `/public/business/${slug}/services`)

export const getAvailableSlots = async (
  slug: string,
  employeeId: string,
  serviceId: string,
  from: string,
  to: string,
) =>
  apiRequest<TimeSlot[]>('GET', `/public/business/${slug}/slots?employee_id=${employeeId}&service_id=${serviceId}&from=${from}&to=${to}`)

export const getCalendarData = async (
  slug: string,
  employeeId: string,
  from: string,
  to: string,
) =>
  apiRequest<{
    employee: PublicEmployee
    schedules: Array<{ weekday: number; start_time: string; end_time: string }>
    occupied: Array<{ start: string; end: string; status: string }>
    absences: Array<{ start: string; end: string; type: string }>
  }>('GET', `/public/business/${slug}/calendar/${employeeId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)

export const submitBookingRequest = async (
  slug: string,
  data: {
    employee_id: string
    service_id: string
    start_time: string
    branch_id?: string
    client_name?: string
  },
) =>
  apiRequest<{ appointment_id: string; start_time: string; end_time: string; status: string }>(
    'POST',
    `/public/business/${slug}/request`,
    data,
  )
