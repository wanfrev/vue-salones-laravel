<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">Resultados semanales</p>
      <div class="flex items-center gap-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-text-muted" for="weekly-report-week">Semana desde</label>
        <input id="weekly-report-week" v-model="weekStart" type="date"
          class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text" />
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
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="ESTADO_DOT_CLASS[row.estado]" :title="ESTADO_LABELS[row.estado]" />
            </td>
            <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ row.name }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-text-secondary">{{ row.proyecto || '—' }}</td>
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
import type { StaffingWeeklyReportEstado } from '../../services/staffingService'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()

const ESTADO_LABELS: Record<StaffingWeeklyReportEstado, string> = {
  paid: 'Invoice pagado',
  pending: 'Invoice pendiente de pago',
  no_invoice: 'Sin invoice generado todavía',
}

const ESTADO_DOT_CLASS: Record<StaffingWeeklyReportEstado, string> = {
  paid: 'bg-success',
  pending: 'bg-danger',
  no_invoice: 'bg-text-muted/40',
}

/** Defaults to the most recent Sunday — same convention as StaffingHoursPanel.vue. */
const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

const weekStart = ref(defaultWeekStart())

const report = useStaffingWeeklyReport(toRef(props, 'businessId'), weekStart)

const handleExpenseChange = async (companyId: string, event: Event) => {
  const amount = Number((event.target as HTMLInputElement).value) || 0
  await report.saveExpense({ companyId, weekStart: weekStart.value, amount })
}
</script>
