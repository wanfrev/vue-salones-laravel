<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex items-center justify-between gap-3">
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

    <div v-if="matrix.isLoading.value" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

    <p v-else-if="matrix.employees.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      Sin empleados {{ active ? 'activos' : 'inactivos' }}.
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
          <tr v-for="employee in matrix.employees.value" :key="employee.employeeId">
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
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import { useEmployeeHoursMatrix } from '../../composables/staffing/useEmployeeHoursMatrix'

const props = defineProps<{ businessId: string | null }>()

const TABS: { value: boolean; label: string }[] = [
  { value: true, label: 'Activos' },
  { value: false, label: 'Inactivos' },
]

const year = ref(new Date().getFullYear())
const active = ref(true)

const matrix = useEmployeeHoursMatrix(toRef(props, 'businessId'), year, active)
</script>
