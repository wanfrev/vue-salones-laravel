<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

export interface BreakdownItem {
  label: string
  amount: number
}

export interface CurrencyBreakdownData {
  title: string
  usdTotal: number
  vesTotal: number
  usdItems: BreakdownItem[]
  vesItems: BreakdownItem[]
  usdLabel: string
  vesLabel: string
  usdVesRate?: number
}

defineProps<{
  data: CurrencyBreakdownData
}>()

defineEmits<{
  close: []
}>()

const { formatVESEs } = useCurrency()
</script>

<template>
  <div class="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
    <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-text">{{ data.title }}</h3>
      </div>
      <button @click="$emit('close')"
        class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
      <!-- USD Column -->
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">USD</span>
            <span class="text-xs text-text-muted">Dólares</span>
          </div>
          <span class="text-lg font-bold text-text tabular-nums">${{ data.usdTotal.toFixed(2) }}</span>
        </div>

        <div v-if="data.usdItems.length > 0" class="space-y-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">{{ data.usdLabel }}</p>
          <div v-for="item in data.usdItems" :key="item.label"
            class="flex items-center justify-between rounded-md bg-bg-secondary/60 px-3 py-2 text-sm">
            <span class="text-text-secondary">{{ item.label }}</span>
            <span class="font-medium text-text tabular-nums">${{ item.amount.toFixed(2) }}</span>
          </div>
        </div>
        <div v-else class="py-4 text-center text-sm text-text-muted">
          Sin detalle
        </div>
      </div>

      <!-- VES Column -->
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">VES</span>
            <span class="text-xs text-text-muted">Bolívares</span>
          </div>
          <span class="text-lg font-bold text-text tabular-nums">{{ formatVESEs(data.vesTotal) }}</span>
        </div>

        <div v-if="data.vesItems.length > 0" class="space-y-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">{{ data.vesLabel }}</p>
          <div v-for="item in data.vesItems" :key="item.label"
            class="flex items-center justify-between rounded-md bg-bg-secondary/60 px-3 py-2 text-sm">
            <span class="text-text-secondary">{{ item.label }}</span>
            <span class="font-medium text-text tabular-nums">{{ formatVESEs(item.amount) }}</span>
          </div>
        </div>
        <div v-else class="py-4 text-center text-sm text-text-muted">
          Sin detalle
        </div>
      </div>
    </div>
  </div>
</template>
