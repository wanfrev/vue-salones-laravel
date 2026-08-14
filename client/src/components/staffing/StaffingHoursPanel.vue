<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-[220px] flex-1">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="hours-company">
          Empresa
        </label>
        <select id="hours-company" v-model="selectedCompanyId" :class="inputClass">
          <option value="" disabled>Selecciona una empresa</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="hours-week-start">
          Semana desde
        </label>
        <input id="hours-week-start" v-model="weekStartInput" type="date" :class="inputClass" />
      </div>

      <div class="rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 text-xs text-text-muted">
        Hasta <span class="font-semibold text-text">{{ weekEnd || '—' }}</span>
      </div>

      <span v-if="currentWeek" class="rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="currentWeek.status === 'draft' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'">
        {{ currentWeek.status === 'draft' ? 'Borrador' : currentWeek.status === 'approved' ? 'Aprobada' : 'Pagada' }}
      </span>
    </div>

    <p v-if="!selectedCompanyId" class="py-10 text-center text-sm text-text-muted">
      Selecciona una empresa para cargar sus horas.
    </p>

    <template v-else>
      <div v-if="timesheets.employeesLoading.value" class="py-10 text-center text-sm text-text-muted">
        Cargando empleados...
      </div>

      <p v-else-if="(timesheets.employees.value ?? []).length === 0" class="py-10 text-center text-sm text-text-muted">
        Esta empresa no tiene empleados asignados todavía. Asígnalos desde su ficha en Equipo.
      </p>

      <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th class="px-3 py-2.5">Empleado</th>
                <th class="px-3 py-2.5 text-right">Horas totales</th>
                <th class="px-3 py-2.5 text-right">Horas regulares</th>
                <th class="px-3 py-2.5 text-right">Pay rate</th>
                <th class="px-3 py-2.5 text-right">Bill rate</th>
                <th class="px-3 py-2.5 text-right">Total regular</th>
                <th class="px-3 py-2.5 text-right">Horas OT</th>
                <th class="px-3 py-2.5 text-right">OT rate</th>
                <th class="px-3 py-2.5 text-right">Total OT</th>
                <th class="px-3 py-2.5 text-right">Deducción</th>
                <th class="px-3 py-2.5 text-right">Fee fijo</th>
                <th class="px-3 py-2.5 text-right">Ajuste</th>
                <th class="px-3 py-2.5 text-right">Total semanal</th>
                <th class="px-3 py-2.5 text-right">% retención</th>
                <th class="px-3 py-2.5 text-right">Total</th>
                <th class="px-3 py-2.5 text-right">Redondeo</th>
                <th class="px-3 py-2.5 text-right">Factura</th>
                <th class="px-3 py-2.5 text-right">Margen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="employee in timesheets.employees.value" :key="employee.id">
                <td class="px-3 py-2.5">
                  <p class="font-medium text-text">{{ employee.full_name }}</p>
                  <p class="text-xs text-text-muted">{{ employee.staffing_role || 'Sin rol' }}</p>
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="grid[employee.id].totalHours" type="number" min="0" max="168" step="0.01"
                    :disabled="isReadOnly" :class="cellInputClass" />
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ resultFor(employee.id)?.regular_hours?.toFixed(2) ?? '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ resultFor(employee.id) ? formatUSD(resultFor(employee.id)!.pay_rate) : '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ resultFor(employee.id) ? formatUSD(resultFor(employee.id)!.bill_rate) : '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(regularAmountFor(employee.id)) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ resultFor(employee.id)?.overtime_hours?.toFixed(2) ?? '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ overtimeRateFor(employee.id) ? formatUSD(overtimeRateFor(employee.id)) : '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(overtimeAmountFor(employee.id)) }}</td>
                <td class="px-3 py-2">
                  <input v-model.number="grid[employee.id].preTaxDeduction" type="number" min="0" step="0.01"
                    :disabled="isReadOnly" :class="cellInputClass" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="grid[employee.id].fixedFees" type="number" min="0" step="0.01"
                    :disabled="isReadOnly" :class="cellInputClass" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="grid[employee.id].adjustment" type="number" step="0.01"
                    :disabled="isReadOnly" :class="cellInputClass" />
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(resultFor(employee.id)?.gross ?? 0) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ taxPercentFor(employee.id).toFixed(1) }}%</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ formatUSD(resultFor(employee.id)?.payout ?? 0) }}</td>
                <td class="px-3 py-2 text-right text-text-secondary">{{ roundingLabel }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ formatUSD(resultFor(employee.id)?.invoice_total ?? 0) }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold text-success">{{ formatUSD(resultFor(employee.id)?.margin ?? 0) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="currentWeek">
              <tr class="border-t border-border bg-bg-secondary/60 text-xs font-semibold">
                <td class="px-3 py-2.5 text-text">Total</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ totals.hours.toFixed(2) }}</td>
                <td colspan="10"></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatUSD(totals.gross) }}</td>
                <td class="px-3 py-2.5"></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatUSD(totals.payout) }}</td>
                <td class="px-3 py-2.5"></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatUSD(totals.invoice) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-success">{{ formatUSD(totals.margin) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p v-if="timesheets.saveError.value" class="text-sm text-danger">{{ timesheets.saveError.value }}</p>

      <div v-if="(timesheets.employees.value ?? []).length > 0" class="flex flex-wrap items-center justify-end gap-2">
        <button v-if="currentWeek?.status === 'draft'" type="button"
          class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10"
          @click="removeWeek">
          Eliminar borrador
        </button>
        <button v-if="!isReadOnly" type="button" :disabled="timesheets.saveMutation.isPending.value"
          class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleSave">
          {{ timesheets.saveMutation.isPending.value ? 'Calculando...' : 'Guardar y calcular' }}
        </button>
        <button v-if="currentWeek?.status === 'draft'" type="button" :disabled="timesheets.approveMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleApprove">
          {{ timesheets.approveMutation.isPending.value ? 'Aprobando...' : 'Aprobar semana' }}
        </button>
        <button v-else-if="currentWeek && !existingInvoice" type="button" :disabled="billing.generateMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleGenerateInvoice">
          {{ billing.generateMutation.isPending.value ? 'Generando...' : 'Generar factura' }}
        </button>
        <button v-else-if="existingInvoice" type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="handlePrintInvoice">
          Ver factura #{{ existingInvoice.invoice_number }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { useTimesheets } from '../../composables/staffing/useTimesheets'
