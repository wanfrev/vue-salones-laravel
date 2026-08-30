<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-[220px] flex-1">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="hours-company">
          Empresa
        </label>
        <FormSearchSelect
          id="hours-company"
          v-model="selectedCompanyId"
          :options="companyOptions"
          placeholder="Selecciona una empresa"
          search-placeholder="Buscar empresa..."
        />
      </div>

      <div class="min-w-[180px]" v-if="projectOptions.length > 0">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="hours-project">
          Proyecto
        </label>
        <FormSearchSelect
          id="hours-project"
          v-model="selectedProjectId"
          :options="projectOptions"
          placeholder="General (Sin proyecto)"
          search-placeholder="Buscar proyecto..."
        />
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
        :class="currentWeek.status === 'draft' ? 'bg-warning/10 text-warning' : currentWeek.status === 'approved' ? 'bg-info/10 text-info' : 'bg-success/10 text-success'">
        {{ currentWeek.status === 'draft' ? 'Borrador' : currentWeek.status === 'approved' ? 'Aprobada' : 'Pagada' }}
      </span>
    </div>

    <p v-if="!selectedCompanyId" class="py-10 text-center text-sm text-text-muted">
      Selecciona una empresa para cargar sus horas.
    </p>

    <template v-else>
      <label class="flex w-fit items-center gap-2 text-xs text-text-secondary">
        <input v-model="showAllAssigned" type="checkbox" class="h-3.5 w-3.5 rounded border-border" />
        Mostrar todos los empleados asignados, aunque sea antes de su fecha de ingreso
        <span class="text-text-muted">(útil para cargar nómina retroactiva)</span>
      </label>

      <div v-if="timesheets.employeesLoading.value" class="py-10 text-center text-sm text-text-muted">
        Cargando empleados...
      </div>

      <p v-else-if="rosterEmployees.length === 0" class="py-10 text-center text-sm text-text-muted">
        Esta empresa no tiene empleados asignados todavía. Asígnalos desde su ficha en Equipo, o
        activa "Mostrar todos" arriba si ya están asignados pero es una semana anterior a su ingreso.
      </p>

      <div v-else class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-bg-secondary/40 p-3 rounded-xl border border-border">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Empleados ({{ rosterEmployees.length }})</span>
            <span v-if="employeeSearch.trim() && filteredEmployees.length !== rosterEmployees.length" class="text-xs text-text-muted">
              — {{ filteredEmployees.length }} coincidentes
            </span>
          </div>
          <div class="relative">
            <MagnifierIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              v-model="employeeSearch"
              type="text"
              placeholder="Buscar empleado..."
              class="w-40 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
            />
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-border bg-surface">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th class="px-3 py-2.5">Empleado</th>
                  <th class="px-3 py-2.5 text-center" title="Escribir horas regulares/OT directamente en vez de calcularlas del total">Manual</th>
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
                  <th class="px-3 py-2.5 text-right">Días (Perdiem)</th>
                  <th class="px-3 py-2.5 text-right">Total Perdiem</th>
                  <th class="px-3 py-2.5 text-right">Horas de viaje</th>
                  <th class="px-3 py-2.5 text-right">Total viaje</th>
                  <th class="px-3 py-2.5 text-right">Total semanal</th>
                  <th class="px-3 py-2.5 text-right">% retención</th>
                  <th class="px-3 py-2.5 text-right">Total</th>
                  <th class="px-3 py-2.5 text-right">Redondeo</th>
                  <th class="px-3 py-2.5 text-right">Factura</th>
                  <th class="px-3 py-2.5 text-right">Margen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-if="filteredEmployees.length === 0">
                  <td colspan="24" class="py-10 text-center text-sm text-text-muted bg-surface">
                    No se encontraron empleados que coincidan con la búsqueda.
                  </td>
                </tr>
                <template v-else v-for="employee in filteredEmployees" :key="rowKey(employee)">
                  <tr>
                    <td class="px-3 py-2.5">
                      <div class="flex items-start gap-2">
                        <input type="checkbox" :checked="employee.active !== false" title="Empleado activo"
                          class="mt-1 h-3.5 w-3.5 shrink-0 rounded border-border"
                          @change="toggleEmployeeActive(employee, ($event.target as HTMLInputElement).checked)" />
                        <div>
                      <p class="font-medium text-text">
                        {{ employee.full_name }}
                        <span v-if="employee.active === false" class="ml-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">Inactivo</span>
                      </p>
                      <p class="text-xs text-text-muted">
                        {{ employee.staffing_role || 'Sin rol' }}<template v-if="employee.staffing_shift"> · {{ shiftLabel(employee.staffing_shift) }}</template>
                      </p>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2 text-center">
                      <input type="checkbox"
                        :checked="grid[rowKey(employee)]?.hoursManualOverride"
                        :disabled="isReadOnly"
                        class="h-3.5 w-3.5 rounded border-border"
                        @change="toggleManualHours(employee, ($event.target as HTMLInputElement).checked)" />
                    </td>
                    <td class="px-3 py-2">
                      <input v-if="!grid[rowKey(employee)]?.hoursManualOverride"
                        v-model.number="grid[rowKey(employee)].totalHours" type="number" min="0" max="168" step="0.01"
                        :disabled="isReadOnly" :class="cellInputClass" />
                      <span v-else class="block w-24 text-right text-sm tabular-nums text-text-muted">
                        {{ ((grid[rowKey(employee)]?.manualRegularHours || 0) + (grid[rowKey(employee)]?.manualOvertimeHours || 0)).toFixed(2) }}
                      </span>
                  </td>
                  <td class="px-3 py-2 text-right">
                    <input v-if="grid[rowKey(employee)]?.hoursManualOverride"
                      v-model.number="grid[rowKey(employee)].manualRegularHours" type="number" min="0" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                    <span v-else class="tabular-nums text-text-secondary">{{ rowFor(employee)?.regularHours?.toFixed(2) ?? '—' }}</span>
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.payRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.billRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.regularAmount) : '—' }}</td>
                  <td class="px-3 py-2 text-right">
                    <input v-if="grid[rowKey(employee)]?.hoursManualOverride"
                      v-model.number="grid[rowKey(employee)].manualOvertimeHours" type="number" min="0" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                    <span v-else class="tabular-nums text-text-secondary">{{ rowFor(employee)?.overtimeHours?.toFixed(2) ?? '—' }}</span>
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee)?.overtimeRate ? formatUSD(rowFor(employee)!.overtimeRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee)?.overtimeBillRate ? formatUSD(rowFor(employee)!.overtimeBillRate) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.overtimeAmount) : '—' }}</td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[rowKey(employee)].preTaxDeduction" type="number" min="0" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[rowKey(employee)].fixedFees" type="number" min="0" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[rowKey(employee)].adjustment" type="number" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[rowKey(employee)].perdiemDays" type="number" min="0" step="0.5"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.perdiemTotal) : '—' }}</td>
                  <td class="px-3 py-2">
                    <input v-model.number="grid[rowKey(employee)].travelHours" type="number" min="0" step="0.01"
                      :disabled="isReadOnly" :class="cellInputClass" />
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.travelTotal) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.gross) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? rowFor(employee)!.taxPercent.toFixed(1) : '0.0' }}%</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.payout) : '—' }}</td>
                  <td class="px-3 py-2 text-right text-text-secondary">{{ roundingLabel }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.invoiceTotal) : '—' }}</td>
                  <td class="px-3 py-2 text-right tabular-nums font-semibold text-success">{{ rowFor(employee) ? formatUSD(rowFor(employee)!.margin) : '—' }}</td>
                </tr>
                <tr v-if="!rateFor(employee)">
                  <td colspan="24" class="px-3 pb-2.5 text-xs text-warning">
                    Sin tarifa configurada para "{{ employee.staffing_role || 'sin rol' }}" en esta empresa — agrégala en Empresas antes de cargar horas.
                  </td>
                </tr>
                <tr v-else-if="rowFor(employee)?.isEstimate">
                  <td colspan="24" class="px-3 pb-2.5 text-[10px] text-text-muted">
                    Estimado — guarda para confirmar.
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot v-if="rosterEmployees.length > 0">
              <tr class="border-t border-border bg-bg-secondary/60 text-xs font-semibold">
                <td class="px-3 py-2.5 text-text">Total</td>
                <td></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ totals.hours.toFixed(2) }}</td>
                <td colspan="11"></td>
                <td></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatUSD(totals.perdiemTotal) }}</td>
                <td></td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ formatUSD(totals.travelTotal) }}</td>
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
      </div>

      <p v-if="timesheets.saveError.value" class="text-sm text-danger">{{ timesheets.saveError.value }}</p>

      <div v-if="rosterEmployees.length > 0" class="flex flex-wrap items-center justify-end gap-2">
        <button type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="handlePrintPayroll">
          Imprimir nómina
        </button>
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
        <template v-else-if="existingInvoice">
          <button type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            @click="handlePrintInvoice">
            Ver factura #{{ existingInvoice.invoice_number }}
          </button>
          <button type="button" :disabled="billing.deleteInvoiceMutation.isPending.value"
            class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleDeleteInvoice">
            {{ billing.deleteInvoiceMutation.isPending.value ? 'Eliminando...' : 'Eliminar factura' }}
          </button>
        </template>
        <button v-if="currentWeek?.status === 'approved'" type="button" :disabled="timesheets.markPaidMutation.isPending.value"
          class="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleMarkPaid">
          {{ timesheets.markPaidMutation.isPending.value ? 'Marcando...' : 'Marcar como pagada' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useCurrency } from '../../composables/common/useCurrency'
import { useNotification } from '../../composables/common/useNotification'
import { useBusinessStore } from '../../store/business'
import { useTimesheets } from '../../composables/staffing/useTimesheets'
import { useBilling } from '../../composables/staffing/useBilling'
import {
  getStaffingInvoice, listStaffingCompanies, listStaffingRates, getStaffingProjects, staffingCompanyKeys, staffingRateKeys,
  SHIFT_OPTIONS,
} from '../../services/staffing/staffingService'
import type { StaffingCompanyRow, StaffingRateRow, TimesheetEntryInput } from '../../services/staffing/staffingService'
import { adminUpdateEmployee } from '../../services/adminService'
import { FormSearchSelect } from '../../components/forms'
import { printStaffingInvoice } from '../../lib/staffingInvoicePrint'
import { printStaffingPayroll } from '../../lib/staffingPayrollPrint'
import { formatDateUS, toISODate } from '../../lib/formatters'
import type { StaffingTimesheetEntry, Profile } from '../../types/database'
import { MagnifierIcon } from '@solar-icons/vue/linear'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'
const cellInputClass =
  'w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-muted'

const props = defineProps<{
  businessId: string | null
  /** Deep link from Reportes > Mensual — preselects the company/week the admin clicked on. */
  initialCompanyId?: string | null
  initialWeekStart?: string | null
  /** The project that week's report figure came from — `null` for "General", `undefined` when
   *  Reportes couldn't tell (falls back to the same "General" default as opening Nómina fresh). */
  initialProjectId?: string | null
}>()

const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const businessId = computed(() => props.businessId)

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(props.businessId)),
  queryFn: () => listStaffingCompanies(props.businessId!),
  enabled: computed(() => !!props.businessId),
})

