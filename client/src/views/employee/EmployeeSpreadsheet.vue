<template>
  <AppLayout>
    <header class="mb-4 flex items-center gap-2">
      <DocumentIcon class="h-4 w-4 shrink-0 text-primary" />
      <h1 class="text-xl font-bold tracking-tight text-text sm:text-2xl">Spreadsheet</h1>
    </header>
    <SpreadsheetGenerator :business-id="businessId" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/common/useAuth'
import AppLayout from '../../components/layout/AppLayout.vue'
import { DocumentIcon } from '@solar-icons/vue/linear'
import SpreadsheetGenerator from '../../components/staffing/SpreadsheetGenerator.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
