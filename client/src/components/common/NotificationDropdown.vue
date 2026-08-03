<template>
  <div
    class="fixed left-2 right-2 top-16 z-50 rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-w-none"
  >
    <div class="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
      <h3 class="text-sm font-semibold text-text">Notificaciones</h3>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <span v-if="unreadCount > 0" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {{ unreadCount }}
        </span>
        <button v-if="notifications.length > 1" @click="handleMarkAllAsRead"
          class="rounded-md px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text sm:text-xs"
          title="Marcar todas leídas">
          <span class="hidden sm:inline">Marcar todas</span>
          <span class="sm:hidden">Todas</span>
        </button>
      </div>
    </div>

    <div class="max-h-[min(24rem,70vh)] overflow-y-auto touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
      <div v-if="notifications.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
        No hay notificaciones
      </div>

      <div v-for="notif in notifications" :key="notif.id"
        class="border-b border-border/50 px-3 py-2.5 last:border-b-0 hover:bg-bg-secondary/40 transition-theme sm:px-4 sm:py-3">
        <div class="flex items-start gap-2.5 sm:gap-3">
          <div :class="[
            'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full',
            typeStyle[notif.type]?.bg ?? 'bg-bg-secondary',
          ]">
            <component :is="typeStyle[notif.type]?.icon ?? BellIcon" :size="14"
              class="sm:h-4 sm:w-4"
              :class="typeStyle[notif.type]?.color ?? 'text-text-muted'" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-text leading-tight">{{ notif.title }}</p>
              <span v-if="notif.branch_name" class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {{ notif.branch_name }}
              </span>
            </div>
            <p class="text-xs text-text-secondary mt-0.5 leading-snug">{{ notif.message }}</p>
            <p class="mt-1 text-[11px] text-text-muted">{{ formatRelativeTime(notif.created_at) }}</p>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
          <template v-if="notif.type === 'reminder'">
            <button @click="handleSendWhatsApp(notif)"
              class="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 sm:px-3">
            <ChatRoundDotsIcon :size="14" />
              WhatsApp
            </button>
            <button @click="handleNavigateToAppointment(notif)"
              class="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:px-3">
              <CalendarIcon :size="14" />
              Ver cita
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary sm:px-3">
              Ignorar
            </button>
          </template>

          <template v-else-if="notif.type === 'low_stock'">
            <button @click="handleNavigateToInventory"
              class="flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20 sm:px-3">
              <BoxIcon :size="14" />
              Ver inventario
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary sm:px-3">
              Ignorar
            </button>
          </template>

          <template v-else>
            <button @click="handleNavigateToAppointment(notif)"
              class="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:px-3">
              <CalendarIcon :size="14" />
              Ver cita
            </button>
            <button @click="handleDismiss(notif.id)"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-secondary sm:px-3">
              Ignorar
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BellIcon, ChatRoundDotsIcon, CalendarIcon, CheckCircleIcon, CalendarAddIcon, DangerTriangleIcon, BoxIcon, CupIcon, ClockCircleIcon } from '@solar-icons/vue/linear'
import { useNotifications } from '../../composables/common/useNotifications'

defineEmits<{ close: [] }>()

const { notifications, unreadCount, handleMarkAllAsRead, handleDismiss, handleSendWhatsApp, handleNavigateToAppointment, handleNavigateToInventory } = useNotifications()

const typeStyle: Record<string, { icon: typeof BellIcon; bg: string; color: string }> = {
  reminder: { icon: BellIcon, bg: 'bg-primary/10', color: 'text-primary' },
  status_change: { icon: CheckCircleIcon, bg: 'bg-success/10', color: 'text-success' },
  new_appointment: { icon: CalendarAddIcon, bg: 'bg-info/10', color: 'text-info' },
  unpaid_alert: { icon: DangerTriangleIcon, bg: 'bg-warning/10', color: 'text-warning' },
  low_stock: { icon: BoxIcon, bg: 'bg-danger/10', color: 'text-danger' },
  pet_birthday: { icon: CupIcon, bg: 'bg-pink-500/10', color: 'text-pink-500' },
  pending_appointments: { icon: ClockCircleIcon, bg: 'bg-amber-500/10', color: 'text-amber-500' },
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
