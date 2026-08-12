<template>
  <Teleport to="body">
    <Transition name="pwa-update">
      <div
        v-if="visible"
        class="fixed inset-x-0 top-0 z-[10000] flex justify-center px-3 pointer-events-none"
        style="padding-top: calc(env(safe-area-inset-top) + 0.75rem)"
      >
        <div
          class="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl border px-4 py-3"
          style="background: var(--color-surface-elevated); border-color: var(--color-border); box-shadow: var(--shadow-xl)"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style="background: var(--color-primary-light); color: var(--color-primary)"
          >
            <RefreshCw class="h-4.5 w-4.5" :class="updating && 'animate-spin'" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold leading-tight" style="color: var(--color-text)">
              Nueva versión disponible
            </p>
            <p class="text-xs mt-0.5 leading-tight" style="color: var(--color-text-muted)">
              Recargá para aplicar los últimos cambios.
            </p>
          </div>

          <button
            type="button"
            :disabled="updating"
            class="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-opacity disabled:opacity-60"
            style="background: var(--color-primary); color: var(--color-text-inverse)"
            @click="applyUpdate"
          >
            {{ updating ? 'Actualizando…' : 'Actualizar' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { usePwaUpdate } from '../../composables/common/usePwaUpdate'

const { needRefresh: visible, updating, applyUpdate } = usePwaUpdate()
</script>

<style scoped>
.pwa-update-enter-active,
.pwa-update-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.pwa-update-enter-from,
.pwa-update-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
