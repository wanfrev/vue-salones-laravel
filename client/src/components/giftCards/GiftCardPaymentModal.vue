<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" data-testid="gc-payment-modal" @click.self="emit('cancel')">
      <form class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl" @submit.prevent="submit">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ giftCard.payment ? 'Cambiar el cobro' : 'Registrar cobro' }}</h2>
          <p class="text-sm text-text-muted">{{ giftCard.code }} · {{ giftCard.recipientName }}</p>
        </div>

        <GiftCardPaymentFields v-model:lines="lines" v-model:rate="rate" :banks="banks" />

        <div v-if="canBackdate" class="mt-4">
          <label class="mb-1 block text-sm font-medium text-text" for="gc-paid-date">Fecha en que se cobró</label>
          <input
            id="gc-paid-date"
            v-model="paidDate"
            type="date"
            :max="today"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            data-testid="gc-paid-date"
          />
          <p class="mt-1 text-xs text-text-muted">Déjala vacía si se cobró hoy.</p>
        </div>

        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-secondary" @click="emit('cancel')">Cancelar</button>
          <button
            type="submit"
            :disabled="saving || !!error"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="gc-payment-save"
          >{{ saving ? 'Guardando...' : 'Guardar cobro' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GiftCardPaymentFields from './GiftCardPaymentFields.vue'
import { amountForUsd, paymentError, toPayload, type PaymentLine } from '../../lib/giftCardPayment'
import type { GiftCard } from '../../types/giftCard'

const props = defineProps<{
  giftCard: GiftCard
  banks: { id: string; name: string }[]
  /** Tasa del día (Bs por $) con la que empieza el cobro. */
  exchangeRate: number
  /** Solo admin/encargado y con «Permitir cobrar con otra fecha» activo (el servidor lo vuelve a exigir). */
  canBackdate?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{ save: [payload: ReturnType<typeof toPayload>]; cancel: [] }>()

// Estado local: el formulario nunca modifica la gift card del padre. Empieza con el cobro ya registrado (si lo hay) o con
// efectivo por el saldo, que es lo más común.
const rate = ref(props.exchangeRate)
const lines = ref<PaymentLine[]>(props.giftCard.payment
  ? props.giftCard.payment.splits.map(s => ({ method: s.method as PaymentLine['method'], amount: s.currency === 'VES' ? s.inputAmount : s.amount, bankId: s.bankId ?? null }))
  : [{ method: 'cash', amount: amountForUsd('cash', props.giftCard.amount, rate.value), bankId: null }])
const paidDate = ref('')

const today = new Date().toLocaleDateString('en-CA')
const error = computed(() => paymentError(lines.value, rate.value))

const submit = () => {
  if (error.value) return
  emit('save', toPayload(lines.value, rate.value, props.canBackdate ? paidDate.value : null))
}
</script>
