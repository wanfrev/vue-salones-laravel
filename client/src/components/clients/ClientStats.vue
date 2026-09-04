<template>
  <section class="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
    <div class="col-span-2 rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm xl:col-span-1">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Total {{ terminology?.clientPlural || 'Pacientes' }}</p>
      <p class="mt-2 text-3xl font-bold leading-none tabular-nums text-text sm:text-4xl">{{ totalClientes }}</p>
      <p class="mt-2 text-xs text-text-muted">Expedientes en el directorio</p>
    </div>
    <div class="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Recientes</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-text">{{ clientesRecientes }}</p>
      <p class="mt-2 text-xs text-text-muted">Nuevos registros</p>
    </div>
    <div class="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">Con historial</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-text">{{ clientesConHistorial }}</p>
      <p class="mt-2 text-xs text-text-muted">Con atención registrada</p>
    </div>
    <div class="rounded-2xl border border-warning/25 bg-warning/5 p-4 shadow-sm">
      <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-warning">Sin {{ (terminology?.appointmentPlural || 'consultas').toLowerCase() }}</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-text">{{ clientesSinVisitar }}</p>
      <p class="mt-2 text-xs text-text-muted">Más de {{ daysSinceVisitFilter }} días</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  totalClientes: number
  clientesRecientes: number
  clientesConHistorial: number
  clientesSinVisitar: number
  daysSinceVisitFilter: number
  terminology?: Record<string, string>
}>()
</script>
