<template>
  <AppLayout>
    <LeadBoard :business-id="businessId" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/common/useAuth'
import AppLayout from '../../components/layout/AppLayout.vue'
import LeadBoard from '../../components/staffing/LeadBoard.vue'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
</script>
