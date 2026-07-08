<template>
  <div v-if="!hasAccess" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary mb-4">
      <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 class="text-lg font-semibold text-text">Funcionalidad no disponible</h2>
    <p class="mt-1 text-sm text-text-muted max-w-md">Esta funcionalidad no está habilitada para tu plan actual. Contacta
      al administrador del sistema.</p>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBusinessStore } from '../../store/business'

const props = defineProps<{
  feature: string
}>()

const businessStore = useBusinessStore()
const hasAccess = computed(() => businessStore.hasFeature(props.feature as any))
</script>
