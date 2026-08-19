<template>
  <div class="mb-4 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-x-8 lg:mb-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Valor en stock</p>
      <p class="mt-1 text-4xl font-extrabold leading-none tabular-nums text-text sm:text-5xl">{{ valorUSD }}</p>
      <p class="mt-1 text-xs text-text-muted">{{ valorVES }} Bs</p>
    </div>
    <div class="grid grid-cols-3 gap-x-4 gap-y-3 sm:flex sm:gap-x-8">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Productos activos</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ totalProductos }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Categorías</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ totalCategorias }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Stock bajo</p>
        <p class="mt-1 text-xl font-bold tabular-nums" :class="stockBajo > 0 ? 'text-warning' : 'text-text'">{{ stockBajo }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  totalProductos: number
  totalCategorias: number
  stockBajo: number
  valorUSD: string
  valorVES: string
}>()
</script>
