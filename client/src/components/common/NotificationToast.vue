<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <TransitionGroup name="toast-slide">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="pointer-events-auto relative overflow-hidden rounded-xl border bg-zinc-950/85 backdrop-blur-md px-4 py-3.5 shadow-2xl shadow-black/80 flex items-center gap-3 transition-all duration-300"
          :class="n.type === 'error' || n.type === 'warning'
            ? 'border-[#f38ba8]/20 shadow-[#f38ba8]/5'
            : 'border-[var(--color-primary)]/20 shadow-[var(--color-primary)]/5'"
        >
          <div
            class="absolute left-0 top-0 bottom-0 w-[3px]"
            :class="n.type === 'error' || n.type === 'warning'
              ? 'bg-[#f38ba8]'
              : 'bg-[var(--color-primary)]'"
          />

          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            :class="n.type === 'error' || n.type === 'warning'
              ? 'bg-[#f38ba8]/10 text-[#f38ba8]'
              : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'"
          >
            <svg v-if="n.type === 'success' || n.type === 'info'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div class="flex-1 min-w-0 pr-2">
            <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {{ n.type === 'error' ? 'Error' : n.type === 'warning' ? 'Advertencia' : n.type === 'success' ? 'Completado' : 'Información' }}
            </p>
            <p class="text-sm font-medium text-white truncate mt-0.5">{{ n.message }}</p>
          </div>

          <button
            @click="remove(n.id)"
            class="h-6 w-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            class="absolute bottom-0 left-0 h-[1.5px] transition-all ease-linear"
            :class="n.type === 'error' || n.type === 'warning' ? 'bg-[#f38ba8]/40' : 'bg-[var(--color-primary)]/40'"
            :style="{ width: n.progress + '%', transitionDuration: n.duration + 'ms' }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotification } from '../../composables/common/useNotification'

const { notifications, remove } = useNotification()
</script>

<style scoped>
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
.toast-slide-leave-active {
  position: absolute;
}
</style>
