import { computed, watchEffect, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { echoClient } from '../../lib/echo'
import router from '../../router'
import {
  listUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  notificationKeys,
} from '../../services/notificationService'
import type { NotificationRecord } from '../../services/notificationService'
import { sanitizePhone } from '../../lib/formatters'

let permissionRequested = false

function requestNotificationPermission() {
  if (permissionRequested) return
  permissionRequested = true
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showBrowserNotification(notification: NotificationRecord) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      data: { id: notification.id, appointment_id: notification.appointment_id, type: notification.type },
    })
    n.onclick = () => {
      window.focus()
      if (notification.appointment_id) {
        router.push({ path: '/admin', query: { appointment: notification.appointment_id } })
      }
      n.close()
    }
  } catch { /* browser might block */ }
}

export function useNotifications() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const { error: showError } = useNotification()

  const profileId = computed(() => authStore.profile?.id ?? null)
  const businessId = computed(() => authStore.businessId)

  const { data: unreadNotifications, isLoading } = useQuery({
    queryKey: computed(() => notificationKeys.unread(profileId.value)),
    queryFn: () => listUnreadNotifications(),
    enabled: computed(() => !!profileId.value),
  })

  const notifications = computed(() => unreadNotifications.value ?? [])
  const unreadCount = computed(() => notifications.value.length)

  const invalidate = () => {
    queryClient.invalidateQueries({ exact: false, queryKey: ['notifications'] }).catch(() => {})
  }

  // Real-time via Laravel Echo / Reverb
  watchEffect((onCleanup) => {
    if (!businessId.value) return

    const channel = echoClient.private(`business.${businessId.value}`)

    channel.listen('.entity.changed', (payload: any) => {
      if (payload?.entity === 'notification') {
        invalidate()
      }
    })

    onCleanup(() => {
      echoClient.leave(`business.${businessId.value}`)
    })
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: async () => { await invalidate() },
    onError: (err) => { showError(translateError(err, 'Error al marcar notificación')) },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: async () => { await invalidate() },
    onError: (err) => { showError(translateError(err, 'Error al marcar todas leídas')) },
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: async () => { await invalidate() },
    onError: (err) => { showError(translateError(err, 'Error al eliminar notificación')) },
  })

  // Request browser notification permission on mount
  requestNotificationPermission()

  // Show browser notification when new notifications arrive
  watch(notifications, (current, previous) => {
    if (!previous || previous.length === 0) return
    const newNotifs = current.filter(n => !previous.find(p => p.id === n.id))
    for (const n of newNotifs) {
      showBrowserNotification(n)
    }
  })

  const handleMarkAsRead = (id: string) => { markAsReadMutation.mutate(id) }
  const handleMarkAllAsRead = () => { markAllAsReadMutation.mutate() }
  const handleDismiss = (id: string) => { dismissMutation.mutate(id) }

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
    router.push('/admin/inventario')
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
