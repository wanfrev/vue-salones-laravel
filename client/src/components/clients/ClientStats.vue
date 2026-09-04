<template>
  <section class="mb-5 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-x-8 lg:mb-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Total {{ terminology?.clientPlural || 'Clientes' }}</p>
      <p class="mt-1 text-4xl font-extrabold leading-none tabular-nums text-text sm:text-5xl">{{ totalClientes }}</p>
    </div>
    <div class="grid grid-cols-3 gap-x-4 gap-y-3 sm:flex sm:gap-x-8">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recientes</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ clientesRecientes }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Con historial</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ clientesConHistorial }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Sin {{ (terminology?.appointmentPlural || 'Citas').toLowerCase() }} +{{ daysSinceVisitFilter }}d</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-warning">{{ clientesSinVisitar }}</p>
      </div>
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
