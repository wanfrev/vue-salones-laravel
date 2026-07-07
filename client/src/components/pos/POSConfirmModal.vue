<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  show: boolean
  grandTotal: number
  clientName: string | null
  isProcessing: boolean
}>()

const emit = defineEmits<{ cancel: []; confirm: [] }>()
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

        <div class="rounded-xl bg-bg-secondary p-4 mb-4 text-center">
          <p class="text-3xl font-extrabold text-text tabular-nums">${{ grandTotal.toFixed(2) }}</p>
          <p class="text-sm text-text-muted mt-0.5">{{ formatVESInline(grandTotal) }} Bs</p>
        </div>

        <div class="flex items-center gap-2">
          <button @click="$emit('cancel')" class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
          <button @click="$emit('confirm')" :disabled="isProcessing" class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:opacity-60">{{ isProcessing ? 'Procesando...' : `Cobrar $${grandTotal.toFixed(2)}` }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
