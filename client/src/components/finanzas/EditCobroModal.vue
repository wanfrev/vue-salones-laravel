<script setup lang="ts">
import { useCurrency } from '../../composables/useCurrency'

const { formatUSD } = useCurrency()

defineProps<{
  show: boolean
  summaryCtx: any
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Editar cobro</h2>
          <p class="text-sm text-text-muted" v-if="summaryCtx.editingTransaction.value">
            {{ summaryCtx.editingTransaction.value.client }} · {{ summaryCtx.editingTransaction.value.service }} · {{ summaryCtx.editingTransaction.value.date }}
          </p>
        </div>
        <form class="space-y-4" @submit.prevent="summaryCtx.saveEdit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Método de pago</label>
            <select
              :value="summaryCtx.editingMethod.value"
              @change="summaryCtx.setEditingMethod(($event.target as HTMLSelectElement).value as any)"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option v-for="opt in summaryCtx.paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
            <select
              :value="summaryCtx.editingCurrency.value"
              @change="summaryCtx.setEditingCurrency(($event.target as HTMLSelectElement).value as 'USD' | 'VES')"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="USD">USD $</option>
              <option value="VES">Bs</option>
            </select>
          </div>
          <div v-if="summaryCtx.isEditingMixed.value" class="space-y-3 rounded-lg border border-border-subtle bg-bg-secondary p-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-text">Desglose de pagos</label>
              <button type="button" @click="summaryCtx.addBreakdownItem()"
                class="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-theme hover:bg-primary/10">+ Agregar método</button>
            </div>
            <div v-for="(breakItem, bidx) in summaryCtx.editingBreakdown.value" :key="bidx"
              class="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface p-2">
              <select
                :value="breakItem.method"
                @change="summaryCtx.updateBreakdownItem(bidx, 'method', ($event.target as HTMLSelectElement).value as any)"
                class="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30 flex-1 min-w-0"
              >
                <option v-for="opt in summaryCtx.paymentMethodOptions.filter((o: any) => o.value !== 'mixed')" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <input type="number"
                :value="breakItem.amount"
                @input="summaryCtx.updateBreakdownItem(bidx, 'amount', Number(($event.target as HTMLInputElement).value))"
                class="w-28 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                min="0" step="0.01" placeholder="0.00"
              />
              <span class="text-xs font-medium text-text-muted w-8 text-center">{{ summaryCtx.editingCurrency.value }}</span>
              <button v-if="summaryCtx.editingBreakdown.value.length > 1" type="button" @click="summaryCtx.removeBreakdownItem(bidx)"
                class="rounded-lg p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger shrink-0">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ summaryCtx.isEditingMixed.value ? 'Total (calculado)' : 'Monto' }}</label>
            <input v-if="!summaryCtx.isEditingMixed.value"
              v-model.number="summaryCtx.editingAmount.value"
              type="number" min="0.01" step="0.01"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="0.00" required
            />
            <div v-else class="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-lg font-bold text-text">{{ formatUSD(summaryCtx.editingTotalAmount.value) }}</div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <textarea v-model="summaryCtx.editingNotes.value" placeholder="Notas del cobro (opcional)" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
            ></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-1">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit"
              :disabled="summaryCtx.editTransactionMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ summaryCtx.editTransactionMutation.isPending.value ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
