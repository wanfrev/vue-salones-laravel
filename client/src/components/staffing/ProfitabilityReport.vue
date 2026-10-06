<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="prof-start">Desde</label>
        <input id="prof-start" v-model="periodStart" type="date" class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text" />
      </div>
      <div>
        <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="prof-end">Hasta</label>
        <input id="prof-end" v-model="periodEnd" type="date" class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text" />
      </div>
      <div class="flex gap-1">
        <button v-for="p in PRESETS" :key="p.label" type="button"
          class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="applyPreset(p.days)">{{ p.label }}</button>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center text-sm text-text-muted">Cargando...</div>
    <p v-else-if="isError" class="py-8 text-center text-sm text-danger">No se pudo cargar el reporte (el rango máximo es de un año).</p>

    <template v-else-if="report">
      <p v-if="report.byCompany.length === 0" class="py-8 text-center text-sm text-text-muted">
        No hay semanas aprobadas o pagadas en este período.
      </p>

      <template v-else>
        <div v-if="report.totals" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider text-text-muted">Facturado</p>
            <p class="text-sm font-bold tabular-nums text-text">{{ formatUSD(report.totals.revenue) }}</p>
          </div>
          <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider text-text-muted">Costo</p>
            <p class="text-sm font-bold tabular-nums text-text">{{ formatUSD(report.totals.cost) }}</p>
          </div>
          <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider text-text-muted">Margen</p>
            <p class="text-sm font-bold tabular-nums text-success">{{ formatUSD(report.totals.margin) }}</p>
          </div>
          <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider text-text-muted">Margen %</p>
            <p class="text-sm font-bold tabular-nums text-text">{{ pct(report.totals.marginPct) }}</p>
          </div>
        </div>

        <section v-for="block in blocks" :key="block.title">
          <h3 class="mb-2 text-sm font-semibold text-text">{{ block.title }}</h3>
          <div class="overflow-x-auto rounded-xl border border-border bg-surface">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th class="px-3 py-2.5">{{ block.header }}</th>
                  <th class="px-3 py-2.5 text-right">Horas</th>
                  <th class="px-3 py-2.5 text-right">Facturado</th>
                  <th class="px-3 py-2.5 text-right">Costo</th>
                  <th class="px-3 py-2.5 text-right">Margen</th>
                  <th class="px-3 py-2.5 text-right">Margen %</th>
                  <th class="px-3 py-2.5 text-right">Margen / hora</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
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
