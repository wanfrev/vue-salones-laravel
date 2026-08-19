<template>
  <div class="border-b border-border pb-4">
    <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <!-- Ingresos — métrica hero -->
      <button type="button" :class="[
        'group flex items-start gap-2 rounded-lg text-left transition-theme',
        activeCard === 'income' ? 'text-success' : 'text-text hover:text-success'
      ]" @click="$emit('click-income')">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Ingresos</p>
          <p class="mt-1 text-4xl font-extrabold leading-none tabular-nums sm:text-5xl">{{ formatUSD(incomeTotal) }}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span v-if="tipsTotal && tipsTotal > 0" class="text-xs font-semibold text-primary">+{{ formatUSD(tipsTotal) }} propinas</span>
            <span v-if="isLoading" class="h-3 w-24 rounded bg-bg-secondary animate-pulse" />
            <span v-else class="text-xs font-medium tabular-nums text-text-muted">{{ formatVESEs(vesIncomeTotal) }}</span>
          </div>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-success', activeCard === 'income' && 'rotate-180 text-success']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- métricas secundarias — fila compacta -->
      <div class="flex flex-1 flex-wrap justify-between gap-x-6 gap-y-4 sm:justify-end sm:gap-x-10">
        <button type="button" :class="[
          'group flex items-center gap-1 border-b-2 pb-0.5 text-left transition-theme',
          activeCard === 'expense' ? 'border-warning text-warning' : 'border-transparent text-text hover:text-warning'
        ]" @click="$emit('click-expense')">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Gastos</p>
            <p v-if="isLoading" class="mt-1 h-5 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1 text-xl font-bold tabular-nums">{{ formatUSD(expenseTotal) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'expense' && 'rotate-180 text-warning']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- Ganancia bruta — Tienda y Staffing (para staffing, es la única "ganancia": el margen de la nómina) -->
        <button v-if="isTienda || isStaffing" type="button" :class="[
          'group flex items-center gap-1 border-b-2 pb-0.5 text-left transition-theme',
          activeCard === 'profit' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-text hover:text-indigo-500'
        ]" @click="$emit('click-profit')">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Ganancia</p>
            <p v-if="isLoading" class="mt-1 h-5 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1 text-xl font-bold tabular-nums">{{ formatUSD(profitTotal ?? 0) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'profit' && 'rotate-180 text-indigo-500']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- "Ganancia Neta" no existe para Staffing — la ganancia bruta de la nómina ya es la cifra que importa. -->
        <button v-if="!isStaffing" type="button" :class="[
          'group flex items-center gap-1 border-b-2 pb-0.5 text-left transition-theme',
          activeCard === 'net' ? 'border-info text-info' : 'border-transparent text-text hover:text-info'
        ]" @click="$emit('click-net')">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Ganancia neta</p>
            <p v-if="isLoading" class="mt-1 h-5 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1 text-xl font-bold tabular-nums">{{ formatUSD(netTotal) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'net' && 'rotate-180 text-info']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <div class="border-b-2 border-transparent pb-0.5">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Margen</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ formatPercentage(margin) }}</p>
        </div>

        <slot name="exchange-rate" />
      </div>
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
