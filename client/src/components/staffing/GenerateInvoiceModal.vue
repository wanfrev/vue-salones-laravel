<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text">Generar factura</h2>
            <button
              type="button"
              class="rounded-lg p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-text-muted mt-0.5">
            Ingresa el número de invoice para esta semana aprobada.
          </p>
        </div>

        <div v-if="companyName || total !== undefined" class="mb-4 rounded-xl border border-border bg-bg-secondary/40 p-3 text-xs space-y-1">
          <div v-if="companyName" class="flex justify-between">
            <span class="text-text-muted">Empresa:</span>
            <span class="font-medium text-text">{{ companyName }}</span>
          </div>
          <div v-if="total !== undefined" class="flex justify-between">
            <span class="text-text-muted">Monto a facturar:</span>
            <span class="font-bold text-text">{{ formatUSD(total) }}</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="staffing-invoice-number" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Número de factura / Invoice # <span class="text-danger">*</span>
            </label>
            <input
              id="staffing-invoice-number"
              v-model="invoiceNumber"
              type="text"
              required
              autofocus
              placeholder="Ej: INV-1001, 1045..."
              class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p class="mt-1 text-[11px] text-text-muted">
              Identificador único para tu cliente o sistema contable.
            </p>
          </div>

          <div v-if="errorMsg" class="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">
            {{ errorMsg }}
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isGenerating || !invoiceNumber.trim()"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isGenerating ? 'Generando...' : 'Generar factura' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  show: boolean
  companyName?: string
  total?: number
  isGenerating?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'generate', invoiceNumber: string): void
}>()

const { formatUSD } = useCurrency()
const invoiceNumber = ref('')
const errorMsg = ref('')

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    invoiceNumber.value = ''
    errorMsg.value = ''
  }
})

const handleSubmit = () => {
  const trimmed = invoiceNumber.value.trim()
  if (!trimmed) {
    errorMsg.value = 'Por favor ingresa el número de factura'
    return
  }
  emit('generate', trimmed)
}
</script>
