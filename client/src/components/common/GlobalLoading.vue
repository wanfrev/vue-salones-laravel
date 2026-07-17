<template>
  <Transition name="loading-fade">
    <div v-if="isFetching" class="fixed top-0 left-0 right-0 z-[70] h-[2px] w-full bg-transparent overflow-hidden">
      <div class="h-full animate-loading-bar" style="background: var(--color-success)" />
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
