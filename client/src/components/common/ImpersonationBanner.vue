<template>
  <div
    v-if="label"
    class="sticky top-0 z-[100] flex items-center justify-center gap-3 bg-warning px-3 py-2 text-xs font-semibold text-text-inverse shadow-md sm:text-sm"
  >
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
    <span class="truncate">Viendo como: {{ label }}</span>
    <button
      type="button"
      :disabled="isExiting"
      class="shrink-0 rounded-md bg-black/10 px-2.5 py-1 font-bold transition-theme hover:bg-black/20 disabled:opacity-60"
      @click="handleExit"
    >
      {{ isExiting ? 'Saliendo...' : 'Volver a superadmin' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getImpersonationLabel, exitImpersonation } from '../../composables/superadmin/useImpersonation'

const label = ref(getImpersonationLabel())
const isExiting = ref(false)

const handleExit = async () => {
  if (isExiting.value) return
  isExiting.value = true
  try {
    await exitImpersonation()
  } finally {
    isExiting.value = false
  }
}
</script>
