<template>
  <div class="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-6 lg:grid-cols-4">
    <div class="group rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-105">
          <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-bold text-text tabular-nums">{{ totalProductos }}</p>
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Productos Activos</p>
        </div>
      </div>
    </div>
    <div class="group rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-success/30 hover:shadow-md">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 transition-transform duration-300 group-hover:scale-105">
          <svg class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-bold text-text tabular-nums">{{ totalCategorias }}</p>
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Categorías</p>
        </div>
      </div>
    </div>
    <div class="group rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-warning/30 hover:shadow-md">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 transition-transform duration-300 group-hover:scale-105">
          <svg class="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-bold text-text tabular-nums">{{ stockBajo }}</p>
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Stock Bajo</p>
        </div>
      </div>
    </div>
    <div class="group rounded-xl border border-border bg-surface p-3 shadow-sm transition-all duration-200 hover:border-info/30 hover:shadow-md">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 transition-transform duration-300 group-hover:scale-105">
          <svg class="h-4 w-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-bold text-text tabular-nums">{{ valorUSD }}</p>
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Valor en Stock</p>
          <p class="text-xs text-text-muted">{{ valorVES }} Bs</p>
        </div>
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
