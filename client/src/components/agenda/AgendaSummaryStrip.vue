<template>
  <div class="grid grid-cols-2 divide-x divide-border-subtle border-b border-border-subtle sm:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border-subtle sm:[&>*:nth-child(n+3)]:border-t-0" data-testid="agenda-summary">
    <button type="button" :class="cellClass('all', 'primary')" @click="emit('toggle', 'all')">
      <p class="text-xl font-bold tabular-nums text-text">{{ stats.citasHoy }}</p>
      <p class="truncate text-xs text-text-muted">{{ plural }} {{ periodLabel }}</p>
    </button>

    <button type="button" :class="cellClass('pending', 'warning')" @click="emit('toggle', 'pending')">
      <p class="text-xl font-bold tabular-nums text-text">{{ stats.pendientes }}</p>
      <p class="flex items-center gap-1.5 text-xs text-text-muted"><span class="h-1.5 w-1.5 rounded-full bg-warning" />Pendientes</p>
    </button>

    <button type="button" :class="cellClass('confirmed', 'success')" @click="emit('toggle', 'confirmed')">
      <p class="text-xl font-bold tabular-nums text-text">{{ stats.confirmadas }}</p>
      <p class="flex items-center gap-1.5 text-xs text-text-muted"><span class="h-1.5 w-1.5 rounded-full bg-success" />Confirmadas</p>
    </button>

    <div class="px-4 py-3">
      <p class="text-xl font-bold tabular-nums text-text">${{ stats.estimadoHoy }}</p>
      <p class="text-xs text-text-muted">Estimado</p>
    </div>
  </div>
</template>

<script setup lang="ts">
export type AgendaStatusFilter = 'all' | 'pending' | 'confirmed'

const props = defineProps<{
  stats: { citasHoy: number; pendientes: number; confirmadas: number; estimadoHoy: string }
  statusFilter: AgendaStatusFilter
  periodLabel: string
  plural: string
}>()

const emit = defineEmits<{ toggle: [status: AgendaStatusFilter] }>()

// Las tres primeras celdas son filtros (como las tarjetas de antes); la activa lleva una línea de color abajo.
const ACTIVE: Record<'primary' | 'warning' | 'success', string> = {
  primary: 'bg-primary/5 shadow-[inset_0_-2px_0] shadow-primary',
  warning: 'bg-warning/5 shadow-[inset_0_-2px_0] shadow-warning',
  success: 'bg-success/5 shadow-[inset_0_-2px_0] shadow-success',
}
const cellClass = (status: AgendaStatusFilter, tone: 'primary' | 'warning' | 'success') =>
  ['px-4 py-3 text-left transition-colors hover:bg-bg-secondary/50', props.statusFilter === status ? ACTIVE[tone] : '']
</script>
