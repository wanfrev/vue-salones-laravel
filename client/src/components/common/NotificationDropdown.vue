<template>
  <div class="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg z-50">
    <div class="flex items-center justify-between border-b border-border px-4 py-3">
      <h3 class="text-sm font-semibold text-text">Notificaciones</h3>
      <div class="flex items-center gap-2">
        <span v-if="unreadCount > 0" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {{ unreadCount }}
        </span>
        <button v-if="notifications.length > 1" @click="handleMarkAllAsRead"
          class="rounded-md px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text">
          Marcar todas leídas
        </button>
      </div>
    </div>

    <div class="max-h-80 overflow-y-auto">
      <div v-if="notifications.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
        No hay notificaciones
      </div>

      <div v-for="notif in notifications" :key="notif.id"
        class="border-b border-border/50 px-4 py-3 last:border-b-0 hover:bg-bg-secondary/40 transition-theme">
        <div class="flex items-start gap-3">
          <div :class="[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            typeStyle[notif.type]?.bg ?? 'bg-bg-secondary',
          ]">
            <component :is="typeStyle[notif.type]?.icon ?? Bell" :size="16"
              :class="typeStyle[notif.type]?.color ?? 'text-text-muted'" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text leading-tight">{{ notif.title }}</p>
            <p class="text-xs text-text-secondary mt-0.5 leading-snug">{{ notif.message }}</p>
            <p class="mt-1 text-[11px] text-text-muted">{{ formatRelativeTime(notif.created_at) }}</p>
          </div>
        </div>

        <div class="mt-2 flex gap-2">
          <template v-if="notif.type === 'reminder'">
            <button @click="handleSendWhatsApp(notif)"
              class="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20">
              <MessageCircle :size="14" />
              WhatsApp
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary">
              Ignorar
            </button>
          </template>

          <template v-else-if="notif.type === 'low_stock'">
            <button @click="handleNavigateToInventory"
              class="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20">
              <PackageOpen :size="14" />
              Ver inventario
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary">
              Ignorar
            </button>
          </template>

          <template v-else>
            <button @click="handleNavigateToAppointment(notif)"
              class="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
              <Calendar :size="14" />
              Ver cita
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary">
              Ignorar
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell, MessageCircle, Calendar, CheckCircle2, CalendarPlus, AlertTriangle, PackageOpen } from 'lucide-vue-next'
import { useNotifications } from '../../composables/common/useNotifications'

defineEmits<{ close: [] }>()

const { notifications, unreadCount, handleMarkAllAsRead, handleDismiss, handleSendWhatsApp, handleNavigateToAppointment, handleNavigateToInventory } = useNotifications()

const typeStyle: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  reminder: { icon: Bell, bg: 'bg-primary/10', color: 'text-primary' },
  status_change: { icon: CheckCircle2, bg: 'bg-success/10', color: 'text-success' },
  new_appointment: { icon: CalendarPlus, bg: 'bg-info/10', color: 'text-info' },
  unpaid_alert: { icon: AlertTriangle, bg: 'bg-warning/10', color: 'text-warning' },
  low_stock: { icon: PackageOpen, bg: 'bg-danger/10', color: 'text-danger' },
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return 'Ahora mismo'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>
