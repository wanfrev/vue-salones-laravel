<template>
  <div ref="root" class="relative">
    <button type="button" data-testid="finder-toggle" @click="open = !open"
      class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong"
      :class="{ 'border-primary/40 text-primary bg-primary-light/40': open }">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <span class="hidden sm:inline">Buscar hueco</span>
    </button>

    <div v-if="open" class="absolute right-0 top-full z-50 mt-1.5 w-[min(22rem,92vw)] rounded-xl border border-border bg-surface p-3 shadow-xl" data-testid="finder-panel">
      <p class="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">¿Cuándo hay un hueco libre?</p>

      <div class="grid grid-cols-2 gap-2">
        <label class="flex flex-col text-[10px] font-medium text-text-muted">Duración
          <select v-model.number="minutes" data-testid="finder-minutes" class="mt-0.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-primary">
            <option v-for="opt in DURATIONS" :key="opt" :value="opt">{{ durationLabel(opt) }}</option>
          </select>
        </label>
        <label class="flex flex-col text-[10px] font-medium text-text-muted">Profesional
          <select v-model="employeeId" data-testid="finder-employee" class="mt-0.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-primary">
            <option value="all">Cualquiera</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
          </select>
        </label>
      </div>

      <div class="mt-2 inline-flex overflow-hidden rounded-lg border border-border text-[11px] font-semibold">
        <button v-for="r in RANGES" :key="r.value" type="button" :data-testid="`finder-range-${r.value}`" @click="range = r.value"
          class="px-3 py-1.5 transition-colors"
          :class="range === r.value ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary'">{{ r.label }}</button>
      </div>

      <div class="mt-3 max-h-72 overflow-y-auto">
        <p v-if="isLoading" class="px-1 py-3 text-xs text-text-muted">Buscando…</p>
        <p v-else-if="!slots.length" class="px-1 py-3 text-xs text-text-muted" data-testid="finder-empty">No hay huecos de {{ durationLabel(minutes) }} en este período.</p>
        <template v-else>
          <div v-for="group in grouped" :key="group.date" class="mb-2">
            <p class="px-1 py-1 text-[11px] font-bold capitalize text-text-muted">{{ dayLabel(group.date) }}</p>
            <button v-for="s in group.slots" :key="s.employeeId + s.startMin" type="button" data-testid="finder-slot" @click="pick(s)"
              class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-secondary">
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-text">{{ s.employeeName }}</span>
                <span class="block text-xs text-text-secondary tabular-nums">{{ clock(s.startMin) }} – {{ clock(s.endMin) }}</span>
              </span>
              <span class="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{{ durationLabel(s.minutes) }} libres</span>
            </button>
          </div>
          <p v-if="hidden > 0" class="px-1 pb-1 text-[11px] text-text-muted">y {{ hidden }} huecos más: afina la duración o la profesional.</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { listCitas } from '../../services/agendaService'
import { busySlotsFrom } from './conflicts'
import { findFreeSlots, type FreeSlot, type ScheduleRow } from './freeSlots'

const props = defineProps<{
  employees: ReadonlyArray<{ id: string; full_name: string }>
}>()

const emit = defineEmits<{
  select: [slot: { date: string; startMin: number; minutes: number; employeeId: string }]
}>()

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240]
const RANGES = [{ value: 'today', label: 'Hoy' }, { value: 'week', label: 'Próximos 7 días' }] as const
const MAX_ROWS = 40

const authStore = useAuthStore()
const businessStore = useBusinessStore()

const open = ref(false)
const minutes = ref(60)
const employeeId = ref('all')
const range = ref<'today' | 'week'>('week')
const root = ref<HTMLElement | null>(null)

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const days = computed(() => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Array.from({ length: range.value === 'today' ? 1 : 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return isoOf(d)
  })
})

const bounds = computed(() => ({
  start: new Date(`${days.value[0]}T00:00:00`),
  end: new Date(`${days.value[days.value.length - 1]}T23:59:59`),
}))

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

// Se piden las citas del período aparte (no las de la vista actual): la vista puede ser un solo día o una sola profesional.
const { data: citas, isLoading: loadingCitas } = useQuery({
  queryKey: computed(() => ['appointments', businessId.value, 'free-slots', branchId.value, days.value[0], days.value.length] as const),
  queryFn: () => listCitas(businessId.value!, bounds.value, 'all', branchId.value),
  enabled: computed(() => open.value && !!businessId.value),
  staleTime: 0,
  shallow: true,
})

const { data: schedules, isLoading: loadingSchedules } = useQuery({
  queryKey: computed(() => ['schedules', businessId.value, 'free-slots'] as const),
  queryFn: () => apiRequest<ScheduleRow[]>('GET', '/employee-schedules'),
  enabled: computed(() => open.value && !!businessId.value),
  staleTime: 5 * 60 * 1000,
})

const isLoading = computed(() => loadingCitas.value || loadingSchedules.value)

const allSlots = computed<FreeSlot[]>(() => findFreeSlots({
  days: days.value,
  now: Date.now(),
  employees: props.employees.map(e => ({ id: e.id, name: e.full_name })),
  schedules: schedules.value ?? [],
  busy: busySlotsFrom(citas.value ?? []),
  minMinutes: minutes.value,
  employeeId: employeeId.value === 'all' ? undefined : employeeId.value,
}))

const slots = computed(() => allSlots.value.slice(0, MAX_ROWS))
const hidden = computed(() => Math.max(0, allSlots.value.length - MAX_ROWS))

const grouped = computed(() => {
  const byDay = new Map<string, FreeSlot[]>()
  for (const s of slots.value) {
    const list = byDay.get(s.date)
    if (list) list.push(s)
    else byDay.set(s.date, [s])
  }
  return [...byDay.entries()].map(([date, list]) => ({ date, slots: list }))
})

const durationLabel = (min: number): string => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const clock = (totalMin: number): string => {
  const h24 = Math.floor(totalMin / 60)
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${h24 % 12 || 12}:${pad(totalMin % 60)} ${ampm}`
}

const dayLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })

const pick = (s: FreeSlot) => {
  open.value = false
  emit('select', { date: s.date, startMin: s.startMin, minutes: minutes.value, employeeId: s.employeeId })
}

const onDocClick = (e: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
