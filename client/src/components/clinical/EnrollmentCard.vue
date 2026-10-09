<template>
  <article class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-base font-bold text-text">{{ enrollment.program_name }}</p>
        <p class="mt-0.5 text-xs text-text-muted">
          ${{ enrollment.price }} · {{ enrollment.sessions_total }} sesiones · del {{ formatDateHuman(enrollment.starts_on) }} al {{ formatDateHuman(enrollment.expires_on) }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ENROLLMENT_STATUS_TONE[enrollment.status]">{{ ENROLLMENT_STATUS_LABELS[enrollment.status] }}</span>
        <span v-if="enrollment.status !== 'cancelled'" class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="enrollment.is_paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
          {{ enrollment.is_paid ? 'Pagado' : 'Por cobrar en el POS' }}
        </span>
      </div>
    </header>

    <div class="mt-3">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-semibold text-text">{{ progressLabel(enrollment.used, enrollment.sessions_total) }} sesiones realizadas</span>
        <span class="text-xs text-text-muted">{{ enrollment.remaining }} por usar</span>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-secondary" role="progressbar" :aria-valuenow="enrollment.used" aria-valuemin="0" :aria-valuemax="enrollment.sessions_total">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${percent}%` }"></div>
      </div>
      <p v-if="enrollment.status === 'expired'" class="mt-2 text-xs text-warning">Venció con {{ enrollment.remaining }} sesiones sin usar. Administración puede extender la vigencia.</p>
    </div>

    <ul class="mt-3 divide-y divide-border-subtle">
      <li v-for="s in enrollment.sessions" :key="s.appointment_id" class="flex flex-wrap items-center justify-between gap-2 py-2">
        <div class="min-w-0">
          <p class="truncate text-sm text-text">
            <span class="font-semibold">N.º {{ s.number }}</span>
            · {{ s.start_time ? formatDateTime(s.start_time) : 'Sin fecha' }}
            <span v-if="s.service_name" class="text-text-muted"> — {{ s.service_name }}</span>
          </p>
          <p class="text-xs text-text-muted">
            {{ SESSION_STATUS_LABELS[s.status] ?? s.status }}<span v-if="s.employee_name"> · {{ s.employee_name }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="s.counted ? 'bg-primary/10 text-primary' : 'bg-bg-secondary text-text-muted'">
            {{ s.counted ? 'Cuenta' : 'No cuenta' }}<span v-if="s.consumes !== null"> (manual)</span>
          </span>
          <select
            v-if="isAdmin && enrollment.status !== 'cancelled'"
            :value="consumesValue(s.consumes)"
            :aria-label="`Criterio de la sesión ${s.number}`"
            @change="onConsumes(s.appointment_id, ($event.target as HTMLSelectElement).value)"
            class="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
          >
            <option value="auto">Automático</option>
            <option value="yes">Contarla</option>
            <option value="no">No contarla</option>
          </select>
        </div>
      </li>
    </ul>
    <p class="mt-2 text-xs text-text-muted">Una sesión cuenta cuando se realizó o el paciente no asistió; una cita cancelada no cuenta.</p>

    <footer v-if="isAdmin && enrollment.status !== 'cancelled'" class="mt-3 flex flex-wrap items-end gap-3 border-t border-border-subtle pt-3">
      <div class="flex items-end gap-2">
        <FormInput v-model="newExpiry" type="date" label="Extender vigencia hasta" class="w-44" />
        <button type="button" @click="$emit('extend', newExpiry)" :disabled="!newExpiry || newExpiry === enrollment.expires_on" class="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-50">Guardar</button>
      </div>
      <button v-if="!enrollment.is_paid" type="button" @click="confirmCancel" class="ml-auto rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-danger transition-theme hover:bg-danger/5">Cancelar programa</button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FormInput } from '../forms'
import { ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_TONE, SESSION_STATUS_LABELS, progressLabel } from './programs'
import { formatDateHuman, formatDateTime } from '../../lib/formatters'
import type { ClinicalEnrollment } from '../../types/database'

const props = defineProps<{ enrollment: ClinicalEnrollment; isAdmin: boolean }>()
const emit = defineEmits<{
  extend: [expiresOn: string]
  cancel: []
  consumes: [appointmentId: string, value: boolean | null]
}>()

const newExpiry = ref(props.enrollment.expires_on)
watch(() => props.enrollment.expires_on, v => { newExpiry.value = v })

const percent = computed(() => (props.enrollment.sessions_total > 0 ? Math.min(100, Math.round((props.enrollment.used / props.enrollment.sessions_total) * 100)) : 0))

const consumesValue = (v: boolean | null) => (v === null ? 'auto' : v ? 'yes' : 'no')

function onConsumes(appointmentId: string, value: string) {
  emit('consumes', appointmentId, value === 'auto' ? null : value === 'yes')
}

function confirmCancel() {
  if (window.confirm('¿Cancelar este programa? Se eliminan todas sus citas del calendario. Solo es posible mientras no se haya cobrado ni realizado ninguna sesión.')) emit('cancel')
}
</script>
