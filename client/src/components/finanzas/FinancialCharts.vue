<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-text">Ingresos vs Gastos</h3>
          <p class="text-sm text-text-muted">Comparativa mensual</p>
        </div>
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <div class="h-2.5 w-2.5 rounded-full bg-success"></div>
            <span class="text-text-muted">Ingresos</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="h-2.5 w-2.5 rounded-full bg-danger/60"></div>
            <span class="text-text-muted">Gastos</span>
          </div>
        </div>
      </div>
      <div class="flex h-56 items-end justify-around gap-3 rounded-lg bg-bg-secondary/50 p-4">
        <div v-for="(bar, i) in chartData" :key="i" class="flex flex-1 flex-col items-center gap-1">
          <div class="flex w-full flex-col items-center gap-1">
            <div class="w-full rounded-t bg-success transition-all" :style="{ height: bar.income + 'px' }"></div>
            <div class="w-full rounded-t bg-danger/60 transition-all" :style="{ height: bar.expense + 'px' }"></div>
          </div>
          <span class="text-xs text-text-muted">{{ bar.label }}</span>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4">
      <div class="mb-4">
        <h3 class="text-base font-semibold text-text">Ingresos por Servicio</h3>
        <p class="text-sm text-text-muted">Distribución del mes</p>
      </div>
      <div class="space-y-3">
        <div v-for="service in servicesRevenue" :key="service.name">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-sm text-text-secondary">{{ service.name }}</span>
            <span class="text-sm font-medium text-text">{{ formatUSD(service.amount) }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-bg-secondary">
            <div
              class="h-2 rounded-full transition-all"
              :class="service.percentage > 25 ? 'bg-primary' : 'bg-primary/60'"
              :style="{ width: service.percentage + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <div class="mt-4 border-t border-border-subtle pt-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-text-muted">Total Servicios</span>
          <span class="font-semibold text-text">{{ formatUSD(incomeTotal) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import type { ChartBar, ServiceRevenue } from '../../composables/finanzas/useFinancialSummary'

defineProps<{
  chartData: ChartBar[]
  servicesRevenue: ServiceRevenue[]
  incomeTotal: number
}>()

const { formatUSD } = useCurrency()
</script>
