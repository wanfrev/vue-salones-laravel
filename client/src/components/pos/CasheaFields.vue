<template>
  <div class="mt-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Venta con Cashea</p>

    <div class="grid grid-cols-3 gap-2">
      <label class="col-span-3 flex flex-col gap-1 text-xs font-semibold text-text-secondary sm:col-span-1">
        Monto Cashea ($)
        <input
          type="number" min="0" step="0.01" inputmode="decimal"
          :value="draft.total ?? ''"
          @input="draft.total = toNumber(($event.target as HTMLInputElement).value)"
          :placeholder="base.toFixed(2)"
          aria-label="Monto cobrado por Cashea"
          class="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-normal text-text outline-none focus:border-primary"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
        Comisión hoy (%)
        <input
          type="number" min="0" :max="MAX_CASHEA_FEE" step="0.01" inputmode="decimal"
          :value="draft.feePercentage"
          @input="rememberFee(toNumber(($event.target as HTMLInputElement).value) ?? 0)"
          aria-label="Comisión de Cashea"
          class="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-normal text-text outline-none focus:border-primary"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
        Inicial (%)
        <input
          type="number" min="0" max="100" step="1" inputmode="decimal"
          :value="draft.downPaymentPercentage"
          @input="draft.downPaymentPercentage = toNumber(($event.target as HTMLInputElement).value) ?? 0"
          aria-label="Inicial de Cashea"
          class="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-normal text-text outline-none focus:border-primary"
        />
      </label>
    </div>

    <dl v-if="total > 0" class="space-y-1 text-xs">
      <div class="flex justify-between text-text-secondary"><dt>Inicial que pagó el cliente ({{ draft.downPaymentPercentage }}%)</dt><dd class="tabular-nums">{{ usd(totals.downPayment) }}</dd></div>
      <div class="flex justify-between text-text-secondary"><dt>Comisión de Cashea ({{ draft.feePercentage }}%)</dt><dd class="tabular-nums text-danger">− {{ usd(totals.fee) }}</dd></div>
      <div class="flex justify-between border-t border-border/60 pt-1 font-semibold text-text"><dt>Entra hoy a Finanzas</dt><dd class="tabular-nums">{{ usd(totals.net) }}</dd></div>
      <p class="pt-1 text-text-muted">El % de cada especialista se calcula sobre {{ usd(totals.net) }} (ya sin la comisión de Cashea).</p>
    </dl>

    <p v-if="problem" class="text-xs font-semibold text-danger">{{ problem }}</p>
    <p class="text-xs text-text-muted">El resto se lo paga el cliente a Cashea: el negocio no registra nada más.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MAX_CASHEA_FEE, casheaProblem, casheaTotals } from './cashea'
import { useCasheaDraft } from '../../composables/pos/useCasheaDraft'

/** Lo que cuesta la venta (servicio + productos, sin propina): el mínimo del monto de Cashea. */
const props = defineProps<{ base: number }>()

const { draft, rememberFee } = useCasheaDraft()

const toNumber = (v: string): number | null => (v === '' ? null : Number(v))
const usd = (n: number) => `$${n.toFixed(2)}`

const total = computed(() => draft.total ?? props.base)
const totals = computed(() => casheaTotals(total.value, draft.feePercentage, draft.downPaymentPercentage))
const problem = computed(() => casheaProblem(total.value, props.base, draft.feePercentage, draft.downPaymentPercentage))
</script>
