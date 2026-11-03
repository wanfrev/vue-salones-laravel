<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('cancel')">
      <form class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl" @submit.prevent="submit">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Corregir monto</h2>
          <p class="text-sm text-text-muted">{{ credit.client_name }}</p>
        </div>

        <div class="mb-4 rounded-lg bg-bg-secondary/60 px-3 py-2.5 text-xs">
          <div class="flex justify-between text-text-secondary">
            <span>Monto actual del crédito</span>
            <span class="font-medium text-text">{{ formatUSD(credit.amount) }}</span>
          </div>
          <div v-if="paid > 0" class="mt-1 flex justify-between text-text-secondary">
            <span>Ya abonado</span>
            <span class="font-medium text-success">{{ formatUSD(paid) }}</span>
          </div>
        </div>

        <label class="mb-1 block text-sm font-medium text-text" for="cr-new-amount">Monto correcto ($)</label>
        <input
          id="cr-new-amount"
          v-model.number="amount"
          type="number"
          inputmode="decimal"
          step="0.01"
          :min="Math.max(paid, 0.01)"
          required
          class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <p v-if="belowPaid" class="mt-1.5 text-xs text-danger" data-testid="credit-amount-error">
          No puede ser menor a lo ya abonado ({{ formatUSD(paid) }}).
        </p>
        <p v-else-if="settles" class="mt-1.5 text-xs text-text-muted" data-testid="credit-amount-settles">
          Queda igual a lo abonado: el crédito pasa a Pagados.
        </p>
        <p v-else class="mt-1.5 text-xs text-text-muted">
          Solo cambia lo que se espera cobrar.
        </p>
        <p class="mt-1 text-xs text-text-muted">No se registra ningún ingreso nuevo en Finanzas.</p>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary" @click="emit('cancel')">Cancelar</button>
          <button
            type="submit"
            :disabled="saving || !valid || belowPaid || unchanged"
            class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >{{ saving ? 'Guardando...' : 'Guardar monto' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import type { Credit } from '../../types/database'

const props = defineProps<{ credit: Credit; saving?: boolean }>()
const emit = defineEmits<{ save: [amount: number]; cancel: [] }>()

const { formatUSD } = useCurrency()

// Estado local: el formulario nunca modifica el crédito del padre.
const amount = ref<number>(Number(props.credit.amount))
const paid = computed(() => Number(props.credit.paid_amount) || 0)
const valid = computed(() => Number.isFinite(amount.value) && amount.value > 0)
const belowPaid = computed(() => valid.value && amount.value < paid.value - 0.005)
const unchanged = computed(() => Math.abs(amount.value - Number(props.credit.amount)) < 0.005)
const settles = computed(() => valid.value && paid.value > 0 && !belowPaid.value && amount.value <= paid.value + 0.005)

const submit = () => {
  if (!valid.value || belowPaid.value || unchanged.value) return
  emit('save', Math.round(amount.value * 100) / 100)
}
</script>
