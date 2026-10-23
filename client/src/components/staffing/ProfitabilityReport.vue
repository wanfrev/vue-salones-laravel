<template>
  <div class="space-y-4 p-3 sm:p-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted" for="prof-start">Desde</label>
        <input id="prof-start" v-model="periodStart" type="date" class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>
      <div>
        <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted" for="prof-end">Hasta</label>
        <input id="prof-end" v-model="periodEnd" type="date" class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>
      <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
        <button v-for="p in PRESETS" :key="p.label" type="button"
          class="px-3 py-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text"
          @click="applyPreset(p.days)">{{ p.label }}</button>
      </div>
    </div>

    <div v-if="isLoading" class="divide-y divide-border-subtle" aria-busy="true">
      <p class="sr-only">Cargando...</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3"><span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" /><span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" /><span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" /></div>
    </div>
    <p v-else-if="isError" class="py-8 text-center text-sm text-danger">No se pudo cargar el reporte (el rango máximo es de un año).</p>

    <template v-else-if="report">
      <p v-if="report.byCompany.length === 0" class="py-8 text-center text-sm text-text-muted">
        No hay semanas aprobadas o pagadas en este período.
      </p>

      <template v-else>
        <div v-if="report.totals" class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle sm:grid-cols-4">
          <div class="bg-surface px-3 py-2.5">
            <p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Facturado</p>
            <p class="text-base font-bold tabular-nums text-text">{{ formatUSD(report.totals.revenue) }}</p>
          </div>
          <div class="bg-surface px-3 py-2.5">
            <p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Costo</p>
            <p class="text-base font-bold tabular-nums text-text">{{ formatUSD(report.totals.cost) }}</p>
          </div>
          <div class="bg-surface px-3 py-2.5">
            <p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Margen</p>
            <p class="text-base font-bold tabular-nums text-success">{{ formatUSD(report.totals.margin) }}</p>
          </div>
          <div class="bg-surface px-3 py-2.5">
            <p class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Margen %</p>
            <p class="text-base font-bold tabular-nums text-text">{{ pct(report.totals.marginPct) }}</p>
          </div>
        </div>

        <section v-for="block in blocks" :key="block.title">
          <h3 class="mb-2 text-sm font-semibold text-text">{{ block.title }}</h3>
          <div class="scroll-thin overflow-x-auto overflow-y-hidden rounded-xl border border-border-subtle">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  <th class="px-3 py-2.5">{{ block.header }}</th>
                  <th class="px-3 py-2.5 text-right">Horas</th>
                  <th class="px-3 py-2.5 text-right">Facturado</th>
                  <th class="px-3 py-2.5 text-right">Costo</th>
                  <th class="px-3 py-2.5 text-right">Margen</th>
                  <th class="px-3 py-2.5 text-right">Margen %</th>
                  <th class="px-3 py-2.5 text-right">Margen / hora</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                <tr v-for="row in block.rows" :key="row.label">
                  <td class="px-3 py-2 font-medium text-text">{{ row.label }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ row.hours.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(row.revenue) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(row.cost) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold" :class="row.margin < 0 ? 'text-danger' : 'text-success'">{{ formatUSD(row.margin) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text">{{ pct(row.marginPct) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ row.marginPerHour === null ? '—' : formatUSD(row.marginPerHour) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p class="text-[11px] text-text-muted">Solo semanas aprobadas o pagadas; los borradores son estimados y no se cuentan. Ordenado de mayor a menor margen.</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useCurrency } from '../../composables/common/useCurrency'
import { toISODate } from '../../lib/formatters'
import { getProfitability, profitabilityKeys } from '../../services/staffing/profitabilityService'

const props = defineProps<{ businessId: string | null }>()
const businessId = toRef(props, 'businessId')
const { formatUSD } = useCurrency()

const PRESETS = [
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '1 año', days: 365 },
]

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d) }
const periodStart = ref(daysAgo(90))
const periodEnd = ref(toISODate(new Date()))
const applyPreset = (days: number) => { periodStart.value = daysAgo(days); periodEnd.value = toISODate(new Date()) }

const { data: report, isLoading, isError } = useQuery({
  queryKey: computed(() => profitabilityKeys.period(businessId.value, periodStart.value, periodEnd.value)),
  queryFn: () => getProfitability(periodStart.value, periodEnd.value),
  enabled: computed(() => !!businessId.value && !!periodStart.value && !!periodEnd.value && periodStart.value <= periodEnd.value),
  staleTime: 0,
})

const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)}%`)

const blocks = computed(() => [
  { title: 'Por empresa', header: 'Empresa', rows: report.value?.byCompany ?? [] },
  { title: 'Por rol', header: 'Rol', rows: report.value?.byRole ?? [] },
])
</script>
