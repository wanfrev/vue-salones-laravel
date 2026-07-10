import { apiRequest } from '../lib/api'

export type NotificationType = 'reminder' | 'status_change' | 'new_appointment' | 'unpaid_alert' | 'low_stock'

export interface NotificationRecord {
  id: string
  business_id: string
  profile_id: string
  type: NotificationType
  title: string
  message: string
  appointment_id: string | null
  client_name: string | null
  client_phone: string | null
  service_name: string | null
  appointment_time: string | null
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export const notificationKeys = {
  all: (profileId?: string | null) => ['notifications', profileId] as const,
  unread: (profileId?: string | null) => ['notifications', profileId, 'unread'] as const,
}

export const listUnreadNotifications = async (): Promise<NotificationRecord[]> => {
  return await apiRequest<NotificationRecord[]>('GET', '/notifications?unread_only=true')
}

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await apiRequest<void>('PATCH', `/notifications/${id}/read`)
}

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiRequest<void>('PATCH', '/notifications/read-all')
}

export const dismissNotification = async (id: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/notifications/${id}`)
}
