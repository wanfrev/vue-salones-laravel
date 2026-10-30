<template>
  <div class="h-full overflow-auto" data-testid="week-board">
    <!-- Celular: una fila por día con su resumen; al tocarla se abre ese día -->
    <ul v-if="compact" class="divide-y divide-border-subtle">
      <li v-for="d in days" :key="d.col.key">
        <button type="button" data-testid="board-day"
          class="grid w-full grid-cols-[2.25rem_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-bg-secondary/50"
          :class="d.col.isToday ? 'bg-primary/5' : ''" @click="emit('goDay', d.col.key)">
          <span class="flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold"
            :class="d.col.isToday ? 'bg-primary text-text-inverse' : 'text-text'">{{ d.col.number }}</span>
          <span class="min-w-0">
            <span class="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-text">{{ d.col.label }}
              <span v-if="d.pending" class="text-xs font-medium text-danger">{{ pendingLabel(d.pending) }}</span>
            </span>
            <span class="block text-xs text-text-secondary">{{ d.total ? `${d.total} ${d.total === 1 ? 'cita' : 'citas'}` : 'Sin citas' }}</span>
          </span>
          <span v-if="d.total" class="col-span-full flex h-7 items-end gap-1" aria-hidden="true">
            <span v-for="(n, i) in d.bars" :key="i" class="flex-1 rounded-sm"
              :class="n ? 'bg-primary' : 'bg-bg-secondary'"
              :style="{ height: `${n ? Math.max(18, (n / d.maxBar) * 100) : 12}%`, opacity: n ? 0.35 + 0.65 * (n / d.maxBar) : 1 }" />
          </span>
        </button>
      </li>
    </ul>

    <!-- Tablet y PC: siete columnas con las citas del día en orden, separadas por hora -->
    <div v-else class="min-w-[640px]">
      <div class="sticky top-0 z-10 grid grid-cols-7 border-b border-border bg-surface">
        <button v-for="d in days" :key="d.col.key" type="button" data-testid="board-day"
          class="flex flex-col items-center gap-0.5 border-l border-border-subtle px-1 py-2 transition-colors first:border-l-0 hover:bg-bg-secondary/50"
          @click="emit('goDay', d.col.key)">
          <span class="text-[11px] font-medium uppercase tracking-wide text-text-muted">{{ d.col.label }}</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold"
            :class="d.col.isToday ? 'bg-primary text-text-inverse' : 'text-text'">{{ d.col.number }}</span>
          <span class="text-[11px] text-text-secondary">{{ d.total }} {{ d.total === 1 ? 'cita' : 'citas' }}</span>
          <span class="h-3.5 text-[11px] font-medium text-danger">{{ d.pending ? pendingLabel(d.pending) : '' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-7 items-start">
        <div v-for="d in days" :key="d.col.key" class="min-w-0 space-y-0.5 border-l border-border-subtle p-1.5 first:border-l-0"
          :class="d.col.isToday ? 'bg-primary/[0.04]' : ''">
          <p v-if="!d.items.length" class="py-8 text-center text-xs text-text-muted">Sin citas</p>
          <template v-for="it in d.items" :key="it.key">
            <div v-if="it.kind === 'hour'" class="flex items-center gap-1.5 px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted first:pt-0.5">
              <span>{{ hourLabel(it.hour) }}</span><span class="h-px flex-1 bg-border" /><span class="tabular-nums">{{ it.count }}</span>
            </div>
            <div v-else-if="it.kind === 'now'" class="flex items-center gap-1 px-0.5 py-0.5" aria-label="Ahora">
              <span class="h-1.5 w-1.5 rounded-full bg-danger" /><span class="h-0.5 flex-1 bg-danger" />
            </div>
            <button v-else type="button" data-testid="board-row"
              class="flex h-7 w-full items-center gap-1.5 rounded border-l-[3px] pl-1.5 pr-1 text-left text-xs transition-colors hover:brightness-95"
              :class="rowClass(it.appt.status)"
              @click="emit('select', it.appt, $event)"
              @pointerenter="emit('hover', it.appt, $event.currentTarget as Element)"
              @pointerleave="emit('leave')">
              <span class="shrink-0 text-[10px] tabular-nums text-text-secondary">
                <span class="hidden lg:inline">{{ hour12(it.appt.startMs) }}:{{ minutes(it.appt.startMs) }}</span>
                <!-- En tablet el encabezado de la hora ya dice la hora: solo se marcan los minutos distintos de «en punto» -->
                <span class="lg:hidden">{{ minutes(it.appt.startMs) === '00' ? '' : `:${minutes(it.appt.startMs)}` }}</span>
              </span>
              <span class="min-w-0 flex-1 truncate font-semibold text-text">{{ it.appt.clientName }}</span>
              <span v-if="it.appt.employeeInitials" class="hidden h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white lg:flex"
                :style="{ background: it.appt.employeeColor }">{{ it.appt.employeeInitials }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DisplayAppointment, GridColumn } from './gridTypes'
import { buildBoardItems, hourHistogram, hourLabel } from './weekBoard'
import { pendingLabel } from './monthStats'

const props = defineProps<{
  columns: GridColumn[]
  /** Celular: filas-resumen por día en vez de las siete columnas. */
  compact: boolean
  /** «Ahora» (ms): la línea roja aparece solo en la columna de hoy. */
  nowMs: number
}>()

const emit = defineEmits<{
  select: [appt: DisplayAppointment, event: MouseEvent]
  hover: [appt: DisplayAppointment, el: Element]
  leave: []
  goDay: [iso: string]
}>()

const FROM_HOUR = 8
const TO_HOUR = 20

// Una pasada por columna: orden, grupos por hora, pendientes y barras del celular.
const days = computed(() => {
  const view = props.columns.map(col => {
    let pending = 0
    for (const a of col.appointments) if (a.status === 'pending') pending++
    const bars = props.compact ? hourHistogram(col.appointments, FROM_HOUR, TO_HOUR) : []
    return {
      col, pending, bars,
      total: col.appointments.length,
      items: props.compact ? [] : buildBoardItems(col.appointments, col.isToday ? props.nowMs : null),
    }
  })
  // Todas las barras de la semana usan la misma escala para poder comparar un día con otro.
  const maxBar = Math.max(1, ...view.flatMap(v => v.bars))
  return view.map(v => ({ ...v, maxBar }))
})

const ROW: Record<string, string> = {
  confirmed: 'border-warning bg-amber-50/80 dark:bg-amber-950/30',
  pending: 'border-danger bg-red-50/70 dark:bg-red-950/30',
  paid: 'border-success bg-green-50/70 dark:bg-green-950/25',
  cancelled: 'border-danger bg-red-50/50 opacity-60 dark:bg-red-950/15',
  no_show: 'border-danger bg-red-50/50 opacity-60 dark:bg-red-950/15',
}
const rowClass = (status: string) => ROW[status] ?? 'border-primary bg-zinc-50/70 dark:bg-zinc-900/30'
const hour12 = (ms: number) => String(new Date(ms).getHours() % 12 || 12)
const minutes = (ms: number) => String(new Date(ms).getMinutes()).padStart(2, '0')
</script>
