import { computed, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
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
import { subscribeToPush, isPushSupported } from '../../services/pushService'
import { useNotificationPrefs } from './useNotificationPrefs'
import { playSound } from '../../lib/audioPlayer'

let permissionRequested = false

export async function requestNotificationPermission() {
  if (permissionRequested) return
  permissionRequested = true
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    if (isPushSupported()) {
      subscribeToPush()
    }
    return
  }
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    if (result === 'granted' && isPushSupported()) {
      subscribeToPush()
    }
  }
}

function showBrowserNotification(notification: NotificationRecord) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192.png',
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
  const { isTypeEnabled, getSoundForType, prefs: notifPrefs, soundEnabled, toggleType: toggleNotifType, toggleSound, TYPE_LABELS } = useNotificationPrefs()

  const profileId = computed(() => authStore.profile?.id ?? null)
  const businessId = computed(() => authStore.businessId)

  const { data: unreadNotifications, isLoading } = useQuery({
    queryKey: computed(() => notificationKeys.unread(profileId.value)),
    queryFn: () => listUnreadNotifications(),
    enabled: computed(() => !!profileId.value),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const rawNotifications = computed(() => unreadNotifications.value ?? [])
  const notifications = computed(() =>
    rawNotifications.value.filter(n => isTypeEnabled(n.type)),
  )
  const unreadCount = computed(() => notifications.value.length)

  const shownNotificationIds = new Set<string>()

  const invalidate = () => {
    queryClient.invalidateQueries({ exact: false, queryKey: ['notifications'] }).catch(() => {})
  }

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

  watch(notifications, (current, previous) => {
    if (!previous || previous.length === 0) return
    const newNotifs = current.filter(n => !previous.find(p => p.id === n.id) && !shownNotificationIds.has(n.id))
    for (const n of newNotifs) {
      shownNotificationIds.add(n.id)
      showBrowserNotification(n)
      const sound = getSoundForType(n.type)
      if (sound) playSound(sound)
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
    notifPrefs,
    toggleNotifType,
    soundEnabled,
    toggleSound,
    TYPE_LABELS,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDismiss,
    handleSendWhatsApp,
    handleNavigateToAppointment,
    handleNavigateToInventory,
  }
}
