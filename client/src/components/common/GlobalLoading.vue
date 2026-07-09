<template>
  <Transition name="loading-fade">
    <div v-if="isFetching" class="fixed inset-0 z-[70] flex items-center justify-center bg-bg/60 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-4 rounded-2xl bg-surface border border-border shadow-2xl px-8 py-6">
        <div class="relative h-10 w-10">
          <div class="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>
        <p class="text-sm font-medium text-text-secondary">Cargando...</p>
        <div class="h-1 w-full max-w-[200px] rounded-full bg-bg-secondary overflow-hidden">
          <div class="h-full rounded-full animate-loading-bar" style="background: var(--color-success)" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useIsFetching } from '@tanstack/vue-query'
import { computed } from 'vue'

const fetching = useIsFetching()
const isFetching = computed(() => fetching.value > 0)
</script>

<style>
@keyframes loadingBar {
  0% { width: 0; margin-left: 0; }
  50% { width: 70%; margin-left: 15%; }
  100% { width: 0; margin-left: 100%; }
}
.animate-loading-bar {
  animation: loadingBar 1.5s ease-in-out infinite;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
