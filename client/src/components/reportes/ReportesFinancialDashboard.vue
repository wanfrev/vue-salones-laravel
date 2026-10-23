<template>
  <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <!-- Selector de período -->
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border-subtle px-3 py-2.5 sm:px-4">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
          <button
            v-for="p in periods" :key="p.value"
            @click="selectedPeriod = p.value"
            :class="['px-3 py-2 transition-colors', selectedPeriod === p.value ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text']"
          >{{ p.label }}</button>
        </div>
        <div class="flex items-center gap-1">
          <button v-if="selectedPeriod !== 'custom'" @click="goPrev" class="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Anterior" aria-label="Anterior">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input
            v-if="selectedPeriod === 'month'"
            v-model="selectedMonth"
            type="month"
            class="w-[140px] rounded-xl border border-border bg-surface px-2 py-2 text-center text-xs text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <template v-else>
            <input
              type="date"
              :value="customFrom"
              @change="customFrom = ($event.target as HTMLInputElement).value"
              class="w-[130px] rounded-xl border border-border bg-surface px-2 py-2 text-center text-xs text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <span class="text-xs text-text-muted">—</span>
            <input
              type="date"
              :value="customTo"
              @change="customTo = ($event.target as HTMLInputElement).value"
              class="w-[130px] rounded-xl border border-border bg-surface px-2 py-2 text-center text-xs text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </template>
          <button v-if="selectedPeriod !== 'custom'" @click="goNext" class="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Siguiente" aria-label="Siguiente">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" class="ml-1 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10" @click="resetToCurrent">{{ selectedPeriod === 'custom' ? 'Hoy' : 'Ahora' }}</button>
        </div>
      </div>
      <span v-if="summary" class="text-xs text-text-muted">{{ summary.meta.reports_count }} reporte(s) en el período</span>
    </div>

    <div v-if="isLoading" class="grid grid-cols-2 divide-x divide-border-subtle lg:grid-cols-4" aria-busy="true">
      <div v-for="i in 4" :key="i" class="space-y-2 px-4 py-4">
        <div class="h-5 w-24 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
      </div>
    </div>

    <template v-else-if="summary">
      <!-- KPIs: celdas con líneas finas -->
      <div class="overflow-hidden">
        <div class="-mb-px -mr-px grid grid-cols-2 xl:grid-cols-4">
          <div v-for="k in kpis" :key="k.label" class="border-b border-r border-border-subtle px-4 py-3.5">
            <div class="flex items-center gap-2.5">
              <svg class="h-5 w-5 shrink-0 opacity-80" :class="k.color" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" :d="k.icon" />
              </svg>
              <div class="min-w-0">
                <p class="text-lg font-bold tabular-nums text-text">{{ k.value }}</p>
                <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted">{{ k.label }}</p>
                <p v-if="k.sublabel" class="text-xs tabular-nums text-text-muted">{{ k.sublabel }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desglose por método -->
      <div class="grid grid-cols-1 divide-y divide-border-subtle border-t border-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div class="px-4 py-4">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">Ingresos por Método — Bolívares (Bs)</h3>
          <div v-if="bsBreakdown.every(b => b.amount === 0)" class="py-4 text-center text-xs text-text-muted">Sin ingresos en Bs en este período.</div>
          <div v-else class="space-y-3">
            <div v-for="row in bsBreakdown" :key="row.field">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm text-text-secondary">{{ row.label }}</span>
                <span class="text-sm font-medium tabular-nums text-text">{{ formatCurrency(row.amount) }} Bs</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-bg-secondary">
                <div class="h-1.5 rounded-full bg-primary transition-all" :style="{ width: row.percentage + '%' }"></div>
              </div>
              <!-- Desglose por banco -- solo aparece si ese método (pago móvil/transferencia/
                   punto de venta) tuvo más de un banco configurado con movimientos reales. -->
              <div v-if="row.banks.length > 0" class="ml-3 mt-1.5 space-y-1 border-l-2 border-border-subtle pl-3">
                <div v-for="bank in row.banks" :key="bank.name" class="flex items-center justify-between">
                  <span class="text-xs text-text-muted">{{ bank.name }}</span>
                  <span class="text-xs font-medium tabular-nums text-text-secondary">{{ formatCurrency(bank.amount_bs) }} Bs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="px-4 py-4">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">Ingresos por Método — Dólares (USD)</h3>
          <div v-if="usdBreakdown.every(b => b.amount === 0)" class="py-4 text-center text-xs text-text-muted">Sin ingresos en USD en este período.</div>
          <div v-else class="space-y-3">
            <div v-for="row in usdBreakdown" :key="row.field">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm text-text-secondary">{{ row.label }}</span>
                <span class="text-sm font-medium tabular-nums text-text">${{ formatCurrency(row.amount) }}</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-bg-secondary">
                <div class="h-1.5 rounded-full bg-success transition-all" :style="{ width: row.percentage + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cobros por persona -- solo admin/superadmin (ver isStrictAdmin más arriba). El backend
           ya quita by_cashier de la respuesta para cualquier otro rol; esto además evita pintar
           la sección vacía si por lo que sea llegara sin datos. -->
      <div v-if="isStrictAdmin && cashierBreakdown.length > 0" class="border-t border-border-subtle">
        <div class="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Cobros por Persona</h3>
          <span class="text-[11px] text-text-muted">Para cuadrar cada caja por separado</span>
        </div>
        <div class="overflow-hidden">
          <div class="-mb-px -mr-px mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="cashier in cashierBreakdown" :key="cashier.user_id ?? cashier.name"
              class="border-b border-r border-border-subtle p-4">
              <p class="mb-2 text-sm font-semibold text-text">{{ cashier.name }}</p>
              <div class="mb-2 flex items-baseline gap-3">
                <span class="text-base font-bold tabular-nums text-text">${{ formatCurrency(cashier.usd_total) }}</span>
                <span v-if="cashier.ves_total > 0" class="text-sm font-medium tabular-nums text-text-secondary">{{ formatCurrency(cashier.ves_total) }} Bs</span>
              </div>
              <div class="space-y-1">
                <div v-for="item in cashier.usd_items" :key="'usd-' + item.method" class="flex items-center justify-between text-xs">
                  <span class="text-text-muted">{{ formatMethod(item.method) }}</span>
                  <span class="font-medium tabular-nums text-text-secondary">${{ formatCurrency(item.amount) }}</span>
                </div>
                <div v-for="item in cashier.ves_items" :key="'ves-' + item.method" class="flex items-center justify-between text-xs">
                  <span class="text-text-muted">{{ formatMethod(item.method) }}</span>
                  <span class="font-medium tabular-nums text-text-secondary">{{ formatCurrency(item.amount) }} Bs</span>
                </div>
              </div>
              <p v-if="cashier.credito_issued > 0" class="mt-2 border-t border-border-subtle pt-1.5 text-[11px] text-warning">
                + ${{ formatCurrency(cashier.credito_issued) }} en ventas a crédito (no cobrado)
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="px-4 py-12 text-center">
      <p class="text-sm text-text-muted">No se pudo cargar el resumen financiero.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
// (StatCard ya no se usa en esta vista)
import { useDailyReportDashboard } from '../../composables/reportes/useDailyReportDashboard'
import { useBusinessStore } from '../../store/business'
import { useAuth } from '../../composables/common/useAuth'
import { formatMethod } from '../../lib/formatters'

const businessStore = useBusinessStore()
const { authStore } = useAuth()
// Quién cobró cuánto es información de supervisión entre personas -- mismo criterio que
// Finanzas > Bancos (ver BankController::ensureStrictAdmin()), no algo que un encargado deba
// ver de sus compañeros. El backend ya quita `by_cashier` de la respuesta si no calza, esto solo
// evita que la sección intente pintarse para quien de todas formas no recibe el dato.
const isStrictAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')
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
// Iconos de los indicadores (los mismos de siempre).
const ICON_MONEY = 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z'
const ICON_COIN = 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z'

const bsEquivOfUsd = computed(() => (summary.value ? summary.value.totals.total_usd * rate.value : 0))
const usdEquivOfBs = computed(() => (summary.value && rate.value > 0 ? summary.value.totals.total_bs / rate.value : 0))

const kpis = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { icon: ICON_MONEY, color: 'text-success', value: `$${formatCurrency(s.totals.total_usd)}`, label: 'Ingresos USD', sublabel: `≈ ${formatCurrency(bsEquivOfUsd.value)} Bs` },
    { icon: ICON_MONEY, color: 'text-primary', value: `${formatCurrency(s.totals.total_bs)} Bs`, label: 'Ingresos Bs', sublabel: `≈ $${formatCurrency(usdEquivOfBs.value)} USD` },
    { icon: ICON_COIN, color: 'text-warning', value: `$${formatCurrency(s.totals.credit_usd)}`, label: 'Créditos USD', sublabel: '' },
    { icon: ICON_COIN, color: 'text-warning', value: `${formatCurrency(s.totals.credit_bs)} Bs`, label: 'Créditos Bs', sublabel: '' },
  ]
})

