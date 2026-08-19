<template>
  <div class="card-hairline rounded-2xl p-4 sm:p-6">
    <div class="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:justify-between sm:gap-x-8">
      <!-- Ingresos — métrica hero, con acento propio -->
      <button type="button" :class="[
        'group flex items-start gap-2.5 rounded-lg border-y-0 border-r-0 border-l-[3px] bg-transparent p-0 pl-3.5 text-left transition-theme',
        activeCard === 'income' ? 'border-success' : 'border-success/30 hover:border-success'
      ]" @click="$emit('click-income')">
        <div>
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
            <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
            Ingresos
          </p>
          <p class="mt-1.5 text-5xl font-extrabold leading-none tabular-nums text-text sm:text-6xl">{{ formatUSD(incomeTotal) }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span v-if="tipsTotal && tipsTotal > 0" class="text-xs font-semibold text-primary">+{{ formatUSD(tipsTotal) }} propinas</span>
            <span v-if="isLoading" class="h-3.5 w-24 rounded bg-bg-secondary animate-pulse" />
            <span v-else class="text-sm font-semibold tabular-nums text-text-secondary">{{ formatVESEs(vesIncomeTotal) }}</span>
          </div>
        </div>
        <svg :class="['mt-1 h-4 w-4 shrink-0 text-text-muted/50 transition-transform duration-300 group-hover:text-success', activeCard === 'income' && 'rotate-180 text-success']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      <!-- métricas secundarias — divididas por líneas finas, con identidad de color propia -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:flex sm:flex-1 sm:items-start sm:justify-end sm:gap-x-8 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
        <button type="button" :class="[
          'group flex items-center gap-1 border-0 bg-transparent p-0 text-left transition-theme',
          activeCard === 'expense' ? 'text-warning' : 'text-text hover:text-warning'
        ]" @click="$emit('click-expense')">
          <div>
            <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <span class="h-1.5 w-1.5 rounded-full bg-warning"></span>
              Gastos
            </p>
            <p v-if="isLoading" class="mt-1.5 h-6 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1.5 text-2xl font-bold tabular-nums">{{ formatUSD(expenseTotal) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'expense' && 'rotate-180 text-warning']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- Ganancia bruta — Tienda y Staffing (para staffing, es la única "ganancia": el margen de la nómina) -->
        <button v-if="isTienda || isStaffing" type="button" :class="[
          'group flex items-center gap-1 border-0 bg-transparent p-0 text-left transition-theme',
          activeCard === 'profit' ? 'text-indigo-500' : 'text-text hover:text-indigo-500'
        ]" @click="$emit('click-profit')">
          <div>
            <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              Ganancia
            </p>
            <p v-if="isLoading" class="mt-1.5 h-6 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1.5 text-2xl font-bold tabular-nums">{{ formatUSD(profitTotal ?? 0) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'profit' && 'rotate-180 text-indigo-500']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <!-- "Ganancia Neta" no existe para Staffing — la ganancia bruta de la nómina ya es la cifra que importa. -->
        <button v-if="!isStaffing" type="button" :class="[
          'group flex items-center gap-1 border-0 bg-transparent p-0 text-left transition-theme',
          activeCard === 'net' ? 'text-info' : 'text-text hover:text-info'
        ]" @click="$emit('click-net')">
          <div>
            <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <span class="h-1.5 w-1.5 rounded-full bg-info"></span>
              Ganancia neta
            </p>
            <p v-if="isLoading" class="mt-1.5 h-6 w-16 rounded bg-bg-secondary animate-pulse" />
            <p v-else class="mt-1.5 text-2xl font-bold tabular-nums">{{ formatUSD(netTotal) }}</p>
          </div>
          <svg :class="['h-3.5 w-3.5 shrink-0 text-text-muted/50 transition-transform duration-300', activeCard === 'net' && 'rotate-180 text-info']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <div>
          <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
            Margen
          </p>
          <p class="mt-1.5 text-2xl font-bold tabular-nums text-text">{{ formatPercentage(margin) }}</p>
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
