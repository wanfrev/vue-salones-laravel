<template>
  <div class="p-3 sm:p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">{{ t('reports.weekly.title') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="text" :placeholder="t('reports.searchCompanyOrProject')"
            class="w-44 rounded-xl border border-border bg-bg-secondary/40 py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 sm:w-56" />
        </div>
        <label class="text-[11px] font-bold uppercase tracking-wider text-text-muted" for="weekly-report-week">{{ t('reports.weekly.weekFrom') }}</label>
        <input id="weekly-report-week" v-model="weekStart" type="date"
          class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <span class="text-xs text-text-muted">{{ weekStart ? formatDateUS(weekStart) : '—' }}</span>
      </div>
    </div>

    <div v-if="report.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <p class="sr-only">{{ t('reports.loading') }}</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3"><span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" /><span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" /><span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" /></div>
    </div>

    <p v-else-if="report.rows.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      {{ t('reports.noCompanies') }}
    </p>

    <p v-else-if="filteredRows.length === 0" class="py-8 text-center text-sm text-text-muted">
      {{ t('reports.noCompanyMatch', { search }) }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
            <th class="px-3 py-2">{{ t('reports.weekly.colStatus') }}</th>
            <th class="px-3 py-2">{{ t('reports.company') }}</th>
            <th class="px-3 py-2">{{ t('reports.weekly.project') }}</th>
            <th class="px-3 py-2 text-right">{{ t('reports.weekly.colPayroll') }}</th>
            <th class="px-3 py-2 text-right">Invoice</th>
            <th class="px-3 py-2 text-right">{{ t('reports.weekly.colGross') }}</th>
            <th class="px-3 py-2 text-right">Overhead</th>
            <th class="px-3 py-2 text-right">{{ t('reports.weekly.colOtherExpenses') }}</th>
            <th class="px-3 py-2 text-right">{{ t('reports.total') }}</th>
            <th class="px-3 py-2 text-right">{{ t('reports.weekly.colEmployees') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <tr v-for="row in filteredRows" :key="row.companyId">
            <td class="px-3 py-2">
              <select
                class="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                :value="row.estadoOverride ?? ''"
                :title="row.estadoOverride ? t('reports.weekly.manualOverride') : t('reports.weekly.automatic', { state: ESTADO_LABELS[row.estadoAuto] })"
                @change="handleEstadoChange(row, $event)">
                <option value="">{{ t('reports.weekly.auto', { state: ESTADO_LABELS[row.estadoAuto] }) }}</option>
                <option v-for="opt in ESTADO_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </td>
            <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ row.name }}</td>
            <td class="px-3 py-2">
              <input type="text" :value="row.proyecto ?? ''" :placeholder="t('reports.weekly.noProject')"
                class="w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                @change="handleProyectoChange(row.companyId, $event)" />
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(row.nomina) }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(row.invoice) }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(row.gananciaBruta) }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-secondary">
              {{ formatUSD(row.overhead) }} <span class="text-[10px] text-text-muted">({{ (row.overheadRate * 100).toFixed(1) }}%)</span>
            </td>
            <td class="px-3 py-2">
              <input type="number" min="0" step="0.01" :value="row.otrosGastos"
                class="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                @change="handleExpenseChange(row.companyId, $event)" />
            </td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ formatUSD(row.total) }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ row.empleados }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="report.saveError.value" class="mt-2 text-xs text-danger">{{ report.saveError.value }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useStaffingWeeklyReport } from '../../composables/staffing/useStaffingWeeklyReport'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatDateUS, toISODate } from '../../lib/formatters'
import { MagnifierIcon } from '@solar-icons/vue/linear'
import { useI18n } from '../../i18n'
import type { StaffingWeeklyReportEstado, StaffingWeeklyReportRow } from '../../services/staffing/staffingService'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()
const { t } = useI18n()

const ESTADO_LABELS = computed<Record<StaffingWeeklyReportEstado, string>>(() => ({
  paid: t('reports.weekly.paid'),
  pending: t('reports.weekly.pending'),
  no_invoice: t('reports.weekly.no_invoice'),
}))

const ESTADO_OPTIONS = computed<{ value: StaffingWeeklyReportEstado; label: string }[]>(() => [
  { value: 'paid', label: t('reports.weekly.paid') },
  { value: 'pending', label: t('reports.weekly.pending') },
  { value: 'no_invoice', label: t('reports.weekly.no_invoice') },
])

/**
 * Defaults to the most recent Sunday — same convention as StaffingHoursPanel.vue. Uses
 * toISODate (local calendar date), not toISOString().slice(0, 10) — the latter converts to UTC
 * first and can silently land on a different Sunday than Nómina's, so the two screens disagree
 * about which week "this week" even is.
 */
const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}

const weekStart = ref(defaultWeekStart())

const report = useStaffingWeeklyReport(toRef(props, 'businessId'), weekStart)

const search = ref('')
const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return report.rows.value
  return report.rows.value.filter(r =>
    r.name.toLowerCase().includes(term) || (r.proyecto ?? '').toLowerCase().includes(term)
  )
})

const handleExpenseChange = async (companyId: string, event: Event) => {
  const amount = Number((event.target as HTMLInputElement).value) || 0
  await report.saveExpense({ companyId, weekStart: weekStart.value, amount })
}

const handleEstadoChange = async (row: StaffingWeeklyReportRow, event: Event) => {
  const value = (event.target as HTMLSelectElement).value as StaffingWeeklyReportEstado | ''
  await report.saveEstado(row.companyId, weekStart.value, row.otrosGastos, value || null)
}

const handleProyectoChange = async (companyId: string, event: Event) => {
  await report.saveProyecto(companyId, (event.target as HTMLInputElement).value.trim())
}
</script>
