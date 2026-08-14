<template>
  <FeatureGate :gate="{ capability: 'staffing.crm' }">
    <LeadBoard :business-id="businessId" />
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import LeadBoard from '../components/staffing/LeadBoard.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
