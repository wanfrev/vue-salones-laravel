<template>
  <div class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl" data-testid="month-view"
    @scroll.capture.passive="emit('leave')">
    <div class="flex h-full flex-col overflow-auto">
      <div class="grid shrink-0 grid-cols-7 border-b border-border text-center text-[11px] font-medium uppercase tracking-wide text-text-muted">
        <div v-for="n in dayNames" :key="n" class="py-2">{{ compact ? n[0] : n }}</div>
      </div>

      <div class="grid flex-1 grid-cols-7" :style="{ gridAutoRows: compact ? 'minmax(3.5rem, 1fr)' : 'minmax(6.25rem, 1fr)' }">
        <div v-for="(cell, idx) in cells" :key="cell.iso" data-testid="month-cell" role="button" tabindex="0"
          class="min-w-0 cursor-pointer overflow-hidden border-b border-border-subtle p-1 transition-colors hover:bg-bg-secondary/50 focus-visible:bg-bg-secondary/50 focus-visible:outline-none sm:p-1.5"
          :class="[
            idx % 7 !== 6 ? 'border-r' : '',
            cell.iso === todayIso ? 'bg-primary/5' : '',
            !cell.isCurrentMonth ? 'opacity-40' : '',
            compact && cell.iso === pickedIso ? 'ring-2 ring-inset ring-primary' : '',
          ]"
          @click="onCellClick(cell.iso)" @keydown.enter.prevent="onCellClick(cell.iso)">
          <div class="flex items-center justify-between sm:px-0.5" :class="compact ? 'flex-col gap-0.5' : ''">
            <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
              :class="cell.iso === todayIso ? 'bg-primary text-text-inverse' : 'text-text'">{{ cell.number }}</span>
            <span v-if="!compact && cell.counts.total && !showChips" class="text-xs font-semibold tabular-nums text-text-secondary">{{ cell.counts.total }}</span>
          </div>

          <!-- Celular: puntos por estado; el detalle va abajo -->
          <template v-if="compact">
            <div class="mt-0.5 flex min-h-[7px] flex-wrap justify-center gap-[3px]" aria-hidden="true">
              <span v-for="seg in cell.segments" :key="seg.key" class="h-1.5 w-1.5 rounded-full" :class="SEG[seg.key]" />
            </div>
            <p v-if="cell.counts.total" class="mt-0.5 text-center text-[10px] tabular-nums text-text-muted">{{ cell.counts.total }}</p>
          </template>

          <!-- Una profesional: sus citas con nombre -->
          <div v-else-if="showChips" class="mt-1 space-y-0.5">
            <button v-for="a in cell.appointments.slice(0, maxChips)" :key="a.id" type="button" data-testid="month-chip"
              class="flex w-full items-center gap-1 truncate rounded border-l-[3px] px-1 py-0.5 text-left text-[11px] transition-colors hover:brightness-95"
              :class="CHIP[a.status] ?? CHIP.other"
              @click.stop="emit('eventClick', a.raw)"
              @pointerenter="emit('hover', a, $event.currentTarget as Element)" @pointerleave="emit('leave')">
              <span class="shrink-0 tabular-nums text-text-secondary">{{ a.shortTime }}</span>
              <span class="truncate font-medium text-text">{{ a.clientName.split(' ')[0] }}</span>
            </button>
            <p v-if="cell.appointments.length > maxChips" class="pl-1 text-[11px] text-text-muted">+{{ cell.appointments.length - maxChips }} más</p>
          </div>

          <!-- Todo el equipo: total del día y barra por estado -->
          <div v-else-if="cell.counts.total" class="mt-1.5 px-0.5">
            <div class="flex h-1 gap-px overflow-hidden rounded-full bg-bg-secondary">
              <span v-for="seg in cell.segments" :key="seg.key" :class="SEG[seg.key]" :style="{ width: `${seg.pct}%` }" />
            </div>
            <p class="mt-1 truncate text-[11px] text-text-muted">{{ cell.counts.total }} {{ cell.counts.total === 1 ? 'cita' : 'citas' }}<span v-if="cell.counts.pending" class="text-danger"> · {{ pendingLabel(cell.counts.pending) }}</span></p>
          </div>
        </div>
      </div>

      <!-- Celular: agenda del día elegido -->
      <section v-if="compact" class="shrink-0 border-t border-border" data-testid="month-day-agenda">
        <div class="flex items-center justify-between gap-2 px-4 py-2.5">
          <h3 class="min-w-0 truncate text-sm font-semibold text-text">{{ pickedLabel }} · {{ picked?.counts.total ?? 0 }} {{ picked?.counts.total === 1 ? 'cita' : 'citas' }}</h3>
          <button type="button" class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-bg-secondary" @click="emit('goToDate', pickedIso)">Abrir día</button>
        </div>
        <p v-if="!picked?.appointments.length" class="px-4 pb-4 text-xs text-text-muted">Sin citas este día.</p>
        <button v-for="a in (picked?.appointments ?? []).slice(0, AGENDA_ROWS)" :key="a.id" type="button" data-testid="month-agenda-row"
          class="grid w-full grid-cols-[3.75rem_1fr_auto] items-center gap-2 border-t border-border-subtle px-4 py-2 text-left transition-colors hover:bg-bg-secondary/50"
          @click="emit('eventClick', a.raw)">
          <span class="text-xs font-semibold tabular-nums text-text-secondary">{{ a.time }}</span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-text">{{ a.clientName }}</span>
            <span class="block truncate text-xs text-text-muted">{{ a.service }}<template v-if="a.employeeName"> · {{ a.employeeName }}</template></span>
          </span>
          <span class="h-2 w-2 rounded-full" :class="SEG[segKey(a.status)]" />
        </button>
        <button v-if="(picked?.appointments.length ?? 0) > AGENDA_ROWS" type="button"
          class="w-full border-t border-border-subtle px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-bg-secondary/50" @click="emit('goToDate', pickedIso)">
          Ver las {{ picked!.appointments.length }} citas en el día
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { toISODate, dateToHHmm, dateToHHmm12, normalizeAppointmentStatus, parseLocalDate } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import { countByStatus, pendingLabel, statusSegments, type StatusKey } from './monthStats'

