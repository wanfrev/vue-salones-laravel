<template>
  <p class="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-1 text-xs text-text-secondary" data-testid="period-summary">
    <span><b class="text-sm font-semibold tabular-nums text-text">{{ total }}</b> {{ total === 1 ? 'cita' : 'citas' }}</span>
    <span v-if="occupancy !== null"><b class="text-sm font-semibold tabular-nums text-text">{{ occupancy }}%</b> ocupación</span>
    <span :class="pending ? 'text-danger' : ''"><b class="text-sm font-semibold tabular-nums" :class="pending ? '' : 'text-text'">{{ pending }}</b> {{ pending === 1 ? 'pendiente' : 'pendientes' }}</span>
  </p>
</template>

<script setup lang="ts">
defineProps<{
  total: number
  pending: number
  /** Ocupación media del día (0–100); `null` donde no aplica (semana, mes, año). */
  occupancy: number | null
}>()
</script>