const companyOptions = computed(() =>
  (companies.value ?? []).map(c => ({ value: c.id, label: c.name }))
)

const selectedCompanyId = ref<string | null>(props.initialCompanyId ?? null)
const selectedProjectId = ref<string | null>(props.initialProjectId ?? null)

const { data: projects } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.projects(props.businessId, selectedCompanyId.value)),
  queryFn: () => getStaffingProjects(selectedCompanyId.value!),
  enabled: computed(() => !!props.businessId && !!selectedCompanyId.value),
})

const projectOptions = computed(() => {
  const opts = (projects.value ?? [])
    .filter(p => p.active)
    .map(p => ({ value: p.id, label: p.name }))
  return [{ value: '', label: 'General (Sin proyecto)' }, ...opts]
})

watch(selectedCompanyId, () => {
  selectedProjectId.value = null
})

const activeCompany = computed<StaffingCompanyRow | null>(() => (companies.value ?? []).find(c => c.id === selectedCompanyId.value) || null)

// The rate card for the selected company — needed to estimate pay/OT/invoice live, before the
// admin ever clicks "Guardar y calcular".
const { data: rates } = useQuery({
  queryKey: computed(() => staffingRateKeys.byCompany(props.businessId, selectedCompanyId.value)),
  queryFn: () => listStaffingRates(props.businessId!, selectedCompanyId.value!),
  enabled: computed(() => !!props.businessId && !!selectedCompanyId.value),
})

