import { computed, watchEffect } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '../store/auth'
import { useNotification } from './useNotification'
import { api as supabase } from '../lib/api'
import router from '../router'
import {
  listUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  notificationKeys,
} from '../services/notificationService'
import type { NotificationRecord } from '../services/notificationService'
import { sanitizePhone } from '../lib/formatters'

export function useNotifications() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const { error: showError } = useNotification()

  const profileId = computed(() => authStore.profile?.id ?? null)

  const { data: unreadNotifications, isLoading } = useQuery({
    queryKey: computed(() => notificationKeys.unread(profileId.value)),
    queryFn: () => listUnreadNotifications(profileId.value!),
    enabled: computed(() => !!profileId.value),
  })

  const notifications = computed(() => unreadNotifications.value ?? [])
  const unreadCount = computed(() => notifications.value.length)

  const invalidate = () => {
    queryClient.invalidateQueries({ exact: false, queryKey: ['notifications'] }).catch(() => {})
  }

  // Real-time channel: listen for new notifications
  watchEffect((onCleanup) => {
    if (!profileId.value) return

    const channel = supabase
      .channel(`notifications-${profileId.value}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId.value}`,
        },
        () => {
          invalidate()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId.value}`,
        },
        () => {
          invalidate()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId.value}`,
        },
        () => {
          invalidate()
        },
      )
      .subscribe()

    onCleanup(() => {
      supabase.removeChannel(channel)
    })
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: async () => {
      await invalidate()
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Error al marcar notificación')
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(profileId.value!),
    onSuccess: async () => {
      await invalidate()
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Error al marcar todas leídas')
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: async () => {
      await invalidate()
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Error al eliminar notificación')
    },
  })

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id)
  }

  const handleSendWhatsApp = (notification: NotificationRecord) => {
    handleMarkAsRead(notification.id)
    const phone = sanitizePhone(notification.client_phone ?? '')
    if (phone) window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleNavigateToAppointment = (notification: NotificationRecord) => {
    handleMarkAsRead(notification.id)
    if (notification.appointment_id) {
      router.push({ path: '/admin', query: { appointment: notification.appointment_id } })
    }
  }

  const handleNavigateToInventory = () => {
    router.push('/inventario')
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDismiss,
    handleSendWhatsApp,
    handleNavigateToAppointment,
    handleNavigateToInventory,
  }
}
