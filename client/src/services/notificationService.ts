import { api as supabase, api as mutate } from '../lib/api'

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

export const listUnreadNotifications = async (profileId: string): Promise<NotificationRecord[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as NotificationRecord[]
}

export const markNotificationAsRead = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export const markAllNotificationsAsRead = async (profileId: string): Promise<void> => {
  const { error } = await mutate
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .eq('is_read', false)

  if (error) throw error
}

export const dismissNotification = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error
}