const timesheets = useTimesheets(businessId, selectedCompanyId, selectedProjectId)
const billing = useBilling(businessId, selectedCompanyId)

const ratesLoading = computed(() => !rates.value && !!selectedCompanyId.value)
// Wait until both the company is picked and its specific rate card is fully loaded.
const isReady = computed(() => !!selectedCompanyId.value && !ratesLoading.value)

const existingInvoice = computed(() =>
  (billing.invoices.value ?? []).find(i => i.timesheet_id === currentWeek.value?.id) ?? null,
)

const employeeSearch = ref('')

// Escape hatch for the assigned-date cutoff below: backfilling a company's history (a new
// client onboarded today whose past weeks still need to be entered, correcting an old week)
// needs every current assignee available regardless of when they joined. Off by default so the
// normal case — a genuinely new hire shouldn't show as an empty row on weeks before they
// existed — stays fixed.
const showAllAssigned = ref(false)

// Reset search query when changing company to prevent confusing UI state
watch(selectedCompanyId, () => {
  employeeSearch.value = ''
})

const filteredEmployees = computed(() => {
  const list = rosterEmployees.value
  const query = employeeSearch.value.trim().toLowerCase()
  if (!query) return list
  return list.filter(e => {
    const nameMatch = e.full_name?.toLowerCase().includes(query)
    const roleMatch = e.staffing_role?.toLowerCase().includes(query)
    return nameMatch || roleMatch
  })
})

