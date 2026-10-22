<template>
  <dl class="grid grid-cols-3 gap-x-4 gap-y-3 border-b border-border-subtle px-4 py-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-10" data-testid="inventory-summary">
    <div class="col-span-3 sm:col-span-1">
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Valor en stock</dt>
      <dd class="mt-0.5 text-2xl font-extrabold leading-tight tabular-nums text-text">
        {{ valorUSD }}
        <span class="text-xs font-normal text-text-muted">{{ valorVES }} Bs</span>
      </dd>
    </div>
    <div class="flex flex-col justify-between">
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Productos activos</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">{{ totalProductos }}</dd>
    </div>
    <div class="flex flex-col justify-between">
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Categorías</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">{{ totalCategorias }}</dd>
    </div>
    <div class="flex flex-col justify-between">
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Stock bajo</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums" :class="stockBajo > 0 ? 'text-warning' : 'text-text'">{{ stockBajo }}</dd>
    </div>
  </dl>
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
