<template>
  <section class="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border pb-4 lg:mb-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Total clientes</p>
      <p class="mt-1 text-4xl font-extrabold leading-none tabular-nums text-text sm:text-5xl">{{ totalClientes }}</p>
    </div>
    <div class="flex flex-1 flex-wrap justify-between gap-x-6 gap-y-3 sm:justify-end sm:gap-x-10">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recientes</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ clientesRecientes }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Con historial</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ clientesConHistorial }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Sin visitar +{{ daysSinceVisitFilter }}d</p>
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
}>()
</script>
