<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">Nómina por semana</p>
      <div class="flex items-center gap-2">
        <select v-model.number="month" class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text">
          <option v-for="(label, i) in MONTH_LABELS" :key="i" :value="i + 1">{{ label }}</option>
        </select>
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
    </div>

    <div v-if="report.isLoading.value" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

    <p v-else-if="report.companies.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      Sin empresas registradas.
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="px-3 py-2">Empresa</th>
            <th v-for="(week, i) in report.weeks.value" :key="week.week_start" class="px-3 py-2 text-right">
              Semana {{ i + 1 }}
            </th>
            <th class="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="company in report.companies.value" :key="company.companyId">
            <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ company.name }}</td>
            <td v-for="week in report.weeks.value" :key="week.week_start" class="px-1 py-1 text-right">
              <button type="button"
                class="w-full rounded-md px-2 py-1 tabular-nums text-text-secondary transition-theme hover:bg-primary/10 hover:text-primary"
                :title="`Ir a la nómina de ${company.name} — semana del ${week.week_start}`"
                @click="goToNomina(company.companyId, week.week_start)">
                {{ formatUSD(company.weeklyPayroll[week.week_start] ?? 0) }}
              </button>
            </td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ formatUSD(company.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import { useStaffingMonthlyReport } from '../../composables/staffing/useStaffingMonthlyReport'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()
const router = useRouter()

const goToNomina = (companyId: string, weekStart: string) => {
  router.push({ path: '/admin/nomina', query: { companyId, weekStart } })
}

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)

const report = useStaffingMonthlyReport(toRef(props, 'businessId'), year, month)
</script>