const BS_LABELS: Record<string, string> = {
  pos_bs: 'Punto de Venta',
  pago_movil_bs: 'Pago Móvil',
  cash_bs: 'Efectivo Bs',
  transfer_bs: 'Transferencia',
  other_bs: 'Otro',
}

const USD_LABELS = computed(() => {
  const labels: Record<string, string> = {
    cash_usd: 'Efectivo USD',
    zelle_usd: 'Zelle',
    binance_usd: 'Binance',
    cashea_usd: 'Cashea',
    card_usd: 'Tarjeta',
    other_usd: 'Otro',
  }
  if (businessStore.features.gift_cards) {
    labels.gift_card_usd = 'Gift Card'
  }
  return labels
})

function buildBreakdown(labelsRef: import('vue').ComputedRef<Record<string, string>> | Record<string, string>) {
  return computed(() => {
    const labels = ('value' in labelsRef) ? labelsRef.value : labelsRef
    const fields = summary.value?.fields
    if (!fields) return []
    const banksByField = summary.value?.banks ?? {}
    const rows = Object.entries(labels).map(([field, label]) => ({
      field,
      label,
      amount: (fields as any)[field] as number,
      // Solo pago_movil_bs/transfer_bs/pos_bs pueden tener bancos (ver Finanzas > Bancos) --
      // para el resto (incluyendo todo lo de USD) esto siempre queda vacío.
      banks: (banksByField as any)[field] ?? [],
    }))
    const max = Math.max(...rows.map(r => r.amount), 0)
    return rows
      .map(r => ({ ...r, percentage: max > 0 ? Math.max((r.amount / max) * 100, r.amount > 0 ? 3 : 0) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  })
}

const bsBreakdown = buildBreakdown(BS_LABELS)
const usdBreakdown = buildBreakdown(USD_LABELS)

const cashierBreakdown = computed(() => summary.value?.by_cashier ?? [])
</script>
