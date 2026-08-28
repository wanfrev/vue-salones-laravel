<template>
  <FeatureGate :gate="{ capability: 'staffing.spreadsheet' }">
    <div class="space-y-4">
      <SpreadsheetAccessPanel :business-id="businessId" />
      <SpreadsheetGenerator :business-id="businessId" />
    </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import SpreadsheetAccessPanel from '../components/staffing/SpreadsheetAccessPanel.vue'
import SpreadsheetGenerator from '../components/staffing/SpreadsheetGenerator.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
