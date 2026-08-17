<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  show: boolean
  grandTotal: number
  clientName: string | null
  isProcessing: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [shouldPrint: boolean]
}>()

const { formatVESInline } = useCurrency()
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('cancel')">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg class="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-text">Confirmar cobro</h3>
          <p class="text-sm text-text-muted mt-1" v-if="clientName">{{ clientName }}</p>
        </div>

        <div class="rounded-xl bg-bg-secondary p-4 mb-5 text-center">
          <p class="text-3xl font-extrabold text-text tabular-nums">${{ grandTotal.toFixed(2) }}</p>
          <p class="text-sm text-text-muted mt-0.5">{{ formatVESInline(grandTotal) }} Bs</p>
        </div>

        <div class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="$emit('confirm', false)"
              :disabled="isProcessing"
              class="flex items-center justify-center rounded-xl border border-border bg-bg-secondary px-3 py-3 text-sm font-bold text-text transition-theme hover:bg-bg-tertiary disabled:opacity-60"
            >
              {{ isProcessing ? 'Procesando...' : 'Cobrar' }}
            </button>
            <button
              @click="$emit('confirm', true)"
              :disabled="isProcessing"
              class="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-text-inverse transition-theme hover:bg-primary-hover disabled:opacity-60"
            >
              <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span class="truncate">Cobrar e imprimir</span>
            </button>
          </div>
          <button
            @click="$emit('cancel')"
            :disabled="isProcessing"
            class="w-full rounded-xl py-2 text-xs font-semibold text-text-muted transition-theme hover:text-text hover:bg-bg-secondary disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
