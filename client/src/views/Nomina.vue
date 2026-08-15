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
      <StaffingHoursPanel :business-id="businessId" />
    </section>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import StaffingHoursPanel from '../components/staffing/StaffingHoursPanel.vue'
import { WalletMoneyIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
