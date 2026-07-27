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
        <button @click="showPrefs = !showPrefs"
          class="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text"
          :class="showPrefs ? 'bg-bg-secondary text-text' : ''"
          title="Preferencias">
          <Settings :size="14" />
        </button>
      </div>
    </div>

    <!-- Preferences panel -->
    <div v-if="showPrefs" class="border-b border-border px-3 py-2.5 space-y-2 bg-bg-secondary/30 sm:px-4 sm:py-3">
      <p class="text-xs font-medium text-text-muted">Mostrar notificaciones de:</p>
      <label
        v-for="(label, type) in TYPE_LABELS"
        :key="type"
        class="flex items-center justify-between cursor-pointer"
      >
        <span class="text-xs text-text-secondary">{{ label }}</span>
        <button
          type="button"
          role="switch"
          :aria-checked="notifPrefs[type]"
          @click="toggleNotifType(type)"
          :class="[
            'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
            notifPrefs[type] ? 'bg-primary' : 'bg-border'
          ]"
        >
          <span
            :class="[
              'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
              notifPrefs[type] ? 'translate-x-3' : 'translate-x-0.5'
            ]"
          />
        </button>
      </label>
      <div class="border-t border-border/50 pt-2 mt-1">
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-xs font-medium text-text">Sonido</span>
          <button
            type="button"
            role="switch"
            :aria-checked="soundEnabled"
            @click="toggleSound()"
            :class="[
              'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
              soundEnabled ? 'bg-primary' : 'bg-border'
            ]"
          >
            <span
              :class="[
                'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                soundEnabled ? 'translate-x-3' : 'translate-x-0.5'
              ]"
            />
          </button>
        </label>
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
            <component :is="typeStyle[notif.type]?.icon ?? Bell" :size="14"
              class="sm:h-4 sm:w-4"
              :class="typeStyle[notif.type]?.color ?? 'text-text-muted'" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text leading-tight">{{ notif.title }}</p>
            <p class="text-xs text-text-secondary mt-0.5 leading-snug">{{ notif.message }}</p>
            <p class="mt-1 text-[11px] text-text-muted">{{ formatRelativeTime(notif.created_at) }}</p>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
          <template v-if="notif.type === 'reminder'">
            <button @click="handleSendWhatsApp(notif)"
              class="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 sm:px-3">
              <MessageCircle :size="14" />
              WhatsApp
            </button>
            <button @click="handleNavigateToAppointment(notif)"
              class="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:px-3">
              <Calendar :size="14" />
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
              <PackageOpen :size="14" />
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
              <Calendar :size="14" />
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
import { ref } from 'vue'
import { Bell, MessageCircle, Calendar, CheckCircle2, CalendarPlus, AlertTriangle, PackageOpen, Settings } from 'lucide-vue-next'
import { useNotifications } from '../../composables/common/useNotifications'
import type { NotifType } from '../../composables/common/useNotificationPrefs'

defineEmits<{ close: [] }>()

const { notifications, unreadCount, notifPrefs, toggleNotifType, soundEnabled, toggleSound, TYPE_LABELS, handleMarkAllAsRead, handleDismiss, handleSendWhatsApp, handleNavigateToAppointment, handleNavigateToInventory } = useNotifications()

const showPrefs = ref(false)

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
