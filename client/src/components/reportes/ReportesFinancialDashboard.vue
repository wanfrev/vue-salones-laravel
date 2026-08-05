<template>
  <div class="space-y-4">
    <!-- Selector de período -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-xl border border-border bg-surface p-0.5 sm:p-1 shadow-sm">
          <button
            v-for="p in periods" :key="p.value"
            @click="selectedPeriod = p.value"
            :class="['rounded-lg px-3 py-1.5 text-xs font-medium transition-theme', selectedPeriod === p.value ? 'bg-primary text-text-inverse shadow-sm shadow-primary/20' : 'text-text-secondary hover:text-text hover:bg-bg-secondary']"
          >{{ p.label }}</button>
        </div>
        <div class="flex items-center gap-1 rounded-xl border border-border bg-surface px-1.5 py-1 shadow-sm">
          <button v-if="selectedPeriod !== 'custom'" @click="goPrev" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Anterior">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input
            v-if="selectedPeriod === 'month'"
            v-model="selectedMonth"
            type="month"
            class="w-[130px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
          />
          <template v-else>
            <input
              type="date"
              :value="customFrom"
              @change="customFrom = ($event.target as HTMLInputElement).value"
              class="w-[120px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
            />
            <span class="text-xs text-text-muted">—</span>
            <input
              type="date"
              :value="customTo"
              @change="customTo = ($event.target as HTMLInputElement).value"
              class="w-[120px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
            />
          </template>
          <button v-if="selectedPeriod !== 'custom'" @click="goNext" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Siguiente">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" class="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text ml-0.5" @click="resetToCurrent">{{ selectedPeriod === 'custom' ? 'Hoy' : 'Ahora' }}</button>
        </div>
      </div>
      <span v-if="summary" class="text-xs text-text-muted">{{ summary.meta.reports_count }} reporte(s) en el período</span>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center rounded-2xl border border-border bg-surface p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>

    <template v-else-if="summary">
      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          icon-color="success"
          :value="`$${formatCurrency(summary.totals.total_usd)}`"
          label="Ingresos USD"
          :sublabel="`≈ ${formatCurrency(bsEquivOfUsd)} Bs`"
        />
        <StatCard
          icon="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          icon-color="primary"
          :value="`${formatCurrency(summary.totals.total_bs)} Bs`"
          label="Ingresos Bs"
          :sublabel="`≈ $${formatCurrency(usdEquivOfBs)} USD`"
        />
        <StatCard
          icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          icon-color="warning"
          :value="`$${formatCurrency(summary.totals.credit_usd)}`"
          label="Créditos USD"
        />
        <StatCard
          icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          icon-color="warning"
          :value="`${formatCurrency(summary.totals.credit_bs)} Bs`"
          label="Créditos Bs"
        />
      </div>

      <!-- Desglose por método -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-border bg-surface p-4">
          <h3 class="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Ingresos por Método — Bolívares (Bs)</h3>
          <div v-if="bsBreakdown.every(b => b.amount === 0)" class="text-xs text-text-muted py-4 text-center">Sin ingresos en Bs en este período.</div>
          <div v-else class="space-y-3">
            <div v-for="row in bsBreakdown" :key="row.field">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm text-text-secondary">{{ row.label }}</span>
                <span class="text-sm font-medium text-text">{{ formatCurrency(row.amount) }} Bs</span>
              </div>
              <div class="h-2 w-full rounded-full bg-bg-secondary">
                <div class="h-2 rounded-full bg-primary transition-all" :style="{ width: row.percentage + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-surface p-4">
          <h3 class="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Ingresos por Método — Dólares (USD)</h3>
          <div v-if="usdBreakdown.every(b => b.amount === 0)" class="text-xs text-text-muted py-4 text-center">Sin ingresos en USD en este período.</div>
          <div v-else class="space-y-3">
            <div v-for="row in usdBreakdown" :key="row.field">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm text-text-secondary">{{ row.label }}</span>
                <span class="text-sm font-medium text-text">${{ formatCurrency(row.amount) }}</span>
              </div>
              <div class="h-2 w-full rounded-full bg-bg-secondary">
                <div class="h-2 rounded-full bg-success transition-all" :style="{ width: row.percentage + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="rounded-2xl border border-border bg-surface p-12 text-center">
      <p class="text-sm text-text-muted">No se pudo cargar el resumen financiero.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatCard from '../common/StatCard.vue'
import { useDailyReportDashboard } from '../../composables/reportes/useDailyReportDashboard'

const {
  periods, selectedPeriod, selectedMonth, customFrom, customTo,
  goPrev, goNext, resetToCurrent,
  summary, isLoading,
} = useDailyReportDashboard()

const formatCurrency = (val: number) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Equivalentes cruzados para las tarjetas KPI, usando la tasa promedio del
// período (informativa). El total en cada moneda nativa ya es exacto; esto es
// solo una referencia rápida de a cuánto equivale en la otra moneda.
const rate = computed(() => summary.value?.meta.avg_exchange_rate ?? 0)
const bsEquivOfUsd = computed(() => (summary.value ? summary.value.totals.total_usd * rate.value : 0))
const usdEquivOfBs = computed(() => (summary.value && rate.value > 0 ? summary.value.totals.total_bs / rate.value : 0))

const BS_LABELS: Record<string, string> = {
  pos_bs: 'Punto de Venta',
  pago_movil_bs: 'Pago Móvil',
  cash_bs: 'Efectivo Bs',
  transfer_bs: 'Transferencia',
  other_bs: 'Otro',
}

const USD_LABELS: Record<string, string> = {
  cash_usd: 'Efectivo USD',
  zelle_usd: 'Zelle',
  binance_usd: 'Binance',
  cashea_usd: 'Cashea',
  card_usd: 'Tarjeta',
  gift_card_usd: 'Gift Card',
  other_usd: 'Otro',
}

function buildBreakdown(labels: Record<string, string>) {
  return computed(() => {
    const fields = summary.value?.fields
    if (!fields) return []
    const rows = Object.entries(labels).map(([field, label]) => ({
      field,
      label,
      amount: (fields as any)[field] as number,
    }))
    const max = Math.max(...rows.map(r => r.amount), 0)
    return rows
      .map(r => ({ ...r, percentage: max > 0 ? Math.max((r.amount / max) * 100, r.amount > 0 ? 3 : 0) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  })
}

const bsBreakdown = buildBreakdown(BS_LABELS)
const usdBreakdown = buildBreakdown(USD_LABELS)
</script>
