<template>
  <div class="card-hairline rounded-2xl p-4 sm:p-6">
    <div class="grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2">

      <!-- Ingresos -->
      <button type="button" :class="[
        'group flex items-start gap-2.5 rounded-lg border-y-0 border-r-0 border-l-[3px] bg-transparent p-0 pl-3.5 text-left transition-theme',
        activeCard === 'income' ? 'border-success' : 'border-success/30 hover:border-success'
      ]" @click="$emit('click-income')">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-success"></span>
            Ingresos
          </p>
          <p class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text xl:text-6xl">{{ formatUSD(incomeTotal) }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span v-if="tipsTotal && tipsTotal > 0" class="text-xs font-semibold text-primary">+{{ formatUSD(tipsTotal) }} propinas</span>
            <span v-if="isLoading" class="h-3.5 w-24 rounded bg-bg-secondary animate-pulse" />
            <span v-else class="text-sm font-semibold tabular-nums text-text-secondary">{{ formatVESEs(vesIncomeTotal) }}</span>
          </div>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-success', activeCard === 'income' && 'rotate-180 text-success']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- Gastos -->
      <button type="button" :class="[
        'group flex items-start gap-2.5 rounded-lg border-y-0 border-r-0 border-l-[3px] bg-transparent p-0 pl-3.5 text-left transition-theme',
        activeCard === 'expense' ? 'border-warning' : 'border-warning/30 hover:border-warning'
      ]" @click="$emit('click-expense')">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warning">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"></span>
            Gastos
          </p>
          <p v-if="isLoading" class="mt-1.5 h-11 w-32 rounded bg-bg-secondary animate-pulse sm:h-14" />
          <p v-else class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text xl:text-6xl">{{ formatUSD(expenseTotal) }}</p>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-warning', activeCard === 'expense' && 'rotate-180 text-warning']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- Ganancia bruta — Tienda y Staffing (para staffing, es la única "ganancia": el margen de la nómina) -->
      <button v-if="isTienda || isStaffing" type="button" :class="[
        'group flex items-start gap-2.5 rounded-lg border-y-0 border-r-0 border-l-[3px] bg-transparent p-0 pl-3.5 text-left transition-theme',
        activeCard === 'profit' ? 'border-indigo-500' : 'border-indigo-500/30 hover:border-indigo-500'
      ]" @click="$emit('click-profit')">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
            Ganancia
          </p>
          <p v-if="isLoading" class="mt-1.5 h-11 w-32 rounded bg-bg-secondary animate-pulse sm:h-14" />
          <p v-else class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text xl:text-6xl">{{ formatUSD(profitTotal ?? 0) }}</p>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-indigo-500', activeCard === 'profit' && 'rotate-180 text-indigo-500']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- "Ganancia Neta" no existe para Staffing — la ganancia bruta de la nómina ya es la cifra que importa. -->
      <button v-if="!isStaffing" type="button" :class="[
        'group flex items-start gap-2.5 rounded-lg border-y-0 border-r-0 border-l-[3px] bg-transparent p-0 pl-3.5 text-left transition-theme',
        activeCard === 'net' ? 'border-info' : 'border-info/30 hover:border-info'
      ]" @click="$emit('click-net')">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-info">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-info"></span>
            Ganancia neta
          </p>
          <p v-if="isLoading" class="mt-1.5 h-11 w-32 rounded bg-bg-secondary animate-pulse sm:h-14" />
          <p v-else class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text xl:text-6xl">{{ formatUSD(netTotal) }}</p>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-info', activeCard === 'net' && 'rotate-180 text-info']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- Margen — sin clic, mismo peso visual -->
      <div class="flex items-start gap-2.5 border-y-0 border-r-0 border-l-[3px] border-primary/30 pl-3.5">
        <div class="min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
            Margen
          </p>
          <p class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text xl:text-6xl">{{ formatPercentage(margin) }}</p>
        </div>
      </div>

      <slot name="exchange-rate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  incomeTotal: number
  vesIncomeTotal: number
  tipsTotal?: number
  expenseTotal: number
  netTotal: number
  profitTotal?: number
  margin: number
  isTienda?: boolean
  isStaffing?: boolean
  activeCard?: 'income' | 'expense' | 'net' | 'profit' | null
  isLoading?: boolean
}>()

defineEmits<{
  'click-income': []
  'click-expense': []
  'click-net': []
  'click-profit': []
}>()

const { formatUSD, formatVESEs } = useCurrency()

const formatPercentage = (value: number) => `${value.toFixed(1)}%`
</script>
