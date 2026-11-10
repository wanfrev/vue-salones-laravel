<template>
  <div class="space-y-2 rounded-xl border border-border bg-surface p-3" data-testid="pos-discount">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Descuento</span>
      <span v-if="amount > 0" class="text-xs font-semibold tabular-nums text-warning" data-testid="pos-discount-amount">−{{ formatUSD(amount) }}</span>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="p in presets"
        :key="p"
        type="button"
        data-testid="pos-discount-preset"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="percent === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-bg-secondary'"
        @click="emit('update:percent', p)"
      >{{ p === 0 ? 'Sin descuento' : `${p}%` }}</button>

      <label class="ml-auto inline-flex items-center gap-1 text-xs text-text-muted">
        Otro
        <input
          :value="percent > 0 && !presets.includes(percent) ? percent : ''"
          type="number"
          min="0"
          max="100"
          step="0.5"
          inputmode="decimal"
          aria-label="Porcentaje de descuento"
          data-testid="pos-discount-custom"
          class="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-xs text-text outline-none focus:border-primary"
          @input="onCustom(($event.target as HTMLInputElement).value)"
        />
        %
      </label>
    </div>

    <p v-if="amount > 0" class="text-[11px] text-text-muted" data-testid="pos-discount-note">
      Se cobra {{ formatUSD(base - amount) }} en vez de {{ formatUSD(base) }}. La comisión sigue calculándose sobre {{ formatUSD(base) }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  /** Porcentaje aplicado (0 = sin descuento). */
  percent: number
  /** Cuánto se descuenta, en dólares. */
  amount: number
  /** Precio inicial del servicio, sobre el que se calcula el descuento y la comisión. */
  base: number
}>()

const emit = defineEmits<{ 'update:percent': [percent: number] }>()

const { formatUSD } = useCurrency()
const presets = [0, 5, 10, 15]

// Un porcentaje escrito a mano se limita a 0–100; vacío o inválido vuelve a «Sin descuento».
const onCustom = (raw: string) => {
  const n = Number(raw)
  emit('update:percent', Number.isFinite(n) && n > 0 ? Math.min(100, Math.round(n * 100) / 100) : 0)
}
</script>