/**
 * Defaults to the most recent Sunday, matching the FROM/TO convention on the source sheets.
 * Uses toISODate (local calendar date), never toISOString().slice(0, 10) — that converts to UTC
 * first, which silently rolls the date forward for anyone west of UTC once local time is late
 * enough that it's already the next day in UTC, producing a week_start every other staffing
 * screen doesn't agree with.
 */
const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}

const weekStartInput = ref(props.initialWeekStart || defaultWeekStart())

const weekEnd = computed(() => {
  if (!weekStartInput.value) return ''
  const d = new Date(weekStartInput.value + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return toISODate(d)
})

const currentWeek = computed(() => timesheets.findWeek(weekStartInput.value))

const isReadOnly = computed(() => !!currentWeek.value && currentWeek.value.status !== 'draft')

type GridRow = {
  totalHours: number
  preTaxDeduction: number
  fixedFees: number
  adjustment: number
  hoursManualOverride: boolean
  manualRegularHours: number
  manualOvertimeHours: number
  perdiemDays: number
  travelHours: number
}
type RosterEmployee = Profile

/** A worker can hold two roles at the same company, and even two assignments with the *same*
 *  role that differ only by shift (e.g. day/night) — they then appear twice (or more) in the
 *  roster, once per assignment, with the same `id` but a different `staffing_role`/`staffing_shift`.
 *  Every grid/lookup below is keyed by this composite instead of the bare id, so each assignment
 *  gets its own hours/rate/total instead of silently colliding into one. */
const rowKey = (employee: { id: string; staffing_role?: string | null; staffing_shift?: string | null }): string =>
  `${employee.id}::${employee.staffing_role ?? ''}::${employee.staffing_shift ?? ''}`

const shiftLabel = (shift: string | null | undefined): string =>
  shift ? (SHIFT_OPTIONS.find(o => o.value === shift)?.label ?? shift) : ''

/**
 * `timesheets.employees` only lists *active* assignments — right for picking who new hours can
 * be entered for, wrong for viewing a week that already has hours: deactivating an employee (or
 * changing their assignment) after a week was saved would silently drop their row — and their
 * totals — from every past week's nómina, including an already-approved/paid one that should
 * never change again. This adds back a synthetic row, built from the saved entry's own snapshot
 * (`entry.employee`/`entry.role`/`entry.shift`), for any saved entry the active roster no longer
 * covers — so historical weeks keep showing (and totalling, and re-saving) everyone who was
 * actually paid, regardless of their current employment status.
 */
const rosterEmployees = computed<RosterEmployee[]>(() => {
  // The mirror image of the orphaned-row problem below: an employee hired today is in every
  // company's *current* assignment list, so without this a week from before they joined would
  // show them as an empty, assignable row — nobody was paying them yet, they just didn't exist
  // on this sheet. Cut the active roster off at the assignment's own start instead of the
  // employee's, since one worker can join two client companies on different days. Skipped
  // entirely when backfilling (showAllAssigned) — that's explicitly entering hours for a week
  // before the assignment existed in the system.
  const active = (timesheets.employees.value ?? []).filter(e => {
    if (showAllAssigned.value) return true
    if (!e.staffing_assigned_at || !weekEnd.value) return true
    return e.staffing_assigned_at.slice(0, 10) <= weekEnd.value
  })
  const covered = new Set(active.map(rowKey))

  const orphaned: RosterEmployee[] = []
  for (const entry of currentWeek.value?.entries ?? []) {
    if (!entry.employee) continue
    const key = `${entry.employee_id}::${entry.role ?? ''}::${entry.shift ?? ''}`
    if (covered.has(key)) continue
    covered.add(key)
    orphaned.push({ ...entry.employee, staffing_role: entry.role, staffing_shift: entry.shift })
  }

  return orphaned.length > 0 ? [...active, ...orphaned] : active
})

// A plain ref, replaced wholesale on every week/roster change (see rebuildGrid) rather than a
// reactive() object mutated key-by-key — a single assignment is unambiguous to Vue's reactivity,
// so switching weeks can never leave a stale key from the previous one behind.
const grid = ref<Record<string, GridRow>>({})

const emptyRow = (): GridRow => ({
  totalHours: 0,
  preTaxDeduction: 0,
  fixedFees: 0,
  adjustment: 0,
  hoursManualOverride: false,
  manualRegularHours: 0,
  manualOvertimeHours: 0,
  perdiemDays: 0,
  travelHours: 0,
})

/** Rebuilds the grid from scratch for the roster + week currently selected, prefilling from the
 *  saved week's entries when one exists — this is what makes switching weeks show that week's
 *  own data instead of whatever was last typed. */
const rebuildGrid = () => {
  const employees = rosterEmployees.value
  const savedEntries = currentWeek.value?.entries ?? []
  const byKey = new Map(savedEntries.map(e => [`${e.employee_id}::${e.role ?? ''}::${e.shift ?? ''}`, e]))

  const next: Record<string, GridRow> = {}
  for (const employee of employees) {
    const saved = byKey.get(rowKey(employee))
    next[rowKey(employee)] = saved
      ? {
          totalHours: saved.total_hours,
          preTaxDeduction: saved.pre_tax_deduction,
          fixedFees: saved.fixed_fees,
          adjustment: saved.adjustment,
          hoursManualOverride: saved.hours_manual_override,
          manualRegularHours: saved.hours_manual_override ? saved.regular_hours : 0,
          manualOvertimeHours: saved.hours_manual_override ? saved.overtime_hours : 0,
          perdiemDays: saved.perdiem_days,
          travelHours: saved.travel_hours,
        }
      : emptyRow()
  }
  grid.value = next
}

watch([rosterEmployees, weekStartInput, currentWeek], rebuildGrid, { immediate: true })

const resultFor = (employee: RosterEmployee): StaffingTimesheetEntry | undefined =>
  currentWeek.value?.entries.find(e =>
    e.employee_id === employee.id
    && (e.role ?? '') === (employee.staffing_role ?? '')
    && (e.shift ?? '') === (employee.staffing_shift ?? ''),
  )

const rateFor = (employee: RosterEmployee): StaffingRateRow | undefined => {
  if (!employee?.staffing_role) return undefined
  return (rates.value ?? []).find(r => r.role === employee.staffing_role && r.active && r.shift === (employee.staffing_shift ?? null))
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
  perdiemTotal: number
  travelTotal: number
  gross: number
  taxPercent: number
  payout: number
  invoiceTotal: number
  margin: number
  isEstimate: boolean
}

/** A saved entry stops being authoritative the moment the admin edits a field past it. */
const isDirty = (employee: RosterEmployee): boolean => {
  const saved = resultFor(employee)
  const row = grid.value[rowKey(employee)]
  if (!saved || !row) return true
  return saved.total_hours !== row.totalHours
    || saved.pre_tax_deduction !== row.preTaxDeduction
    || saved.fixed_fees !== row.fixedFees
    || saved.adjustment !== row.adjustment
    || saved.hours_manual_override !== row.hoursManualOverride
    || (row.hoursManualOverride && (saved.regular_hours !== row.manualRegularHours || saved.overtime_hours !== row.manualOvertimeHours))
    || saved.perdiem_days !== row.perdiemDays
    || saved.travel_hours !== row.travelHours
}

/** Turning manual mode on seeds the two new inputs from the last computed split, instead of
 *  resetting to 0/0 — the admin is usually correcting a split that's already close to right. */
const toggleManualHours = (employee: RosterEmployee, checked: boolean) => {
  const row = grid.value[rowKey(employee)]
  if (!row) return
  if (checked) {
    const current = rowFor(employee)
    row.manualRegularHours = current?.regularHours ?? 0
    row.manualOvertimeHours = current?.overtimeHours ?? 0
  }
  row.hoursManualOverride = checked
}

const taxFor = (
  gross: number,
  employeeTaxRate: number | null | undefined,
  company: StaffingCompanyRow | undefined,
): number => {
  const base = Math.max(0, gross)
  if (employeeTaxRate != null) return base * employeeTaxRate

  const brackets = company?.taxBrackets
  if (brackets && brackets.length > 0) {
    for (const bracket of brackets) {
      if (bracket.threshold === null || base < bracket.threshold) {
        return base * bracket.rate
      }
    }
    return 0
  }

  return base * (company?.taxRate ?? 0)
}

const roundPayout = (net: number, mode: string): number => {
  if (mode === 'exact') return net
  if (net > 0) {
    if (mode === 'floor') return Math.floor(net)
    if (mode === 'round') return Math.round(net)
  }
  return Math.round(net * 100) / 100
}

/**
 * What every row shows: the saved, authoritative numbers when nothing's been edited since the
 * last "Guardar y calcular", otherwise a live client-side estimate — mirroring
 * StaffingPayrollCalculator closely enough that typing hours shows something immediately instead
 * of a wall of "—" until the next round trip.
 */
const rowFor = (employee: RosterEmployee): DisplayRow | null => {
  const company = (companies.value ?? []).find(c => c.id === selectedCompanyId.value)

  if (!isDirty(employee)) {
    const saved = resultFor(employee)!
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
      perdiemTotal: saved.perdiem_total,
      travelTotal: saved.travel_total,
      gross: saved.gross,
      taxPercent: saved.gross > 0 ? (saved.tax_withheld / saved.gross) * 100 : 0,
      payout: saved.payout,
      invoiceTotal: saved.invoice_total,
      margin: saved.margin,
      isEstimate: false,
    }
  }

  const rate = rateFor(employee)
  const row = grid.value[rowKey(employee)]
  if (!rate || !row || !employee) return null

  // Manual override wins outright — mirrors StaffingPayrollCalculator::splitHours() on the
  // backend, which the threshold split alone could never produce (e.g. all-OT/zero-regular).
  let regularHours: number
  let overtimeHours: number
  if (row.hoursManualOverride) {
    regularHours = row.manualRegularHours || 0
    overtimeHours = row.manualOvertimeHours || 0
  } else {
    const threshold = rate.overtimeThresholdHours ?? 40
    const totalHours = row.totalHours || 0
    regularHours = Math.min(totalHours, threshold)
    overtimeHours = Math.max(0, totalHours - threshold)
  }
  const multiplier = rate.overtimeMultiplier ?? 1.5
  const overtimePayRate = rate.overtimePayRate ?? rate.payRate * multiplier
  const overtimeBillRate = rate.overtimeBillRate ?? rate.billRate * multiplier

  const regularAmount = regularHours * rate.payRate
  const overtimeAmount = overtimeHours * overtimePayRate
  const gross = regularAmount + overtimeAmount - (row.preTaxDeduction || 0)

  const tax = taxFor(gross, employee.staffing_tax_rate, company)
  // Reimbursement-style amounts — not billed (never touch invoiceTotal below), not withheld
  // against — same treatment as StaffingPayrollCalculator::payroll() on the backend.
  const perdiemTotal = (row.perdiemDays || 0) * (company?.perDiemRate ?? 0)
  const travelTotal = (row.travelHours || 0) * rate.payRate
  const net = gross - tax - (row.fixedFees || 0) + (row.adjustment || 0) + perdiemTotal + travelTotal
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
    perdiemTotal,
    travelTotal,
    gross,
    taxPercent: gross > 0 ? (tax / gross) * 100 : 0,
    payout,
    invoiceTotal,
    margin: invoiceTotal - employerCost,
    isEstimate: true,
  }
}

