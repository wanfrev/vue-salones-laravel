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

// A nivel de módulo para que varios componentes que usen el composable a la vez
// no muestren la misma notificación (ni repitan el sonido) dos veces.
const shownNotificationIds = new Set<string>()
let shownIdsSeeded = false

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

async function showBrowserNotification(notification: NotificationRecord) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body: notification.message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: notification.id,
    data: {
      id: notification.id,
      type: notification.type,
      url: notification.appointment_id
        ? `/admin?appointment=${notification.appointment_id}`
        : '/admin',
    },
  }

  // En Android/Chrome el constructor `new Notification()` lanza "Illegal
  // constructor": solo el service worker puede mostrar notificaciones.
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(notification.title, options)
      return
    } catch { /* sin SW disponible, se intenta el fallback de escritorio */ }
  }

  try {
    const n = new Notification(notification.title, options)
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

  // La primera lista que llega son notificaciones ya existentes: se marcan como
  // vistas sin avisar. A partir de ahí, cualquier id nuevo dispara aviso, incluso
  // si la bandeja estaba vacía.
  const seedShownIds = (list: NotificationRecord[]) => {
    for (const n of list) shownNotificationIds.add(n.id)
    shownIdsSeeded = true
  }

  if (unreadNotifications.value) seedShownIds(notifications.value)

  watch(notifications, (current) => {
    if (!shownIdsSeeded) {
      seedShownIds(current)
      return
    }
    const newNotifs = current.filter(n => !shownNotificationIds.has(n.id))
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
