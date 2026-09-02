<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Editar número de factura</h2>
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
            Modifica el identificador correlativo de esta factura.
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="edit-invoice-number-input" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Número de factura / Invoice # <span class="text-danger">*</span>
            </label>
            <input
              id="edit-invoice-number-input"
              v-model="invoiceNumber"
              type="text"
              required
              autofocus
              placeholder="Ej: INV-1001, 1045..."
              class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
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
              :disabled="isUpdating || !invoiceNumber.trim()"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isUpdating ? 'Guardando...' : 'Guardar número' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  currentNumber: string
  isUpdating?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', newNumber: string): void
}>()

const invoiceNumber = ref('')
const errorMsg = ref('')

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    invoiceNumber.value = props.currentNumber || ''
    errorMsg.value = ''
  }
})

const handleSubmit = () => {
  const trimmed = invoiceNumber.value.trim()
  if (!trimmed) {
    errorMsg.value = 'El número no puede estar vacío.'
    return
  }
  emit('save', trimmed)
}
</script>
