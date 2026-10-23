<template>
  <div class="p-3 sm:p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
        <button v-for="tab in VIEW_TABS" :key="tab.value" type="button"
          class="px-3 py-2 transition-colors"
          :class="view === tab.value ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'"
          @click="view = tab.value">
          {{ tab.label }}
        </button>
      </div>

      <div v-if="view === 'employee'" class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="employeeSearch" type="text" placeholder="Buscar empleado..."
            class="w-40 rounded-xl border border-border bg-bg-secondary/40 py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 sm:w-48" />
        </div>
        <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
          <button v-for="tab in TABS" :key="tab.label" type="button"
            class="px-3 py-2 transition-colors"
            :class="active === tab.value ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'"
            @click="active = tab.value">
            {{ tab.label }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" title="Año anterior" aria-label="Año anterior"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
          <button type="button" title="Año siguiente" aria-label="Año siguiente"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-else class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="companySearch" type="text" placeholder="Buscar empresa..."
            class="w-40 rounded-xl border border-border bg-bg-secondary/40 py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 sm:w-48" />
        </div>
        <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
          <button v-for="p in PERIOD_TABS" :key="p.value" type="button"
            class="px-3 py-2 transition-colors"
            :class="period === p.value ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'"
            @click="period = p.value">
            {{ p.label }}
          </button>
        </div>

        <input v-if="period === 'week'" v-model="weekStart" type="date"
          class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <span v-if="period === 'week'" class="text-xs text-text-muted">{{ weekStart ? formatDateUS(weekStart) : '—' }}</span>

        <select v-if="period === 'month'" v-model.number="month"
          class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
          <option v-for="(label, i) in MONTH_LABELS" :key="i" :value="i + 1">{{ label }}</option>
        </select>

        <div v-if="period === 'month' || period === 'year'" class="flex items-center gap-1">
          <button type="button" title="Año anterior" aria-label="Año anterior"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="hoursYear -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ hoursYear }}</span>
          <button type="button" title="Año siguiente" aria-label="Año siguiente"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="hoursYear += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <template v-if="view === 'employee'">
      <div v-if="matrix.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <p class="sr-only">Cargando...</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3"><span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" /><span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" /><span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" /></div>
    </div>

      <p v-else-if="matrix.employees.value.length === 0" class="py-8 text-center text-sm text-text-muted">
        Sin empleados{{ active === null ? '' : active ? ' activos' : ' inactivos' }}.
      </p>

      <p v-else-if="filteredEmployees.length === 0" class="py-8 text-center text-sm text-text-muted">
        Ningún empleado coincide con "{{ employeeSearch }}".
      </p>

      <div v-else class="scroll-thin overflow-x-auto overflow-y-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-surface px-3 py-2">Empleado</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2">Empresa(s)</th>
              <th class="px-3 py-2">Método de pago</th>
              <th v-for="week in matrix.weeks.value" :key="week.week_start" class="whitespace-nowrap px-3 py-2 text-right">
                {{ week.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="employee in visibleEmployees" :key="employee.employeeId">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium text-text">
                {{ employee.name }}
              </td>
              <td class="px-3 py-2">
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold"
                  :class="employee.active ? 'text-success' : 'text-danger'">
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {{ employee.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-text-secondary">
                {{ employee.companies.length ? employee.companies.map(c => c.name).join(', ') : '—' }}
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-text-secondary">{{ employee.paymentMethod || '—' }}</td>
              <td v-for="week in matrix.weeks.value" :key="week.week_start"
                class="px-3 py-2 text-right tabular-nums text-text-secondary">
                {{ employee.weeklyHours[week.week_start] ? employee.weeklyHours[week.week_start].toFixed(2) : '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="filteredEmployees.length > visibleEmployees.length" type="button"
        class="w-full border-t border-border-subtle py-3 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        @click="rowsShown += ROWS_PAGE">
        Mostrar {{ Math.min(ROWS_PAGE, filteredEmployees.length - visibleEmployees.length) }} más ({{ filteredEmployees.length - visibleEmployees.length }} restantes)
      </button>
    </template>

    <template v-else>
      <div v-if="companyHours.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <p class="sr-only">Cargando...</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3"><span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" /><span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" /><span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" /></div>
    </div>

      <p v-else-if="companyHours.rows.value.length === 0" class="py-8 text-center text-sm text-text-muted">
        Sin empresas registradas.
      </p>

      <p v-else-if="filteredCompanyHours.length === 0" class="py-8 text-center text-sm text-text-muted">
        Ninguna empresa coincide con "{{ companySearch }}".
      </p>

      <div v-else class="scroll-thin overflow-x-auto overflow-y-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2">Empresa</th>
              <th class="px-3 py-2 text-right">Horas activos</th>
              <th class="px-3 py-2 text-right">Horas inactivos</th>
              <th class="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="row in filteredCompanyHours" :key="row.companyId">
              <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ row.name }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ row.activeHours.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-text-secondary">{{ row.inactiveHours.toFixed(2) }}</td>
              <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ row.totalHours.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { ArrowLeftIcon, ArrowRightIcon, MagnifierIcon } from '@solar-icons/vue/linear'
import { useEmployeeHoursMatrix } from '../../composables/staffing/useEmployeeHoursMatrix'
import { useCompanyHoursSummary } from '../../composables/staffing/useCompanyHoursSummary'
import { formatDateUS, toISODate } from '../../lib/formatters'
import type { StaffingHoursPeriod } from '../../services/staffing/staffingService'

const props = defineProps<{ businessId: string | null }>()

const VIEW_TABS: { value: 'employee' | 'company'; label: string }[] = [
  { value: 'employee', label: 'Por empleado' },
  { value: 'company', label: 'Por empresa' },
]

// "Todos" first and default: a period in the past shouldn't hinge on who's still on payroll
// today — filtering to "Activos" hid a deactivated worker's entire year the moment they left,
// reading as if their past hours had been deleted rather than just filtered out.
const TABS: { value: boolean | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: true, label: 'Activos' },
  { value: false, label: 'Inactivos' },
]

const PERIOD_TABS: { value: StaffingHoursPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const view = ref<'employee' | 'company'>('employee')

const year = ref(new Date().getFullYear())
const active = ref<boolean | null>(null)
const matrix = useEmployeeHoursMatrix(toRef(props, 'businessId'), year, active)

const employeeSearch = ref('')
const filteredEmployees = computed(() => {
  const term = employeeSearch.value.trim().toLowerCase()
  if (!term) return matrix.employees.value
  return matrix.employees.value.filter(e => e.name.toLowerCase().includes(term))
})

// One row is ~52 cells, so with hundreds of employees only the first ROWS_PAGE rows are drawn at a time.
const ROWS_PAGE = 50
const rowsShown = ref(ROWS_PAGE)
const visibleEmployees = computed(() => filteredEmployees.value.slice(0, rowsShown.value))
watch([employeeSearch, active, year], () => { rowsShown.value = ROWS_PAGE })

const period = ref<StaffingHoursPeriod>('week')
const hoursYear = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
/** Same local-safe convention as StaffingHoursPanel.vue — toISODate, not toISOString(). */
const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}
const weekStart = ref(defaultWeekStart())

const companyHours = useCompanyHoursSummary(toRef(props, 'businessId'), period, hoursYear, month, weekStart)

const companySearch = ref('')
const filteredCompanyHours = computed(() => {
  const term = companySearch.value.trim().toLowerCase()
  if (!term) return companyHours.rows.value
  return companyHours.rows.value.filter(r => r.name.toLowerCase().includes(term))
})
</script>
