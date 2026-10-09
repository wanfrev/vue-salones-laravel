<template>
  <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Inscribir en un programa</p>

    <div v-if="!patient">
      <PatientPicker label="Paciente" placeholder="Busca por nombre o teléfono" @select="picked = $event" />
      <p v-if="picked" class="mt-2 text-sm text-text">
        Paciente: <strong>{{ picked.full_name }}</strong>
        <button type="button" @click="picked = null" class="ml-2 text-xs font-semibold text-text-muted hover:text-danger">Cambiar</button>
      </p>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormSelect v-model="programId" label="Programa" placeholder="Elige un programa" :options="programOptions" />
      <FormSelect v-model="employeeId" label="Profesional" placeholder="Elige un profesional" :options="employeeOptions" />
    </div>

    <template v-if="program">
      <p class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-text-secondary">
        {{ program.sessions_total }} sesiones por ${{ program.price }} · vigencia de {{ program.validity_days }} días. Las citas se crean ahora en el calendario y el programa se cobra junto en el punto de venta.
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_9rem_1fr]">
        <FormInput v-model="startDate" type="date" label="Primera sesión desde" />
        <FormInput v-model="time" type="time" label="Hora" />
        <div>
          <p class="mb-1.5 text-sm font-medium text-text-secondary">Días de la semana</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="d in WEEKDAYS"
              :key="d.value"
              type="button"
              :aria-pressed="weekdays.includes(d.value)"
              @click="toggleDay(d.value)"
              class="rounded-lg border px-2.5 py-2 text-xs font-semibold transition-theme"
              :class="weekdays.includes(d.value) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/30'"
            >{{ d.label }}</button>
          </div>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-text-secondary">Sesiones <span class="font-normal text-text-muted">— puedes ajustar la fecha de cada una; también las podrás mover luego en el calendario</span></p>
        <ul class="space-y-2">
          <li v-for="(r, i) in rows" :key="i" class="grid grid-cols-1 items-center gap-2 rounded-lg border border-border-subtle bg-bg-secondary/40 p-2 sm:grid-cols-[4.5rem_14rem_1fr]">
            <span class="text-sm font-semibold text-text">N.º {{ i + 1 }}</span>
            <input
              type="datetime-local"
              v-model="r.start"
              :aria-label="`Fecha y hora de la sesión ${i + 1}`"
              class="min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <select v-if="allowed(i).length > 1" v-model="r.serviceId" :aria-label="`Servicio de la sesión ${i + 1}`" class="min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary">
              <option v-for="id in allowed(i)" :key="id" :value="id">{{ serviceName(id) }}</option>
            </select>
            <span v-else class="truncate text-sm text-text-muted">{{ serviceName(r.serviceId) }}</span>
          </li>
        </ul>
        <p v-if="rows.length > 0 && !withinValidity" class="mt-2 text-xs font-semibold text-warning">
          Con estos días las {{ rows.length }} sesiones no caben en los {{ program.validity_days }} días del programa: elige más días de la semana o adelanta fechas.
        </p>
        <p v-if="rows.length > 0" class="mt-2 text-xs text-text-muted">Vence el {{ expires }}: pasada esa fecha las sesiones sin usar se pierden (administración puede extenderla).</p>
        <p v-else class="text-xs text-text-muted">Elige al menos un día de la semana para proponer las fechas.</p>
      </div>
    </template>

    <p v-if="problem && touched" class="text-sm text-danger">{{ problem }}</p>

    <div class="flex justify-end gap-3">
      <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
      <button @click="handleSubmit" :disabled="saving || !program" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
        {{ saving ? 'Creando citas...' : 'Inscribir y crear citas' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FormInput, FormSelect } from '../forms'
import PatientPicker, { type PickedPatient } from './PatientPicker.vue'
import {
  WEEKDAYS, allowedServicesForSlot, dateOnly, defaultSlotServices, expiryDate, fitsValidity, hasDuplicateStarts, proposeSchedule, scheduleProblem, toUtcIso,
  type ScheduleRow,
} from './programs'
import { formatDateHuman } from '../../lib/formatters'
import type { EnrollPayload } from '../../services/clinical/programService'
import type { ClinicalProgram } from '../../types/database'

const props = defineProps<{
  /** Si viene, el paciente ya está elegido (se inscribe desde su expediente). */
  patient?: { id: string; full_name: string } | null
  programs: ClinicalProgram[]
  employees: Array<{ id: string; name: string }>
  branchId?: string | null
  saving: boolean
}>()
const emit = defineEmits<{ submit: [value: { clientId: string; payload: EnrollPayload }]; cancel: [] }>()

const pad = (n: number) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const picked = ref<PickedPatient | null>(null)
const programId = ref('')
const employeeId = ref('')
const startDate = ref(today())
const time = ref('16:00')
const weekdays = ref<number[]>([1, 4])
const rows = reactive<ScheduleRow[]>([])
const touched = ref(false)

const program = computed(() => props.programs.find(p => p.id === programId.value) ?? null)
const programOptions = computed(() => props.programs.map(p => ({ value: p.id, label: `${p.name} · ${p.sessions_total} sesiones · $${p.price}` })))
const employeeOptions = computed(() => props.employees.map(e => ({ value: e.id, label: e.name })))

const serviceNames = computed(() => new Map(props.programs.flatMap(p => p.components.flatMap(c => c.services.map(s => [s.id, s.name] as const)))))
const serviceName = (id: string) => serviceNames.value.get(id) ?? 'Servicio'
const allowed = (slot: number) => (program.value ? allowedServicesForSlot(program.value, slot) : [])

const expires = computed(() => {
  if (!rows[0] || !program.value) return ''
  const first = [...rows].map(r => r.start).sort()[0]
  return formatDateHuman(expiryDate(dateOnly(first), program.value.validity_days))
})
const withinValidity = computed(() => !program.value || fitsValidity(rows.map(r => r.start), program.value.validity_days))

// Cambiar programa, fecha, hora o días recalcula la propuesta (descarta los ajustes manuales de las filas).
watch([program, startDate, time, weekdays], () => {
  const p = program.value
  if (!p) { rows.splice(0); return }
  const dates = proposeSchedule({ count: p.sessions_total, startDate: startDate.value, time: time.value, weekdays: weekdays.value })
  const services = defaultSlotServices(p)
  rows.splice(0, rows.length, ...dates.map((start, i) => ({ start, serviceId: services[i] })))
}, { deep: true })

function toggleDay(d: number) {
  const i = weekdays.value.indexOf(d)
  weekdays.value = i >= 0 ? weekdays.value.filter(x => x !== d) : [...weekdays.value, d]
}

const clientId = computed(() => props.patient?.id ?? picked.value?.id ?? '')

const problem = computed<string | null>(() => {
  if (!clientId.value) return 'Elige al paciente.'
  if (!program.value) return 'Elige un programa.'
  if (!employeeId.value) return 'Elige al profesional.'
  const scheduleIssue = scheduleProblem(rows, program.value.sessions_total, program.value.validity_days)
  if (scheduleIssue) return scheduleIssue
  if (hasDuplicateStarts(rows)) return 'Hay dos sesiones a la misma fecha y hora.'
  return null
})

function handleSubmit() {
  touched.value = true
  if (problem.value || !program.value) return
  emit('submit', {
    clientId: clientId.value,
    payload: {
      program_id: program.value.id,
      employee_id: employeeId.value,
      branch_id: props.branchId ?? null,
      starts_on: dateOnly([...rows].sort((a, b) => a.start.localeCompare(b.start))[0].start),
      sessions: rows.map(r => ({ service_id: r.serviceId, start_time: toUtcIso(r.start) })),
    },
  })
}
</script>
