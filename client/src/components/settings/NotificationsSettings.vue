<template>
  <SettingsSection :title="section.title" :description="section.description">
    <div class="divide-y divide-border">
      <!-- Recordatorios -->
      <SettingsGroup tone="info" :title="`Recordatorios de ${terms.appointments}`" :description="`Avisos automáticos antes de cada ${terms.appointment}.`" :icon="ICONS.reminders" class="pb-6">
        <SettingToggle setting-key="reminder_24h_enabled" :copy="copy.reminder_24h_enabled" />

        <div v-if="isOn('reminder_24h_enabled')" class="border-b border-border-subtle py-3.5">
          <span class="text-xs text-text-secondary">Avisar con estas anticipaciones antes de cada {{ terms.appointment }}:</span>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              v-for="(offset, idx) in reminderOffsets" :key="idx"
              class="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-elevated py-1 pl-3 pr-1.5 text-xs font-bold text-text"
            >
              {{ formatOffsetLabel(offset) }}
              <button type="button" :disabled="updating" aria-label="Quitar recordatorio"
                class="flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:bg-danger/10 hover:text-danger"
                @click="removeReminderOffset(idx)">×</button>
            </span>
            <span v-if="reminderOffsets.length === 0" class="text-xs italic text-text-muted">Sin recordatorios configurados — no se enviará ninguno.</span>
          </div>
          <div class="mt-2.5 flex items-center gap-2">
            <input v-model="newOffsetValue" type="number" min="0.1" max="720" step="0.5" placeholder="Ej. 24" aria-label="Anticipación"
              class="w-20 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary" />
            <select v-model="newOffsetUnit" aria-label="Unidad"
              class="rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary">
              <option value="hours">horas antes</option>
              <option value="minutes">minutos antes</option>
            </select>
            <button type="button" :disabled="updating || !newOffsetValue"
              class="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50"
              @click="addReminderOffset">+ Agregar</button>
          </div>
        </div>

        <SettingToggle v-if="businessStore.features.whatsapp_available" setting-key="whatsapp_reminders_enabled" :copy="copy.whatsapp_reminders_enabled" />
      </SettingsGroup>

      <!-- Reservas públicas -->
      <SettingsGroup tone="info" title="Reservas públicas" :description="`Un link para que tus ${terms.clients} reserven por su cuenta.`" :icon="ICONS.booking" class="py-6">
        <SettingToggle setting-key="enable_public_booking" :copy="copy.enable_public_booking" />
      </SettingsGroup>

      <!-- Push -->
      <SettingsGroup v-if="pushSupported" tone="info" title="Notificaciones push" description="Alertas en la pantalla de este dispositivo, incluso con la app cerrada." :icon="ICONS.push" class="pt-6">
        <div class="flex flex-wrap items-start justify-between gap-3 py-3.5">
          <div class="min-w-0">
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-text">En este navegador</p>
              <span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold" :class="pushBadge.class">
                <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                {{ pushBadge.label }}
              </span>
            </div>
            <p class="max-w-md text-xs text-text-muted">{{ pushExplanation }}</p>
          </div>

          <button v-if="pushPermission === 'granted'" :disabled="pushLoading"
            class="shrink-0 rounded-lg border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            @click="disablePush">{{ pushLoading ? 'Desactivando...' : 'Desactivar' }}</button>
          <button v-else-if="pushPermission === 'denied'" disabled
            class="shrink-0 cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-muted opacity-50">Bloqueado</button>
          <button v-else :disabled="pushLoading"
            class="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
            @click="enablePush">{{ pushLoading ? 'Activando...' : 'Activar' }}</button>
        </div>
      </SettingsGroup>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBusinessStore } from '../../store/business'