const ROUNDING_LABELS: Record<string, string> = {
  exact: 'Exacto (se respetan los decimales)',
  cent: 'Exacto (se respetan los decimales)', // support legacy
  round: 'Redondeo entero',
  floor: 'Sin decimales',
}

const roundingLabel = computed(() => {
  const company = (companies.value ?? []).find(c => c.id === selectedCompanyId.value)
  return company ? (ROUNDING_LABELS[company.payoutRounding] ?? 'Exacto (se respetan los decimales)') : '—'
})

const totals = computed(() => {
  const employees = rosterEmployees.value
  return employees.reduce(
    (acc, employee) => {
      const row = rowFor(employee)
      if (!row) return acc
      return {
        hours: acc.hours + row.regularHours + row.overtimeHours,
        gross: acc.gross + row.gross,
        payout: acc.payout + row.payout,
        invoice: acc.invoice + row.invoiceTotal,
        margin: acc.margin + row.margin,
        perdiemTotal: acc.perdiemTotal + row.perdiemTotal,
        travelTotal: acc.travelTotal + row.travelTotal,
      }
    },
    { hours: 0, gross: 0, payout: 0, invoice: 0, margin: 0, perdiemTotal: 0, travelTotal: 0 },
  )
})

const handleSave = async () => {
  // Iterate the roster (not Object.entries(grid.value)) so each line carries the specific
  // employeeId + role it belongs to — required now that the same employeeId can appear twice
  // in the grid, once per role, each needing its own hours entry. Uses rosterEmployees, not the
  // bare active-only timesheets.employees, so re-saving a draft week never drops the entry of
  // someone who got deactivated after hours were already entered for them this week.
  const employees = rosterEmployees.value
  const entries: TimesheetEntryInput[] = employees.map(employee => {
    const row = grid.value[rowKey(employee)] ?? emptyRow()
    return {
      employeeId: employee.id,
      role: employee.staffing_role ?? null,
      shift: employee.staffing_shift ?? null,
      totalHours: row.totalHours || 0,
      preTaxDeduction: row.preTaxDeduction || 0,
      fixedFees: row.fixedFees || 0,
      adjustment: row.adjustment || 0,
      hoursManualOverride: row.hoursManualOverride,
      manualRegularHours: row.manualRegularHours || 0,
      manualOvertimeHours: row.manualOvertimeHours || 0,
      perdiemDays: row.perdiemDays || 0,
      travelHours: row.travelHours || 0,
    }
  })

  await timesheets.save(weekStartInput.value, weekEnd.value, entries)
}

