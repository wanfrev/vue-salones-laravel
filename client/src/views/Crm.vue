<template>
  <FeatureGate :gate="{ capability: 'staffing.crm' }">
    <div class="flex flex-col gap-4 sm:flex-row">
      <CrmVendedoraSidebar v-model="selectedOwnerId" :business-id="businessId" />
      <div class="min-w-0 flex-1">
        <LeadBoard :business-id="businessId" :owner-id="selectedOwnerId" />
      </div>
    </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import LeadBoard from '../components/staffing/LeadBoard.vue'
import CrmVendedoraSidebar from '../components/staffing/CrmVendedoraSidebar.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)

// null = "Todos los leads" — the flat combined view every admin got before this sidebar existed.
const selectedOwnerId = ref<string | null>(null)
</script>
