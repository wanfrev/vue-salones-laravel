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
        Semana:
        <span class="font-semibold text-text">{{ weekStartInput ? formatDateUS(weekStartInput) : '—' }}</span>
        –
        <span class="font-semibold text-text">{{ weekEnd ? formatDateUS(weekEnd) : '—' }}</span>
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
                <th class="px-3 py-2.5 text-right">Bill rate OT</th>
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
              <template v-for="employee in timesheets.employees.value" :key="employee.id">
                <tr>
                  <td class="px-3 py-2.5">
                    <p class="font-medium text-text">{{ employee.full_name }}</p>
                    <p class="text-xs text-text-muted">{{ employee.staffing_role || 'Sin rol' }}</p>
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[employee.id].totalHours" type="number" min="0" max="168" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id)?.regularHours?.toFixed(2) ?? '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.payRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.billRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.regularAmount) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id)?.overtimeHours?.toFixed(2) ?? '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id)?.overtimeRate ? formatUSD(rowFor(employee.id)!.overtimeRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id)?.overtimeBillRate ? formatUSD(rowFor(employee.id)!.overtimeBillRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.overtimeAmount) : '—' }}</td>
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
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.gross) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? rowFor(employee.id)!.taxPercent.toFixed(1) : '0.0' }}%</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.payout) : '—' }}</td>
                  <td class="px-3 py-2 text-right text-text-secondary">{{ roundingLabel }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.invoiceTotal) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold text-success">{{ rowFor(employee.id) ? formatUSD(rowFor(employee.id)!.margin) : '—' }}</td>
                </tr>
                <tr v-if="!rateFor(employee.id)">
                  <td colspan="19" class="px-3 pb-2.5 text-xs text-warning">
                    Sin tarifa configurada para "{{ employee.staffing_role || 'sin rol' }}" en esta empresa — agrégala en Empresas antes de cargar horas.
                  </td>
                </tr>
                <tr v-else-if="rowFor(employee.id)?.isEstimate">
                  <td colspan="19" class="px-3 pb-2.5 text-[10px] text-text-muted">
                    Estimado — guarda para confirmar.
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot v-if="(timesheets.employees.value ?? []).length > 0">
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
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { useTimesheets } from '../../composables/staffing/useTimesheets'
import { useBilling } from '../../composables/staffing/useBilling'
import {
  getStaffingInvoice, listStaffingCompanies, listStaffingRates, staffingCompanyKeys, staffingRateKeys,
} from '../../services/staffing/staffingService'
import type { StaffingRateRow, TimesheetEntryInput } from '../../services/staffing/staffingService'
import { printStaffingInvoice } from '../../lib/staffingInvoicePrint'
import { formatDateUS } from '../../lib/formatters'
import type { StaffingTimesheetEntry } from '../../types/database'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'
const cellInputClass =
  'w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-muted'

const props = defineProps<{
  businessId: string | null
  /** Deep link from Reportes > Mensual — preselects the company/week the admin clicked on. */
  initialCompanyId?: string | null
  initialWeekStart?: string | null
}>()

const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()

const businessId = computed(() => props.businessId)

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(props.businessId)),
  queryFn: () => listStaffingCompanies(props.businessId!),
  enabled: computed(() => !!props.businessId),
})

const selectedCompanyId = ref(props.initialCompanyId || '')
const companyId = computed(() => selectedCompanyId.value || null)

// The rate card for the selected company — needed to estimate pay/OT/invoice live, before the
// admin ever clicks "Guardar y calcular".
const { data: rates } = useQuery({
  queryKey: computed(() => staffingRateKeys.byCompany(props.businessId, companyId.value)),
  queryFn: () => listStaffingRates(props.businessId!, companyId.value!),
  enabled: computed(() => !!props.businessId && !!companyId.value),
})

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

const weekStartInput = ref(props.initialWeekStart || defaultWeekStart())