const handleApprove = async () => {
  if (currentWeek.value) await timesheets.approve(currentWeek.value.id)
}

const toggleEmployeeActive = async (employee: RosterEmployee, checked: boolean) => {
  try {
    await adminUpdateEmployee(employee.id, { active: checked })
    await queryClient.invalidateQueries({ queryKey: ['staffing-company-employees', businessId.value, selectedCompanyId.value], exact: false })
    success(checked ? 'Empleado activado' : 'Empleado desactivado')
  } catch {
    showError('No se pudo actualizar el estado del empleado')
  }
}

const handleMarkPaid = async () => {
  if (currentWeek.value) await timesheets.markPaid(currentWeek.value.id)
}

const handleGenerateInvoice = async () => {
  if (currentWeek.value) await billing.generateInvoice(currentWeek.value.id)
}

const statusLabel = computed(() => {
  if (!currentWeek.value) return 'Sin guardar'
  return currentWeek.value.status === 'draft' ? 'Borrador' : currentWeek.value.status === 'approved' ? 'Aprobada' : 'Pagada'
})

const handlePrintPayroll = () => {
  const company = activeCompany.value
  if (!company) return

  const printRows = filteredEmployees.value
    .map(employee => {
      const row = rowFor(employee)
      if (!row) return null
      const gridRow = grid.value[rowKey(employee)]
      return {
        employeeName: employee.full_name,
        role: [employee.staffing_role, shiftLabel(employee.staffing_shift)].filter(Boolean).join(' · '),
        totalHours: gridRow?.totalHours || 0,
        regularHours: row.regularHours,
        payRate: row.payRate,
        billRate: row.billRate,
        regularAmount: row.regularAmount,
        overtimeHours: row.overtimeHours,
        overtimeRate: row.overtimeRate,
        overtimeAmount: row.overtimeAmount,
        deduction: gridRow?.preTaxDeduction || 0,
        fixedFees: gridRow?.fixedFees || 0,
        adjustment: gridRow?.adjustment || 0,
        perdiemDays: gridRow?.perdiemDays || 0,
        perdiemTotal: row.perdiemTotal,
        travelHours: gridRow?.travelHours || 0,
        travelTotal: row.travelTotal,
        gross: row.gross,
        taxPercent: row.taxPercent,
        payout: row.payout,
        invoiceTotal: row.invoiceTotal,
        margin: row.margin,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  printStaffingPayroll({
    agencyName: businessStore.business?.name || 'Delta Work Force',
    companyName: company.name,
    projectName: (projects.value ?? []).find(p => p.id === selectedProjectId.value)?.name ?? null,
    weekStart: weekStartInput.value,
    weekEnd: weekEnd.value,
    statusLabel: statusLabel.value,
    rows: printRows,
  })
}

const handlePrintInvoice = async () => {
  if (!existingInvoice.value) return
  const full = await getStaffingInvoice(existingInvoice.value.id)
  printStaffingInvoice(full, businessStore.business?.name || 'Delta Work Force')
}

const handleDeleteInvoice = async () => {
  if (!existingInvoice.value) return
  if (window.confirm(`¿Eliminar la factura #${existingInvoice.value.invoice_number}? La nómina volverá a borrador para poder editarse y requerirá ser aprobada otra vez.`)) {
    await billing.deleteInvoiceMutation.mutateAsync(existingInvoice.value.id)
  }
}

const removeWeek = () => {
  if (!currentWeek.value) return
  if (window.confirm('¿Eliminar el borrador de esta semana? Las horas cargadas se perderán.')) {
    timesheets.remove(currentWeek.value.id)
  }
}
</script>
