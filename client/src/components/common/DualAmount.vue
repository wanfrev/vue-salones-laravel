<template>
  <div :class="orientation === 'inline' ? 'flex items-baseline gap-1.5' : 'flex flex-col items-end'">
    <span :class="['font-semibold tabular-nums whitespace-nowrap', primaryClass, amountSizeClass]">
      <template v-if="showSign">{{ sign || (isNegative ? '-' : '') }}</template>
      {{ displayPrimary }}
    </span>
    <span :class="['tabular-nums whitespace-nowrap', secondaryClass, secondarySizeClass]">
      {{ displaySecondary }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'

const props = withDefaults(defineProps<{
  amount: number
  exchangeRate?: number
  primaryCurrency?: 'USD' | 'VES'
  originalAmount?: number
  primaryClass?: string
  secondaryClass?: string
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'stack' | 'inline'
  showSign?: boolean
  sign?: '+' | '-'
}>(), {
  exchangeRate: undefined,
  primaryCurrency: 'USD',
  originalAmount: undefined,
  primaryClass: 'text-text',
  secondaryClass: 'text-xs text-text-muted',
  size: 'md',
  orientation: 'stack',
  showSign: false,
  sign: undefined,
})

const { formatUSD, formatVESEs, formatVESInline, exchangeRate: currentRate } = useCurrency()

const effectiveRate = computed(() => props.exchangeRate ?? currentRate.value)

const displayPrimary = computed(() => {
  if (props.primaryCurrency === 'VES') {
    return formatVESEs(props.originalAmount ?? props.amount * effectiveRate.value)
  }
  return formatUSD(props.amount)
})

const isNegative = computed(() => props.amount < 0)

const displaySecondary = computed(() => {
  if (props.primaryCurrency === 'VES') {
    return formatUSD(props.amount)
  }
  return formatVESInline(props.amount, effectiveRate.value) + ' Bs'
})

const amountSizeClass = computed(() => {
  if (props.size === 'lg') return 'text-xl sm:text-2xl font-bold tracking-tight'
  if (props.size === 'sm') return 'text-xs'
  return 'text-sm'
})

const secondarySizeClass = computed(() => {
  if (props.size === 'lg') return 'text-sm'
  if (props.size === 'sm') return 'text-[10px]'
  return 'text-xs'
})
</script>
