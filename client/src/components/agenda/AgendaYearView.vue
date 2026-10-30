<template>
  <div class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl" data-testid="year-view">
    <div class="h-full overflow-auto">
      <div class="grid grid-cols-2 gap-3 p-3 min-[500px]:grid-cols-3 lg:grid-cols-4 sm:gap-4 sm:p-4">
        <section v-for="m in months" :key="m.month" data-testid="year-month"
          class="rounded-lg border bg-bg p-2.5 transition-colors sm:p-3" :class="m.isCurrent ? 'border-primary/60' : 'border-border'">
          <button type="button" class="mb-2 flex w-full items-baseline justify-between gap-2 rounded text-left hover:text-primary" @click="emit('goToMonth', m.month, m.year)">
            <span class="text-sm font-semibold capitalize text-text">{{ m.label }}</span>
            <span class="text-[11px] tabular-nums text-text-muted">{{ m.count }} {{ m.count === 1 ? 'cita' : 'citas' }}</span>
          </button>
          <div class="grid grid-cols-7 gap-0.5">
            <span v-for="(dn, i) in miniDayNames" :key="i" class="pb-0.5 text-center text-[9px] font-medium uppercase text-text-muted">{{ dn }}</span>
            <template v-for="(day, di) in m.days" :key="di">
              <button v-if="day" type="button" data-testid="year-day"
                class="flex aspect-square items-center justify-center rounded-sm text-[9px] tabular-nums text-text transition-colors hover:ring-1 hover:ring-primary sm:text-[10px]"
                :class="[HEAT[day.level], day.isToday ? 'font-bold ring-2 ring-primary' : '']"
                :title="`${day.number} de ${m.label} · ${day.count} ${day.count === 1 ? 'cita' : 'citas'}`"
                @click="emit('goToDate', day.iso)">{{ day.number }}</button>
              <span v-else />
            </template>
          </div>
        </section>
      </div>

      <div class="flex items-center gap-2 px-4 pb-4 text-[11px] text-text-muted">
        Menos
        <span v-for="l in 5" :key="l" class="h-3 w-5 rounded-sm" :class="HEAT[l - 1]" />
        Más
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toISODate, parseLocalDate } from '../../lib/formatters'
import { heatLevel } from './monthStats'

const props = defineProps<{
  appointments: any[]
  employeeId: string | 'all'
  selectedDate: string
  todayIso: string
}>()

const emit = defineEmits<{
  goToMonth: [month: number, year: number]
  goToDate: [iso: string]
}>()

const miniDayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// De «sin citas» a «el día más cargado del año». Tonos del color principal, siempre con texto oscuro legible.
const HEAT = ['', 'bg-primary/15', 'bg-primary/30', 'bg-primary/45', 'bg-primary/60']

const months = computed(() => {
  const year = parseLocalDate(props.selectedDate, 12, 0, 0).getFullYear()

  // Una sola pasada sobre las citas: cuántas hay cada día y cada mes.
  const perDay = new Map<string, number>()
  const perMonth = new Array<number>(12).fill(0)
  let max = 0
  for (const a of props.appointments) {
    if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) continue
    const d = new Date(a.start_time)
    if (d.getFullYear() !== year) continue
    const iso = toISODate(d)
    const n = (perDay.get(iso) ?? 0) + 1
    perDay.set(iso, n)
    if (n > max) max = n
    perMonth[d.getMonth()]++
  }

  return Array.from({ length: 12 }, (_, m) => {
    const days: ({ number: number; iso: string; count: number; level: number; isToday: boolean } | null)[] =
      new Array(new Date(year, m, 1).getDay()).fill(null)
    for (let n = 1, last = new Date(year, m + 1, 0).getDate(); n <= last; n++) {
      const iso = toISODate(new Date(year, m, n))
      const count = perDay.get(iso) ?? 0
      days.push({ number: n, iso, count, level: heatLevel(count, max), isToday: iso === props.todayIso })
    }
    return { month: m, year, label: monthNames[m], isCurrent: props.todayIso.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`), count: perMonth[m], days }
  })
})
</script>