import { useBusinessFeatures } from '../../composables/common/useBusinessFeatures'
import { useNotification } from '../../composables/common/useNotification'
import { requestNotificationPermission } from '../../composables/common/useNotifications'
import { isPushSupported, unsubscribeFromPush } from '../../services/pushService'
import SettingsSection from './SettingsSection.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingToggle from './SettingToggle.vue'
import { sectionCopy, termsFrom, toggleCopy } from './featureCopy'

const businessStore = useBusinessStore()
const { updating, isOn, save } = useBusinessFeatures()
const { error: showError } = useNotification()

const terms = computed(() => termsFrom(businessStore.terminology))
const copy = computed(() => toggleCopy(terms.value))
const section = computed(() => sectionCopy(terms.value).notificaciones)

// ── reminder lead times ────────────────────────────────────────────────────
const reminderOffsets = ref<number[]>(
  Array.isArray(businessStore.features.appointment_reminder_offsets_hours)
    ? [...businessStore.features.appointment_reminder_offsets_hours].sort((a: number, b: number) => b - a)
    : [24, 1],
)
const newOffsetValue = ref('')
const newOffsetUnit = ref<'hours' | 'minutes'>('hours')

function formatOffsetLabel(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} antes`
  }
  if (Number.isInteger(hours)) return `${hours} ${hours === 1 ? 'hora' : 'horas'} antes`
  return `${hours} horas antes`
}

const saveReminderOffsets = () =>
  save({ appointment_reminder_offsets_hours: reminderOffsets.value }, `Anticipaciones de los recordatorios actualizadas`, 'No se pudieron actualizar los recordatorios.')

function addReminderOffset() {
  const raw = parseFloat(newOffsetValue.value)
  if (isNaN(raw) || raw <= 0) return
  const rounded = Math.round((newOffsetUnit.value === 'minutes' ? raw / 60 : raw) * 100) / 100
  if (rounded > 720) {
    showError('La anticipación máxima es de 720 horas (30 días).')
    return
  }
  if (reminderOffsets.value.some(o => Math.abs(o - rounded) < 0.001)) {
    newOffsetValue.value = ''
    return
  }
  reminderOffsets.value = [...reminderOffsets.value, rounded].sort((a, b) => b - a)
  newOffsetValue.value = ''
  saveReminderOffsets()
}

function removeReminderOffset(idx: number) {
  reminderOffsets.value = reminderOffsets.value.filter((_, i) => i !== idx)
  saveReminderOffsets()
}

// ── push notifications (per browser) ───────────────────────────────────────
const pushSupported = isPushSupported()
const pushPermission = ref<NotificationPermission>('default')
const pushLoading = ref(false)

onMounted(() => {
  if (pushSupported) pushPermission.value = Notification.permission
})

const pushBadge = computed(() =>
  pushPermission.value === 'granted'
    ? { label: 'Activadas', class: 'bg-success/10 border-success/30 text-success' }
    : pushPermission.value === 'denied'
      ? { label: 'Bloqueadas', class: 'bg-danger/10 border-danger/30 text-danger' }
      : { label: 'No configuradas', class: 'bg-bg-secondary border-border text-text-muted' },
)

const pushExplanation = computed(() =>
  pushPermission.value === 'granted'
    ? `Recibirás alertas de nuevas ${terms.value.appointments} y recordatorios aunque tengas la app en segundo plano.`
    : pushPermission.value === 'denied'
      ? 'El navegador tiene bloqueadas las notificaciones de este sitio. Permítelas desde los ajustes del navegador y vuelve aquí.'
      : 'Recibe recordatorios y alertas directamente en tu pantalla, incluso con la app cerrada.',
)

async function enablePush() {
  pushLoading.value = true
  try {
    await requestNotificationPermission()
    pushPermission.value = Notification.permission
  } finally {
    pushLoading.value = false
  }
}

async function disablePush() {
  pushLoading.value = true
  try {
    await unsubscribeFromPush()
    pushPermission.value = Notification.permission
  } finally {
    pushLoading.value = false
  }
}

const ICONS = {
  reminders: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  booking: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  push: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
}
</script>
