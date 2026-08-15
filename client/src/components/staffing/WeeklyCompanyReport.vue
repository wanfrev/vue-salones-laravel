<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">Resultados semanales</p>
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-text-muted" for="weekly-report-week">Semana desde</label>
        <input id="weekly-report-week" v-model="weekStart" type="date"
          class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text" />
        <span class="text-xs text-text-muted">{{ weekStart ? formatDateUS(weekStart) : '—' }}</span>
      </div>
    </div>

    <div v-if="report.isLoading.value" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

    <p v-else-if="report.rows.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      Sin empresas registradas.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="px-3 py-2">Estado</th>
            <th class="px-3 py-2">Empresa</th>
            <th class="px-3 py-2">Proyecto</th>
            <th class="px-3 py-2 text-right">Nómina</th>
            <th class="px-3 py-2 text-right">Invoice</th>
            <th class="px-3 py-2 text-right">Ganancia bruta</th>
            <th class="px-3 py-2 text-right">Overhead</th>
            <th class="px-3 py-2 text-right">Otros gastos</th>
            <th class="px-3 py-2 text-right">Total</th>
            <th class="px-3 py-2 text-right"># Empleados</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="row in report.rows.value" :key="row.companyId">
            <td class="px-3 py-2">
              <select
                class="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                :value="row.estadoOverride ?? ''"
                :title="row.estadoOverride ? 'Override manual' : `Automático: ${ESTADO_LABELS[row.estadoAuto]}`"
                @change="handleEstadoChange(row, $event)">
                <option value="">Auto: {{ ESTADO_LABELS[row.estadoAuto] }}</option>
                <option v-for="opt in ESTADO_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </td>
            <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ row.name }}</td>
            <td class="px-3 py-2">
              <input type="text" :value="row.proyecto ?? ''" placeholder="Sin proyecto"
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
import { ref, toRef } from 'vue'
import { useStaffingWeeklyReport } from '../../composables/staffing/useStaffingWeeklyReport'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatDateUS, toISODate } from '../../lib/formatters'
import type { StaffingWeeklyReportEstado, StaffingWeeklyReportRow } from '../../services/staffing/staffingService'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()

const ESTADO_LABELS: Record<StaffingWeeklyReportEstado, string> = {
  paid: 'Invoice pagado',
  pending: 'Invoice pendiente de pago',
  no_invoice: 'Sin invoice generado todavía',
}

const ESTADO_OPTIONS: { value: StaffingWeeklyReportEstado; label: string }[] = [
  { value: 'paid', label: 'Invoice pagado' },
  { value: 'pending', label: 'Invoice pendiente de pago' },
  { value: 'no_invoice', label: 'Sin invoice generado todavía' },
]

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
