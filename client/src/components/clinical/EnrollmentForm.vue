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
      <FormSelect
        v-if="program && needsDefaultEmployee"
        v-model="defaultEmployeeId"
        label="Profesional por defecto"
        placeholder="Elige un profesional"
        :options="employeeOptions"
        hint="Para las especialidades del programa que no tienen especialista asignado."
      />
    </div>

    <template v-if="program">
      <p class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-text-secondary">
        {{ program.sessions_total }} sesiones por ${{ program.price }} · vigencia de {{ program.validity_days }} días. Las citas se crean ahora en el calendario y el programa se cobra junto en el punto de venta.
      </p>

      <ul class="space-y-1 text-xs text-text-secondary">
        <li v-for="(c, i) in program.components" :key="i">
          <strong class="text-text">{{ c.quantity }}×</strong> {{ componentLabel(c) }}
          <span class="text-text-muted"> — {{ c.employee_name ?? 'sin especialista asignado' }}</span>
        </li>
      </ul>

      <!-- Días de la semana, cada uno con SU hora: el niño no siempre viene a la misma hora -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_1fr]">
          <FormInput v-model="startDate" type="date" label="Primera sesión desde" />
          <div>
            <p class="mb-1.5 text-sm font-medium text-text-secondary">Días de la semana que viene</p>
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

        <div v-if="selectedDays.length > 0" class="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-bg-secondary/40 p-3">
          <p class="w-full text-xs text-text-muted">Hora de cada día (puede ser distinta):</p>
          <label v-for="d in selectedDays" :key="d.value" class="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
            {{ d.label }}
            <input
              type="time"
              :value="times[d.value]"
              @input="setTime(d.value, ($event.target as HTMLInputElement).value)"
              :aria-label="`Hora del ${d.label}`"
              class="w-32 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm font-normal text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-text-secondary">Sesiones <span class="font-normal text-text-muted">— ajusta la fecha, la hora, la especialidad o el especialista de cada una; también las podrás mover luego en el calendario</span></p>
        <ul class="space-y-2">
          <li
            v-for="(r, i) in rows"
            :key="i"
            class="rounded-lg border p-2"
            :class="conflicts.has(i) ? 'border-danger/50 bg-danger/5' : 'border-border-subtle bg-bg-secondary/40'"
          >
            <div class="grid grid-cols-1 items-center gap-2 sm:grid-cols-[3.5rem_14rem_1fr_1fr]">
              <span class="text-sm font-semibold text-text">N.º {{ i + 1 }}</span>
              <input
                type="datetime-local"
                v-model="r.start"
                :aria-label="`Fecha y hora de la sesión ${i + 1}`"
                class="min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <select
                v-if="services.length > 1"
                :value="r.serviceId"
                @change="onServiceChange(r, ($event.target as HTMLSelectElement).value)"
                :aria-label="`Especialidad de la sesión ${i + 1}`"
                class="min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary"
              >
                <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <span v-else class="truncate text-sm text-text-muted">{{ serviceName(r.serviceId) }}</span>
              <select
                :value="r.employeeId"
                @change="onEmployeeChange(r, ($event.target as HTMLSelectElement).value)"
                :aria-label="`Especialista de la sesión ${i + 1}`"
                class="min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary"
              >
                <option value="" disabled>Elige especialista</option>
                <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
              </select>
            </div>
            <p v-if="conflicts.has(i)" class="mt-1.5 text-xs font-semibold text-danger">Sesión {{ i + 1 }}: {{ conflicts.get(i) }} Cambia la hora o el especialista.</p>
          </li>
        </ul>

        <div v-if="rows.length > 0 && counts.length > 1" class="mt-2 flex flex-wrap gap-1.5" aria-label="Sesiones por especialidad">
          <span
            v-for="c in counts"
            :key="c.label"
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="c.used === c.quantity ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
          >{{ c.label }}: {{ c.used }} de {{ c.quantity }}</span>
        </div>

        <p v-if="rows.length > 0 && !withinValidity" class="mt-2 text-xs font-semibold text-warning">
          Con estos días las {{ rows.length }} sesiones no caben en los {{ program.validity_days }} días del programa: elige más días de la semana o adelanta fechas.
        </p>
        <p v-if="rows.length > 0" class="mt-2 text-xs text-text-muted">Vence el {{ expires }}: pasada esa fecha las sesiones sin usar se pierden (administración puede extenderla).</p>
        <p v-else class="text-xs text-text-muted">Elige al menos un día de la semana para proponer las fechas.</p>
      </div>
    </template>

    <p v-if="error" class="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
    <p v-else-if="problem && touched" class="text-sm text-danger">{{ problem }}</p>

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
  WEEKDAYS, componentCounts, componentLabel, dateOnly, defaultSlots, expiryDate, fitsValidity, hasDuplicateStarts, programServices,
  proposeSchedule, scheduleProblem, specialistForService, toUtcIso, type ScheduleRow,
} from './programs'
import { useEnrollmentConflicts } from '../../composables/clinical/useEnrollmentConflicts'
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
  /** Motivo por el que el servidor rechazó la inscripción (choques de horario, vigencia...). */
  error?: string | null
}>()
const emit = defineEmits<{ submit: [value: { clientId: string; payload: EnrollPayload }]; cancel: [] }>()

const DEFAULT_TIME = '16:00'
const pad = (n: number) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

interface Row extends ScheduleRow { employeeManual: boolean }

