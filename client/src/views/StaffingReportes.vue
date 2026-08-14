<template>
  <FeatureGate :gate="{ capability: 'staffing.reports' }">
    <header class="mb-5 lg:mb-8">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <DocumentIcon class="h-3.5 w-3.5" />
        <span>Reportes</span>
      </div>
    </header>

    <div class="mb-4 flex gap-1 border-b border-border">
      <button v-for="tab in TABS" :key="tab.value" type="button"
        class="relative px-3 py-2 text-sm font-semibold transition-theme"
        :class="activeTab === tab.value ? 'text-primary' : 'text-text-muted hover:text-text'"
        @click="activeTab = tab.value">
        {{ tab.label }}
        <span v-if="activeTab === tab.value" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
      </button>
    </div>

    <MonthlyPayrollReport v-if="activeTab === 'monthly'" :business-id="businessId" />
    <WeeklyCompanyReport v-else-if="activeTab === 'weekly'" :business-id="businessId" />
    <EmployeeHoursMatrix v-else :business-id="businessId" />
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import MonthlyPayrollReport from '../components/staffing/MonthlyPayrollReport.vue'
import WeeklyCompanyReport from '../components/staffing/WeeklyCompanyReport.vue'
import EmployeeHoursMatrix from '../components/staffing/EmployeeHoursMatrix.vue'
import { DocumentIcon } from '@solar-icons/vue/linear'

const TABS: { value: 'monthly' | 'weekly' | 'hours'; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'hours', label: 'Horas reportadas' },
]

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)

const activeTab = ref<'monthly' | 'weekly' | 'hours'>('monthly')
</script>
