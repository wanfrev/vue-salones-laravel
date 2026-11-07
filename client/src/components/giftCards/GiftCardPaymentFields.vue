<template>
  <div class="space-y-3" data-testid="gc-payment-fields">
    <div v-for="(line, i) in lines" :key="i" class="space-y-2 rounded-lg border border-border bg-surface p-2.5" data-testid="gc-payment-line">
      <div class="flex items-center gap-2">
        <select
          :value="line.method"
          :aria-label="`Forma de pago ${i + 1}`"
          :class="fieldClass"
          class="min-w-0 flex-1"
          data-testid="gc-line-method"
          @change="setMethod(i, ($event.target as HTMLSelectElement).value as GiftCardPayMethod)"
        >
          <option v-for="m in PAY_METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>

        <div class="relative w-32 shrink-0">
          <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">{{ methodCurrency(line.method) === 'VES' ? 'Bs' : '$' }}</span>
          <input
            :value="line.amount ?? ''"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            :aria-label="`Monto de la forma de pago ${i + 1}`"
            :class="fieldClass"
            class="w-full pl-8 text-right"
            data-testid="gc-line-amount"
            @input="setAmount(i, ($event.target as HTMLInputElement).value)"
          />
        </div>

        <button v-if="lines.length > 1" type="button" class="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger" aria-label="Quitar esta forma de pago" data-testid="gc-line-remove" @click="removeLine(i)">
          <CloseCircleIcon class="h-4 w-4" />
        </button>
      </div>

      <select
        v-if="methodHasBank(line.method) && banks.length"
        :value="line.bankId ?? ''"
        :aria-label="`Banco de la forma de pago ${i + 1}`"
        :class="fieldClass"
        class="w-full"
        data-testid="gc-line-bank"
        @change="update(i, { bankId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">Banco (opcional)</option>
        <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>

      <p v-if="methodCurrency(line.method) === 'VES' && lineUsd(line, rate) > 0" class="text-right text-xs tabular-nums text-text-muted">≈ ${{ lineUsd(line, rate).toFixed(2) }}</p>
    </div>

    <button v-if="lines.length < 6" type="button" class="text-xs font-semibold text-primary hover:text-primary-hover" data-testid="gc-add-line" @click="addLine">+ Agregar otra forma de pago</button>

    <div v-if="hasVesLine(lines)" class="flex items-center justify-between gap-3 text-xs text-text-secondary">
      <label for="gc-rate">Tasa del día (Bs por $)</label>
      <input
        id="gc-rate"
        :value="rate || ''"
        type="number"
        min="0"
        step="0.01"
        :class="fieldClass"
        class="w-28 text-right"
        data-testid="gc-rate"
        @input="emit('update:rate', Number(($event.target as HTMLInputElement).value) || 0)"
      />
    </div>

    <p class="text-xs" :class="error ? 'text-danger' : 'text-text-muted'" data-testid="gc-payment-summary" aria-live="polite">
      <template v-if="error">{{ error }}</template>
      <template v-else>Se recibe <b class="text-text">${{ total.toFixed(2) }}</b>. Es dinero que entra a la caja del día; no cuenta como ingreso hasta que la gift card se use.</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloseCircleIcon } from '@solar-icons/vue/linear'
import {
  PAY_METHODS, amountForUsd, hasVesLine, lineUsd, methodCurrency, methodHasBank, paymentError, totalUsd,
  type GiftCardPayMethod, type PaymentLine,
} from '../../lib/giftCardPayment'

const props = defineProps<{
  lines: PaymentLine[]
  /** Tasa del día (Bs por $), para las líneas en bolívares. */
  rate: number
  banks: { id: string; name: string }[]
  /** Lo que deben sumar las líneas, en dólares; sin esto (registrar después) solo se pide que haya un monto. */
  target?: number | null
}>()

const emit = defineEmits<{ 'update:lines': [lines: PaymentLine[]]; 'update:rate': [rate: number] }>()

const fieldClass = 'rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary'

const total = computed(() => totalUsd(props.lines, props.rate))
const error = computed(() => paymentError(props.lines, props.rate, props.target))

// Siempre se emite una lista nueva: el editor nunca modifica la del padre.
const update = (i: number, patch: Partial<PaymentLine>) => emit('update:lines', props.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

const setAmount = (i: number, raw: string) => update(i, { amount: raw === '' ? null : Number(raw) })

// Al cambiar de método el monto se reconvierte para que siga valiendo lo mismo en dólares.
const setMethod = (i: number, method: GiftCardPayMethod) => {
  const current = props.lines[i]
  const usd = lineUsd(current, props.rate)
  update(i, { method, bankId: methodHasBank(method) ? current.bankId : null, amount: usd > 0 ? amountForUsd(method, usd, props.rate) : current.amount })
}

const addLine = () => {
  const missing = props.target != null ? Math.max(0, props.target - total.value) : 0
  emit('update:lines', [...props.lines, { method: 'cash', amount: missing > 0 ? missing : null, bankId: null }])
}
const removeLine = (i: number) => emit('update:lines', props.lines.filter((_, idx) => idx !== i))
</script>
