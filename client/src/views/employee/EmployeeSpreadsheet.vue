<template>
  <AppLayout>
    <SpreadsheetGenerator :business-id="businessId" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/common/useAuth'
import AppLayout from '../../components/layout/AppLayout.vue'
import SpreadsheetGenerator from '../../components/staffing/SpreadsheetGenerator.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
