<template>
  <div class="space-y-4">
    <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">
        {{ isEditing ? 'Editar nota de sesión' : 'Nueva nota de sesión' }}
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormInput v-model="form.session_date" type="date" label="Fecha de la sesión" required />
        <FormInput v-model="form.duration_minutes" type="number" label="Duración (min)" placeholder="50" />
        <FormSelect :model-value="form.risk_level" @update:model-value="form.risk_level = $event as ClinicalRiskLevel" label="Nivel de riesgo" :options="RISK_OPTIONS" />
        <FormSelect v-model="form.mood_rating" label="Ánimo reportado (1-10)" :options="MOOD_OPTIONS" />
      </div>

      <FormSelect
        :model-value="form.appointment_id"
        @update:model-value="onAppointmentChange"
        label="Vincular con una cita de la agenda"
        :options="appointmentOptions"
        hint="Opcional. Al elegir una cita se toma su fecha."
      />

      <FormTextarea
        v-for="field in SOAP_FIELDS"
        :key="field.key"
        v-model="form.content[field.key]"
        :label="field.label"
        :hint="field.hint"
        :rows="4"
        :show-char-count="false"
      />

      <FormTextarea v-model="form.tasks" label="Tareas para el paciente" :rows="2" placeholder="Ejercicios, registros, lecturas entre sesiones..." :show-char-count="false" />
    </div>

    <div class="flex justify-end gap-3">
      <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
        Cancelar
      </button>
      <button
        @click="handleSave"
        :disabled="!canSave || saving"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        {{ saving ? 'Guardando...' : 'Guardar nota' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { FormInput, FormSelect, FormTextarea } from '../forms'
import { formatDateTime, toISODate } from '../../lib/formatters'
import { RISK_OPTIONS, SOAP_FIELDS, isSessionNoteSavable, payloadFromForm, type SessionNoteForm } from './sessionNotes'
import type { SessionNotePayload } from '../../services/clinical/sessionNoteService'
import type { ClinicalRiskLevel, SessionAppointmentOption } from '../../types/database'

const props = defineProps<{
  /** Valores iniciales — se copian al montar; el formulario edita su propia copia, nunca la del padre. */
  initial: SessionNoteForm
  appointments: SessionAppointmentOption[]
  saving: boolean
  isEditing: boolean
}>()

const emit = defineEmits<{ save: [payload: SessionNotePayload]; cancel: [] }>()

const form = reactive<SessionNoteForm>({ ...props.initial, content: { ...props.initial.content } })

const MOOD_OPTIONS = [
  { value: '', label: 'Sin registrar' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]

const appointmentOptions = computed(() => [
  { value: '', label: 'Sin cita vinculada' },
  ...props.appointments.map(a => ({
    value: a.id,
    label: `${a.start_time ? formatDateTime(a.start_time) : 'Sin fecha'}${a.service_name ? ` — ${a.service_name}` : ''}`,
  })),
])

const canSave = computed(() => isSessionNoteSavable(form))

function onAppointmentChange(id: string) {
  form.appointment_id = id
  const appt = props.appointments.find(a => a.id === id)
  if (appt?.start_time) form.session_date = toISODate(appt.start_time)
}

function handleSave() {
  if (!canSave.value || props.saving) return
  emit('save', payloadFromForm(form))
}
</script>
