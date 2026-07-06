import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])
let idCounter = 0

export function useNotification() {
  const show = (message: string, type: NotificationType = 'info', duration: number = 3000) => {
    const id = `notification-${++idCounter}`
    const notification: Notification = { id, type, message, duration }
    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  const remove = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const success = (message: string, duration?: number) => show(message, 'success', duration)
  const error = (message: string, duration?: number) => show(message, 'error', duration)
  const warning = (message: string, duration?: number) => show(message, 'warning', duration)
  const info = (message: string, duration?: number) => show(message, 'info', duration)

  return {
    notifications,
    show,
    remove,
    success,
    error,
    warning,
    info,
  }
}
