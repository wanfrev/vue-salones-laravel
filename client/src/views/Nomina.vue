<template>
  <FeatureGate :gate="{ capability: 'staffing.timesheets' }">
    <header class="mb-5 lg:mb-8">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <WalletMoneyIcon class="h-3.5 w-3.5" />
        <span>Nómina</span>
      </div>
      <p class="mt-1 text-sm text-text-muted">Carga las horas de la semana por empresa y calcula el pago y la factura.</p>
    </header>

    <section class="rounded-2xl border border-border bg-surface p-4 lg:p-6">
      <StaffingHoursPanel :business-id="businessId" :initial-company-id="initialCompanyId" :initial-week-start="initialWeekStart" />
    </section>

    <section class="mt-4 rounded-2xl border border-border bg-surface p-4 lg:p-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-text">Lista de depósitos</p>
          <p class="text-xs text-text-muted">
            Junta en una sola lista todo lo que hay que depositar esa semana, una vez que la nómina de cada empresa
            esté aprobada — solo empleados que cobran por depósito directo.
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="deposit-week">
              Semana desde
            </label>
            <input id="deposit-week" v-model="depositWeekStart" type="date"
              class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <button type="button" :disabled="!depositWeekStart || isGeneratingDepositList" @click="handleGenerateDepositList"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {{ isGeneratingDepositList ? 'Generando...' : 'Generar lista de depósitos' }}
          </button>
        </div>
      </div>
      <p v-if="depositListError" class="mt-2 text-xs text-danger">{{ depositListError }}</p>
    </section>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { FeatureGate } from '../components/common'
import StaffingHoursPanel from '../components/staffing/StaffingHoursPanel.vue'
import { getStaffingDepositList } from '../services/staffing/staffingService'
import { printStaffingDepositList } from '../lib/staffingDepositListPrint'
import { WalletMoneyIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)

// Deep link from Reportes > Mensual — clicking a company's week takes you straight to its nómina.
const route = useRoute()
const initialCompanyId = computed(() => (route.query.companyId as string) || null)
const initialWeekStart = computed(() => (route.query.weekStart as string) || null)

const depositWeekStart = ref('')
const isGeneratingDepositList = ref(false)
const depositListError = ref('')

const handleGenerateDepositList = async () => {
  if (!depositWeekStart.value) return
  depositListError.value = ''
  isGeneratingDepositList.value = true
  try {
    const rows = await getStaffingDepositList(depositWeekStart.value)
    if (rows.length === 0) {
      depositListError.value = 'No hay pagos por depósito directo listos para esa semana — revisa que la nómina de esas empresas ya esté aprobada.'
      return
    }
    printStaffingDepositList(rows, depositWeekStart.value, businessStore.business?.name || 'Delta Work Force')
  } catch (err) {
    depositListError.value = err instanceof Error ? err.message : 'No se pudo generar la lista.'
  } finally {
    isGeneratingDepositList.value = false
  }
}
</script>