import { useBilling } from '../../composables/staffing/useBilling'
import { getStaffingInvoice, listStaffingCompanies, staffingCompanyKeys } from '../../services/staffing/staffingService'
import type { TimesheetEntryInput } from '../../services/staffing/staffingService'
import { printStaffingInvoice } from '../../lib/staffingInvoicePrint'
import type { StaffingTimesheetEntry } from '../../types/database'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'
const cellInputClass =
  'w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-muted'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()

const businessId = computed(() => props.businessId)

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(props.businessId)),
  queryFn: () => listStaffingCompanies(props.businessId!),
  enabled: computed(() => !!props.businessId),
})

const selectedCompanyId = ref('')
const companyId = computed(() => selectedCompanyId.value || null)

const timesheets = useTimesheets(businessId, companyId)
const billing = useBilling(businessId, companyId)

const existingInvoice = computed(() =>
  (billing.invoices.value ?? []).find(i => i.timesheet_id === currentWeek.value?.id) ?? null,
)

/** Defaults to the most recent Sunday, matching the FROM/TO convention on the source sheets. */
const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

const weekStartInput = ref(defaultWeekStart())

const weekEnd = computed(() => {
  if (!weekStartInput.value) return ''
  const d = new Date(weekStartInput.value + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
})

const currentWeek = computed(() => timesheets.findWeek(weekStartInput.value))

const isReadOnly = computed(() => !!currentWeek.value && currentWeek.value.status !== 'draft')

type GridRow = { totalHours: number; preTaxDeduction: number; fixedFees: number; adjustment: number }
const grid = reactive<Record<string, GridRow>>({})

const emptyRow = (): GridRow => ({ totalHours: 0, preTaxDeduction: 0, fixedFees: 0, adjustment: 0 })

/** (Re)builds the grid from the employee roster, prefilling from the saved week when one exists. */
const rebuildGrid = () => {
  const employees = timesheets.employees.value ?? []
  const savedEntries = currentWeek.value?.entries ?? []
  const byEmployee = new Map(savedEntries.map(e => [e.employee_id, e]))

  for (const key of Object.keys(grid)) delete grid[key]

  for (const employee of employees) {
    const saved = byEmployee.get(employee.id)
    grid[employee.id] = saved
      ? {
          totalHours: saved.total_hours,
          preTaxDeduction: saved.pre_tax_deduction,
          fixedFees: saved.fixed_fees,
          adjustment: saved.adjustment,
        }
      : emptyRow()
  }
}

watch([() => timesheets.employees.value, currentWeek], rebuildGrid, { immediate: true })

const resultFor = (employeeId: string): StaffingTimesheetEntry | undefined =>
  currentWeek.value?.entries.find(e => e.employee_id === employeeId)

/** What the regular hours alone earned — the calculator's own regularAmount, not persisted, so derived here. */
const regularAmountFor = (employeeId: string): number => {
  const entry = resultFor(employeeId)
  return entry ? entry.regular_hours * entry.pay_rate : 0
}

/** gross = regularAmount + overtimeAmount - preTaxDeduction, so this is the OT amount alone. */
const overtimeAmountFor = (employeeId: string): number => {
  const entry = resultFor(employeeId)
  if (!entry) return 0
  return entry.gross - regularAmountFor(employeeId) + entry.pre_tax_deduction
}

/** Effective $/hour paid on the OT hours — derived rather than assumed 1.5x, since a role's
 *  overtime multiplier can now be its own override (see Fase 1). */
const overtimeRateFor = (employeeId: string): number => {
  const entry = resultFor(employeeId)
  if (!entry || entry.overtime_hours <= 0) return 0
  return overtimeAmountFor(employeeId) / entry.overtime_hours
}

const taxPercentFor = (employeeId: string): number => {
  const entry = resultFor(employeeId)
  if (!entry || entry.gross <= 0) return 0
  return (entry.tax_withheld / entry.gross) * 100
}

const ROUNDING_LABELS: Record<string, string> = {
  cent: 'Al centavo',
  floor: 'Dólar entero',
  exact: 'Exacto',
}

const roundingLabel = computed(() => {
  const company = (companies.value ?? []).find(c => c.id === selectedCompanyId.value)
  return company ? (ROUNDING_LABELS[company.payoutRounding] ?? 'Al centavo') : '—'
})

const totals = computed(() => {
  const entries = currentWeek.value?.entries ?? []
  return entries.reduce(
    (acc, e) => ({
      hours: acc.hours + e.total_hours,
      gross: acc.gross + e.gross,
      tax: acc.tax + e.tax_withheld,
      payout: acc.payout + e.payout,
      invoice: acc.invoice + e.invoice_total,
      margin: acc.margin + e.margin,
    }),
    { hours: 0, gross: 0, tax: 0, payout: 0, invoice: 0, margin: 0 },
  )
})

const handleSave = async () => {
  const entries: TimesheetEntryInput[] = Object.entries(grid).map(([employeeId, row]) => ({
    employeeId,
    totalHours: row.totalHours || 0,
    preTaxDeduction: row.preTaxDeduction || 0,
    fixedFees: row.fixedFees || 0,
    adjustment: row.adjustment || 0,
  }))

  await timesheets.save(weekStartInput.value, weekEnd.value, entries)
}

const handleApprove = async () => {
  if (currentWeek.value) await timesheets.approve(currentWeek.value.id)
}

const handleGenerateInvoice = async () => {
  if (currentWeek.value) await billing.generateInvoice(currentWeek.value.id)
}

const handlePrintInvoice = async () => {
  if (!existingInvoice.value) return
  const full = await getStaffingInvoice(existingInvoice.value.id)
  printStaffingInvoice(full, businessStore.business?.name || 'Delta Work Force')
}

const removeWeek = () => {
  if (!currentWeek.value) return
  if (window.confirm('¿Eliminar el borrador de esta semana? Las horas cargadas se perderán.')) {
    timesheets.remove(currentWeek.value.id)
  }
}
</script>
