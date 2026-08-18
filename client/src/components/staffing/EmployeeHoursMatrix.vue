<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-1">
        <button v-for="tab in VIEW_TABS" :key="tab.value" type="button"
          class="relative px-3 py-1.5 text-xs font-semibold transition-theme"
          :class="view === tab.value ? 'text-primary' : 'text-text-muted hover:text-text'"
          @click="view = tab.value">
          {{ tab.label }}
          <span v-if="view === tab.value" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
        </button>
      </div>

      <div v-if="view === 'employee'" class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input v-model="employeeSearch" type="text" placeholder="Buscar empleado..."
            class="w-40 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48" />
        </div>
        <div class="flex gap-1">
          <button v-for="tab in TABS" :key="tab.label" type="button"
            class="relative px-3 py-1.5 text-xs font-semibold transition-theme"
            :class="active === tab.value ? 'text-primary' : 'text-text-muted hover:text-text'"
            @click="active = tab.value">
            {{ tab.label }}
            <span v-if="active === tab.value" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
          </button>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" title="Año anterior"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            @click="year -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
          <button type="button" title="Año siguiente"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            @click="year += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-else class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input v-model="companySearch" type="text" placeholder="Buscar empresa..."
            class="w-40 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48" />
        </div>
        <div class="flex gap-1">
          <button v-for="p in PERIOD_TABS" :key="p.value" type="button"
            class="relative px-3 py-1.5 text-xs font-semibold transition-theme"
            :class="period === p.value ? 'text-primary' : 'text-text-muted hover:text-text'"
            @click="period = p.value">
            {{ p.label }}
            <span v-if="period === p.value" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
          </button>
        </div>

        <input v-if="period === 'week'" v-model="weekStart" type="date"
          class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text" />
        <span v-if="period === 'week'" class="text-xs text-text-muted">{{ weekStart ? formatDateUS(weekStart) : '—' }}</span>

        <select v-if="period === 'month'" v-model.number="month"
          class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text">
          <option v-for="(label, i) in MONTH_LABELS" :key="i" :value="i + 1">{{ label }}</option>
        </select>

        <div v-if="period === 'month' || period === 'year'" class="flex items-center gap-1">
          <button type="button" title="Año anterior"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            @click="hoursYear -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ hoursYear }}</span>
          <button type="button" title="Año siguiente"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            @click="hoursYear += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <template v-if="view === 'employee'">
      <div v-if="matrix.isLoading.value" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

      <p v-else-if="matrix.employees.value.length === 0" class="py-8 text-center text-sm text-text-muted">
        Sin empleados {{ active ? 'activos' : 'inactivos' }}.
      </p>

      <p v-else-if="filteredEmployees.length === 0" class="py-8 text-center text-sm text-text-muted">
        Ningún empleado coincide con "{{ employeeSearch }}".
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-surface px-3 py-2">Empleado</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2">Empresa(s)</th>
              <th class="px-3 py-2">Método de pago</th>
              <th v-for="week in matrix.weeks.value" :key="week.week_start" class="whitespace-nowrap px-3 py-2 text-right">
                {{ week.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="employee in filteredEmployees" :key="employee.employeeId">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium text-text">
                {{ employee.name }}
              </td>
              <td class="px-3 py-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="employee.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
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
    </template>

    <template v-else>
      <div v-if="companyHours.isLoading.value" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

      <p v-else-if="companyHours.rows.value.length === 0" class="py-8 text-center text-sm text-text-muted">
        Sin empresas registradas.
      </p>

      <p v-else-if="filteredCompanyHours.length === 0" class="py-8 text-center text-sm text-text-muted">
        Ninguna empresa coincide con "{{ companySearch }}".
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2">Empresa</th>
              <th class="px-3 py-2 text-right">Horas activos</th>
              <th class="px-3 py-2 text-right">Horas inactivos</th>
              <th class="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
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
import { computed, ref, toRef } from 'vue'
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

const TABS: { value: boolean; label: string }[] = [
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
const active = ref(true)
const matrix = useEmployeeHoursMatrix(toRef(props, 'businessId'), year, active)

const employeeSearch = ref('')
const filteredEmployees = computed(() => {
  const term = employeeSearch.value.trim().toLowerCase()
  if (!term) return matrix.employees.value
  return matrix.employees.value.filter(e => e.name.toLowerCase().includes(term))
})

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
