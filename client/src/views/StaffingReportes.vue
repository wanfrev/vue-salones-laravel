<template>
  <FeatureGate :gate="{ capability: 'staffing.reports' }">
    <header class="mb-4 flex items-center gap-2">
      <DocumentIcon class="h-4 w-4 shrink-0 text-primary" />
      <h1 class="text-xl font-bold tracking-tight text-text sm:text-2xl">Reportes</h1>
    </header>

    <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Reportes de staffing">
        <button v-for="tab in TABS" :key="tab.value" type="button" role="tab" :aria-selected="activeTab === tab.value"
          class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
          @click="activeTab = tab.value">
          {{ tab.label }}
          <span v-if="activeTab === tab.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
        </button>
      </div>
      <p class="border-b border-border-subtle px-3 py-2.5 text-xs text-text-muted sm:px-4">{{ activeDescription }}</p>

      <MonthlyPayrollReport v-if="activeTab === 'monthly'" :business-id="businessId" />
      <WeeklyCompanyReport v-else-if="activeTab === 'weekly'" :business-id="businessId" />
      <ReceivablesAgingReport v-else-if="activeTab === 'receivables'" :business-id="businessId" />
      <ProfitabilityReport v-else-if="activeTab === 'profitability'" :business-id="businessId" />
      <EmployeeHoursMatrix v-else :business-id="businessId" />
    </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { FeatureGate } from '../components/common'
import MonthlyPayrollReport from '../components/staffing/MonthlyPayrollReport.vue'
import WeeklyCompanyReport from '../components/staffing/WeeklyCompanyReport.vue'
import EmployeeHoursMatrix from '../components/staffing/EmployeeHoursMatrix.vue'
import ReceivablesAgingReport from '../components/staffing/ReceivablesAgingReport.vue'
import ProfitabilityReport from '../components/staffing/ProfitabilityReport.vue'
import { DocumentIcon } from '@solar-icons/vue/linear'

type ReportTab = 'monthly' | 'weekly' | 'hours' | 'receivables' | 'profitability'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)

// "Por cobrar" is opt-in per business (superadmin flag) — without it the tab list is exactly
// what it was before.
const TABS = computed<{ value: ReportTab; label: string; description: string }[]>(() => [
  { value: 'monthly', label: 'Nómina mensual', description: 'Cuánto se pagó de nómina en cada semana del mes, una fila por empresa.' },
  { value: 'weekly', label: 'Resultados semanales', description: 'Por semana y empresa: nómina, invoice, ganancia bruta, gastos y número de empleados.' },
  { value: 'hours', label: 'Horas trabajadas', description: 'Las horas de cada empleado semana a semana, o las de cada empresa en una semana, un mes o un año.' },
  ...(businessStore.features.staffing_receivables ? [{ value: 'receivables' as const, label: 'Cuentas por cobrar', description: 'Lo que cada empresa te debe, agrupado por los días que lleva vencida la factura.' }] : []),
  ...(businessStore.features.staffing_profitability ? [{ value: 'profitability' as const, label: 'Rentabilidad', description: 'Cuánto margen deja cada empresa y cada rol en el período que elijas.' }] : []),
])

const activeTab = ref<ReportTab>('monthly')
const activeDescription = computed(() => TABS.value.find(t => t.value === activeTab.value)?.description ?? '')
</script>