const picked = ref<PickedPatient | null>(null)
const programId = ref('')
const defaultEmployeeId = ref('')
const startDate = ref(today())
const weekdays = ref<number[]>([1, 4])
const times = reactive<Record<number, string>>({ 1: DEFAULT_TIME, 4: DEFAULT_TIME })
const rows = reactive<Row[]>([])
const touched = ref(false)

const program = computed(() => props.programs.find(p => p.id === programId.value) ?? null)
const programOptions = computed(() => props.programs.map(p => ({ value: p.id, label: `${p.name} · ${p.sessions_total} sesiones · $${p.price}` })))
const employeeOptions = computed(() => props.employees.map(e => ({ value: e.id, label: e.name })))
const selectedDays = computed(() => WEEKDAYS.filter(d => weekdays.value.includes(d.value)))

// Solo se pide un profesional por defecto si alguna especialidad no trae especialista.
const needsDefaultEmployee = computed(() => !!program.value?.components.some(c => !c.employee_id))

const services = computed(() => (program.value ? programServices(program.value) : []))
const serviceName = (id: string) => services.value.find(s => s.id === id)?.name ?? 'Servicio'
const specialistFor = (serviceId: string) => (program.value ? specialistForService(program.value, serviceId) : null) ?? defaultEmployeeId.value

const first = computed(() => [...rows].map(r => r.start).filter(Boolean).sort()[0] ?? '')
const expires = computed(() => (first.value && program.value ? formatDateHuman(expiryDate(dateOnly(first.value), program.value.validity_days)) : ''))
const withinValidity = computed(() => !program.value || fitsValidity(rows.map(r => r.start), program.value.validity_days))
const counts = computed(() => (program.value ? componentCounts(program.value, rows) : []))

// Aviso por fila de los choques con la agenda del especialista (mientras se arman las fechas).
const { conflicts } = useEnrollmentConflicts(() => rows)

// Cambiar programa, fecha o días recalcula la propuesta (descarta los ajustes manuales de las filas); cambiar
// la hora de un día solo mueve las sesiones de ese día de la semana, para no perder los demás ajustes.
function rebuild() {
  const p = program.value
  if (!p) { rows.splice(0); return }
  const dates = proposeSchedule({ count: p.sessions_total, startDate: startDate.value, time: DEFAULT_TIME, weekdays: weekdays.value, times })
  const slots = defaultSlots(p)
  rows.splice(0, rows.length, ...dates.map((start, i) => ({
    start,
    serviceId: slots[i].serviceId,
    employeeId: slots[i].employeeId ?? defaultEmployeeId.value,
    employeeManual: false,
  })))
}

watch([program, startDate, weekdays], rebuild, { deep: true })

function toggleDay(d: number) {
  const i = weekdays.value.indexOf(d)
  if (i >= 0) {
    weekdays.value = weekdays.value.filter(x => x !== d)
  } else {
    times[d] ??= DEFAULT_TIME
    weekdays.value = [...weekdays.value, d]
  }
}

function setTime(day: number, value: string) {
  const previous = times[day]
  times[day] = value
  if (!/^\d{2}:\d{2}$/.test(value)) return
  // Solo las sesiones de ese día que todavía tienen la hora anterior: las ajustadas a mano no se tocan.
  for (const r of rows) {
    if (new Date(r.start).getDay() === day && r.start.endsWith(`T${previous}`)) r.start = `${r.start.slice(0, 10)}T${value}`
  }
}

// El profesional por defecto rellena las filas sin especialista (no pisa lo elegido a mano ni al de la especialidad).
watch(defaultEmployeeId, value => {
  for (const r of rows) if (!r.employeeManual && !r.employeeId) r.employeeId = value
})

function onServiceChange(r: Row, serviceId: string) {
  r.serviceId = serviceId
  if (!r.employeeManual) r.employeeId = specialistFor(serviceId)
}

function onEmployeeChange(r: Row, employeeId: string) {
  r.employeeId = employeeId
  r.employeeManual = true
}

const clientId = computed(() => props.patient?.id ?? picked.value?.id ?? '')

const problem = computed<string | null>(() => {
  if (!clientId.value) return 'Elige al paciente.'
  if (!program.value) return 'Elige un programa.'
  const scheduleIssue = scheduleProblem(rows, program.value.sessions_total, program.value.validity_days)
  if (scheduleIssue) return scheduleIssue
  if (counts.value.some(c => c.used !== c.quantity)) {
    return `Las sesiones por especialidad no coinciden con el programa (${counts.value.map(c => `${c.label}: ${c.used} de ${c.quantity}`).join('; ')}).`
  }
  if (hasDuplicateStarts(rows)) return 'Hay dos sesiones a la misma fecha y hora.'
  if (conflicts.value.size > 0) return 'Corrige las sesiones marcadas en rojo: el especialista ya tiene una cita a esa hora.'
  return null
})

function handleSubmit() {
  touched.value = true
  if (problem.value || !program.value) return
  emit('submit', {
    clientId: clientId.value,
    payload: {
      program_id: program.value.id,
      employee_id: defaultEmployeeId.value || null,
      branch_id: props.branchId ?? null,
      starts_on: dateOnly([...rows].sort((a, b) => a.start.localeCompare(b.start))[0].start),
      sessions: rows.map(r => ({ service_id: r.serviceId, start_time: toUtcIso(r.start), employee_id: r.employeeId })),
    },
  })
}
</script>
