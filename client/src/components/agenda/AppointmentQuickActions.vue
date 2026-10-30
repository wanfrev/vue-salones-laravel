<template>
  <div v-if="hasAny" class="mb-3 space-y-2 border-t border-border pt-3" data-testid="quick-actions">
    <div class="flex flex-wrap gap-1.5">
      <button v-if="actions.confirm" type="button" :class="primaryBtn" data-testid="qa-confirm" @click="emit('confirm')">Confirmar</button>
      <button v-if="actions.pay" type="button" :class="primaryBtn" data-testid="qa-pay" @click="emit('pay')">Cobrar</button>
      <button v-if="actions.checkIn" type="button" :class="plainBtn" data-testid="qa-checkin" @click="emit('checkIn', actions.checkIn === 'in')">
        {{ actions.checkIn === 'in' ? 'Sala de espera' : 'Sacar de sala' }}
      </button>
      <button v-if="actions.reschedule" type="button" :class="plainBtn" data-testid="qa-reschedule" :aria-expanded="rescheduling" @click="toggleReschedule">Reprogramar</button>
      <a v-if="actions.whatsappUrl" :href="actions.whatsappUrl" target="_blank" rel="noopener noreferrer" :class="plainBtn" data-testid="qa-whatsapp">WhatsApp</a>
    </div>

    <div v-if="rescheduling" class="flex flex-wrap items-end gap-2" data-testid="qa-reschedule-form">
      <label class="flex flex-col text-[10px] font-medium text-text-muted">Día
        <input v-model="date" type="date" class="mt-0.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary" />
      </label>
      <label class="flex flex-col text-[10px] font-medium text-text-muted">Hora
        <input v-model="time" type="time" class="mt-0.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary" />
      </label>
      <button type="button" :disabled="!range" :class="[primaryBtn, !range ? 'opacity-50' : '']" data-testid="qa-move" @click="move">Mover</button>
      <button type="button" :class="plainBtn" @click="rescheduling = false">Cancelar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { quickActions, rescheduledRange } from './quickActions'

const props = defineProps<{
  appt: {
    status: string
    isGroup: boolean
    clientId?: string | null
    phone?: string | null
    checkedIn: boolean
    startIso: string
    endIso: string
  }
  isDental: boolean
}>()

const emit = defineEmits<{
  confirm: []
  pay: []
  checkIn: [next: boolean]
  reschedule: [range: { start: string; end: string }]
}>()

const actions = computed(() => quickActions({
  status: props.appt.status,
  isGroup: props.appt.isGroup,
  phone: props.appt.phone,
  isDental: props.isDental,
  checkedIn: props.appt.checkedIn,
  clientId: props.appt.clientId,
}))

const hasAny = computed(() => actions.value.confirm || actions.value.pay || !!actions.value.checkIn || actions.value.reschedule || !!actions.value.whatsappUrl)

const pad = (n: number) => String(n).padStart(2, '0')
const rescheduling = ref(false)
const date = ref('')
const time = ref('')

const toggleReschedule = () => {
  if (!rescheduling.value) {
    const start = new Date(props.appt.startIso)
    date.value = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    time.value = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  }
  rescheduling.value = !rescheduling.value
}

const range = computed(() => rescheduledRange(props.appt.startIso, props.appt.endIso, date.value, time.value))

const move = () => {
  if (range.value) emit('reschedule', range.value)
}

const primaryBtn = 'rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15'
const plainBtn = 'rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text'
</script>