const weekEnd = computed(() => {
  if (!weekStartInput.value) return ''
  const d = new Date(weekStartInput.value + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
})

const currentWeek = computed(() => timesheets.findWeek(weekStartInput.value))

const isReadOnly = computed(() => !!currentWeek.value && currentWeek.value.status !== 'draft')

type GridRow = { totalHours: number; preTaxDeduction: number; fixedFees: number; adjustment: number }
// A plain ref, replaced wholesale on every week/roster change (see rebuildGrid) rather than a
// reactive() object mutated key-by-key — a single assignment is unambiguous to Vue's reactivity,
// so switching weeks can never leave a stale key from the previous one behind.
const grid = ref<Record<string, GridRow>>({})

const emptyRow = (): GridRow => ({ totalHours: 0, preTaxDeduction: 0, fixedFees: 0, adjustment: 0 })

/** Rebuilds the grid from scratch for the roster + week currently selected, prefilling from the
 *  saved week's entries when one exists — this is what makes switching weeks show that week's
 *  own data instead of whatever was last typed. */
const rebuildGrid = () => {
  const employees = timesheets.employees.value ?? []
  const savedEntries = currentWeek.value?.entries ?? []
  const byEmployee = new Map(savedEntries.map(e => [e.employee_id, e]))

  const next: Record<string, GridRow> = {}
  for (const employee of employees) {
    const saved = byEmployee.get(employee.id)
    next[employee.id] = saved
      ? {
          totalHours: saved.total_hours,
          preTaxDeduction: saved.pre_tax_deduction,
          fixedFees: saved.fixed_fees,
          adjustment: saved.adjustment,
        }
      : emptyRow()
  }
  grid.value = next
}

watch([() => timesheets.employees.value, weekStartInput, currentWeek], rebuildGrid, { immediate: true })

const resultFor = (employeeId: string): StaffingTimesheetEntry | undefined =>
  currentWeek.value?.entries.find(e => e.employee_id === employeeId)

const rateFor = (employeeId: string): StaffingRateRow | undefined => {
  const employee = (timesheets.employees.value ?? []).find(e => e.id === employeeId)
  if (!employee?.staffing_role) return undefined
  return (rates.value ?? []).find(r => r.role === employee.staffing_role && r.active)
}

interface DisplayRow {
  regularHours: number
  payRate: number
  billRate: number
  regularAmount: number
  overtimeHours: number
  overtimeRate: number
  overtimeBillRate: number
  overtimeAmount: number
  gross: number
  taxPercent: number
  payout: number
  invoiceTotal: number
  margin: number
  isEstimate: boolean
}

/** A saved entry stops being authoritative the moment the admin edits a field past it. */
const isDirty = (employeeId: string): boolean => {
  const saved = resultFor(employeeId)
  const row = grid.value[employeeId]
  if (!saved || !row) return true
  return saved.total_hours !== row.totalHours
    || saved.pre_tax_deduction !== row.preTaxDeduction
    || saved.fixed_fees !== row.fixedFees
    || saved.adjustment !== row.adjustment
}

const roundPayout = (net: number, mode: string): number => {
  if (mode === 'exact') return net
  if (mode === 'floor' && net > 0) return Math.floor(net)
  return Math.round(net * 100) / 100
}

/**
 * What every row shows: the saved, authoritative numbers when nothing's been edited since the
 * last "Guardar y calcular", otherwise a live client-side estimate — mirroring
 * StaffingPayrollCalculator closely enough that typing hours shows something immediately instead
 * of a wall of "—" until the next round trip.
 */
const rowFor = (employeeId: string): DisplayRow | null => {
  const employee = (timesheets.employees.value ?? []).find(e => e.id === employeeId)
  const company = (companies.value ?? []).find(c => c.id === selectedCompanyId.value)

  if (!isDirty(employeeId)) {
    const saved = resultFor(employeeId)!
    const regularAmount = saved.regular_hours * saved.pay_rate
    const overtimeAmount = saved.gross - regularAmount + saved.pre_tax_deduction
    // Cent-rounded REG/OT split of invoice_total — see StaffingPayrollCalculator::invoice()
    // and staffingInvoicePrint.ts, which derive the OT bill rate the same way.
    const invoiceRegularAmount = saved.invoice_regular_amount ?? saved.regular_hours * saved.bill_rate
    const invoiceOvertimeAmount = saved.invoice_overtime_amount ?? saved.invoice_total - invoiceRegularAmount
    return {
      regularHours: saved.regular_hours,
      payRate: saved.pay_rate,
      billRate: saved.bill_rate,
      regularAmount,
      overtimeHours: saved.overtime_hours,
      overtimeRate: saved.overtime_hours > 0 ? overtimeAmount / saved.overtime_hours : 0,
      overtimeBillRate: saved.overtime_hours > 0 ? invoiceOvertimeAmount / saved.overtime_hours : 0,
      overtimeAmount,
      gross: saved.gross,
      taxPercent: saved.gross > 0 ? (saved.tax_withheld / saved.gross) * 100 : 0,
      payout: saved.payout,
      invoiceTotal: saved.invoice_total,
      margin: saved.margin,
      isEstimate: false,
    }
  }

  const rate = rateFor(employeeId)
  const row = grid.value[employeeId]
  if (!rate || !row || !employee) return null

  const threshold = rate.overtimeThresholdHours ?? 40
  const totalHours = row.totalHours || 0
  const regularHours = Math.min(totalHours, threshold)
  const overtimeHours = Math.max(0, totalHours - threshold)
  const multiplier = rate.overtimeMultiplier ?? 1.5
  const overtimePayRate = rate.overtimePayRate ?? rate.payRate * multiplier
  const overtimeBillRate = rate.overtimeBillRate ?? rate.billRate * multiplier

  const regularAmount = regularHours * rate.payRate
  const overtimeAmount = overtimeHours * overtimePayRate
  const gross = regularAmount + overtimeAmount - (row.preTaxDeduction || 0)

  const taxRate = employee.staffing_tax_rate ?? company?.taxRate ?? 0
  const tax = Math.max(0, gross) * taxRate
  const net = gross - tax - (row.fixedFees || 0) + (row.adjustment || 0)
  const payout = roundPayout(net, company?.payoutRounding ?? 'cent')

  const invoiceRegular = Math.round(rate.billRate * regularHours * 100) / 100
  const invoiceOvertime = Math.round(overtimeHours * overtimeBillRate * 100) / 100
  const invoiceTotal = invoiceRegular + invoiceOvertime
  const employerCost = net + tax + (row.fixedFees || 0)

  return {
    regularHours,
    payRate: rate.payRate,
    billRate: rate.billRate,
    regularAmount,
    overtimeHours,
    overtimeRate: overtimeHours > 0 ? overtimePayRate : 0,
    overtimeBillRate: overtimeHours > 0 ? overtimeBillRate : 0,
    overtimeAmount,
    gross,
    taxPercent: gross > 0 ? (tax / gross) * 100 : 0,
    payout,
    invoiceTotal,
    margin: invoiceTotal - employerCost,
    isEstimate: true,
  }
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
  const employees = timesheets.employees.value ?? []
  return employees.reduce(
    (acc, employee) => {
      const row = rowFor(employee.id)
      if (!row) return acc
      return {
        hours: acc.hours + (grid.value[employee.id]?.totalHours || 0),
        gross: acc.gross + row.gross,
        payout: acc.payout + row.payout,
        invoice: acc.invoice + row.invoiceTotal,
        margin: acc.margin + row.margin,
      }
    },
    { hours: 0, gross: 0, payout: 0, invoice: 0, margin: 0 },
  )
})

const handleSave = async () => {
  const entries: TimesheetEntryInput[] = Object.entries(grid.value).map(([employeeId, row]) => ({
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