const businessStore = useBusinessStore()
const terminology = businessStore.terminology

const props = defineProps<{
  appointments: any[]
  services: any[]
  employees: any[]
  employeeId: string | 'all'
  selectedDate: string
  todayIso: string
}>()

const emit = defineEmits<{
  eventClick: [raw: any]
  goToDate: [iso: string]
  hover: [appt: MonthCellAppt, el: Element]
  leave: []
}>()

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const AGENDA_ROWS = 6

const SEG: Record<StatusKey, string> = { paid: 'bg-success', confirmed: 'bg-warning', pending: 'bg-danger', other: 'bg-text-muted/50' }
const CHIP: Record<string, string> = {
  confirmed: 'border-warning bg-amber-50/80 dark:bg-amber-950/30',
  pending: 'border-danger bg-red-50/70 dark:bg-red-950/30',
  paid: 'border-success bg-green-50/70 dark:bg-green-950/25',
  other: 'border-text-muted/50 bg-zinc-50/70 opacity-70 dark:bg-zinc-900/30',
}
const segKey = (status: string): StatusKey => (status === 'paid' || status === 'confirmed' || status === 'pending' ? status : 'other')

export interface MonthCellAppt {
  id: string
  clientName: string
  service: string
  time: string
  /** «9:30» sin AM/PM, para las fichas angostas. */
  shortTime: string
  status: string
  employeeName: string
  raw: any
  _sortTime: string
}

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const compact = computed(() => windowWidth.value < 640)
// Con una sola profesional elegida cada día muestra sus citas con nombre; con todo el equipo, el total y la barra por estado.
const showChips = computed(() => props.employeeId !== 'all')
const maxChips = computed(() => (windowWidth.value < 1024 ? 2 : 3))

const cells = computed(() => {
  const d = parseLocalDate(props.selectedDate, 12, 0, 0)
  const year = d.getFullYear()
  const month = d.getMonth()

  // Una sola pasada: citas por día (sin las de otra profesional) y las visitas con varios servicios de una misma profesional como una sola ficha.
  const byDate = new Map<string, any[]>()
  const groupMembers = new Map<string, any[]>()
  const serviceMap = new Map<string, any>((props.services ?? []).map((s: any) => [s.id, s]))
  const employeeMap = new Map<string, any>((props.employees ?? []).map((e: any) => [e.id, e]))

  for (const a of props.appointments) {
    if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) continue
    const iso = toISODate(new Date(a.start_time))
    const bucket = byDate.get(iso)
    if (bucket) bucket.push(a)
    else byDate.set(iso, [a])
    if (a.group_id) {
      const gm = groupMembers.get(a.group_id)
      if (gm) gm.push(a)
      else groupMembers.set(a.group_id, [a])
    }
  }

  function buildApptsForDate(iso: string): MonthCellAppt[] {
    const apps = byDate.get(iso)
    if (!apps || apps.length === 0) return []

    const seen = new Set<string>()
    const out: MonthCellAppt[] = []
    for (const a of apps) {
      if (a.group_id) {
        const key = `${a.group_id}:${a.employee_id}`
        if (seen.has(key)) continue
        seen.add(key)
      }
      const start = new Date(a.start_time)
      const groupAll = a.group_id ? (groupMembers.get(a.group_id) ?? []) : []
      const names = groupAll.length > 1
        ? groupAll.map((m: any) => serviceMap.get(m.service_id)?.name || terminology.service)
        : null
      out.push({
        id: a.id,
        clientName: a.client?.full_name || a.clients?.full_name || terminology.client,
        service: names ? names.join(' + ') : (serviceMap.get(a.service_id)?.name || terminology.service),
        time: dateToHHmm12(start),
        shortTime: `${start.getHours() % 12 || 12}:${String(start.getMinutes()).padStart(2, '0')}`,
        status: normalizeAppointmentStatus(a),
        employeeName: employeeMap.get(a.employee_id)?.full_name || '',
        raw: a,
        _sortTime: dateToHHmm(start),
      })
    }
    return out.sort((a, b) => a._sortTime.localeCompare(b._sortTime))
  }

  const mk = (date: Date, isCurrentMonth: boolean) => {
    const iso = toISODate(date)
    const appointments = buildApptsForDate(iso)
    const counts = countByStatus(appointments)
    return { number: date.getDate(), iso, isCurrentMonth, appointments, counts, segments: statusSegments(counts) }
  }

  // 42 celdas: los días de relleno del mes anterior y siguiente completan las seis semanas.
  const first = new Date(year, month, 1)
  const out: ReturnType<typeof mk>[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - first.getDay() + i)
    out.push(mk(date, date.getMonth() === month))
  }
  return out
})

// ── Celular: día elegido (su agenda se muestra debajo de la cuadrícula) ──
const pickedIso = ref(props.selectedDate)
watch(() => props.selectedDate, v => { pickedIso.value = v })
const picked = computed(() => cells.value.find(c => c.iso === pickedIso.value) ?? null)
const pickedLabel = computed(() => {
  const d = parseLocalDate(pickedIso.value, 12, 0, 0)
  return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'long' })
})

// En el celular tocar un día lo elige (el detalle sale abajo); en pantallas grandes abre el día.
function onCellClick(iso: string) {
  if (compact.value) pickedIso.value = iso
  else emit('goToDate', iso)
}
</script>
