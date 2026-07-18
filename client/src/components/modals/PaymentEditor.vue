<template>
  <div v-if="paymentContext" class="border-t border-border pt-4">
    <div v-if="appointmentProducts.length > 0" class="mb-4 rounded-lg border border-border bg-bg-secondary p-3">
      <h4 class="text-sm font-semibold text-text mb-2">Productos vendidos en esta cita</h4>
      <div class="space-y-1.5">
        <div v-for="product in appointmentProducts" :key="product.movementId" class="flex items-center justify-between text-xs">
          <span class="text-text">{{ product.productName }}</span>
          <span class="text-text-muted">{{ product.quantity }} &times; {{ formatUSD(product.unitCost) }}</span>
        </div>
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-border pt-1.5 text-xs">
        <span class="font-medium text-text-muted">Total productos</span>
        <span class="font-semibold text-text">{{ formatUSD(appointmentProductsTotal) }}</span>
      </div>
    </div>

    <h4 class="text-sm font-semibold text-text mb-3">Editar cobro</h4>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-text-muted">Método de pago</label>
        <select
          :value="paymentMethod"
          @change="setPaymentMethod(($event.target as HTMLSelectElement).value)"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div v-if="!isMixedPayment">
        <label class="mb-1 block text-xs font-medium text-text-muted">Moneda</label>
        <select
          :value="paymentCurrency"
          @change="setPaymentCurrency(($event.target as HTMLSelectElement).value as 'USD' | 'VES')"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          <option value="USD">USD $</option>
          <option value="VES">Bs</option>
        </select>
      </div>
    </div>

    <div v-if="isMixedPayment" class="mt-3 space-y-2 rounded-lg border border-border bg-bg-secondary p-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-text">Desglose de pagos</span>
        <button type="button" @click="addPaymentBreakdownItem()"
          class="rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-theme hover:bg-primary/10">
          + Agregar método
        </button>
      </div>
      <div v-for="(item, idx) in paymentBreakdown" :key="idx"
        class="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
        <select
          :value="item.method"
          @change="updatePaymentBreakdownItem(idx, 'method', ($event.target as HTMLSelectElement).value)"
          class="flex-[2] min-w-0 rounded border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary"
        >
          <option v-for="opt in paymentMethodOptions.filter(o => o.value !== 'mixed')" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <input
          type="number"
          :value="item.inputAmount"
          @input="updatePaymentBreakdownItem(idx, 'amount', Number(($event.target as HTMLInputElement).value))"
          class="w-24 rounded border border-border bg-surface px-2 py-1.5 text-right text-xs text-text outline-none transition-theme focus:border-primary"
          min="0" step="0.01" placeholder="0.00"
        />
        <select
          :value="item.currency"
          @change="updatePaymentBreakdownItem(idx, 'currency', ($event.target as HTMLSelectElement).value)"
          class="w-16 rounded border border-border bg-surface px-1 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary"
        >
          <option value="USD">USD</option>
          <option value="VES">Bs</option>
        </select>
        <button v-if="paymentBreakdown.length > 1" type="button" @click="removePaymentBreakdownItem(idx)"
          class="rounded p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger shrink-0">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="mt-3">
      <label class="mb-1 block text-xs font-medium text-text-muted">
        {{ isMixedPayment ? 'Total USD (calculado)' : 'Monto' }}
      </label>
      <input v-if="!isMixedPayment"
        v-model.number="paymentAmount"
        type="number" min="0.01" step="0.01"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
        placeholder="0.00"
      />
      <div v-else class="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-base font-bold text-text">
        {{ paymentTotalUSD.toFixed(2) }}
      </div>
    </div>

    <div class="mt-3">
      <label class="mb-1 block text-xs font-medium text-text-muted">Propina</label>
      <input
        v-model.number="paymentTipAmount"
        type="number" min="0" step="0.01"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
        placeholder="0.00"
      />
    </div>

    <div class="mt-3">
      <label class="mb-1 block text-xs font-medium text-text-muted">Notas del cobro</label>
      <textarea
        v-model="paymentNotes"
        placeholder="Notas del cobro (opcional)"
        rows="2"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PaymentEditContext, AppointmentProduct } from '../../types/cita'
import type { PaymentMethod } from '../../types/database'
import { db } from '../../lib/api'
import { useCurrency } from '../../composables/common/useCurrency'

const { formatUSD } = useCurrency()

const paymentContext = ref<PaymentEditContext | null>(null)
const paymentMethod = ref<PaymentMethod>('cash')
const paymentCurrency = ref<'USD' | 'VES'>('USD')
const paymentAmount = ref(0)
const paymentTipAmount = ref(0)
const paymentExchangeRate = ref(1)
const paymentNotes = ref('')
const paymentBreakdown = ref<{ method: PaymentMethod; inputAmount: number; currency: 'USD' | 'VES'; amount: number }[]>([])

const appointmentProducts = ref<AppointmentProduct[]>([])
const appointmentProductsTotal = computed(() =>
  appointmentProducts.value.reduce((s, p) => s + p.quantity * p.unitCost, 0)
)

const isMixedPayment = computed(() => paymentMethod.value === 'mixed')

const paymentTotalUSD = computed(() => {
  if (isMixedPayment.value) {
    return paymentBreakdown.value.reduce((sum, item) => sum + (item.currency === 'VES' ? item.amount : item.inputAmount), 0)
  }
  return paymentCurrency.value === 'VES' ? paymentAmount.value / (paymentExchangeRate.value || 1) : paymentAmount.value
})

const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo ($)' },
  { value: 'cash_ves', label: 'Efectivo (Bs)' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'punto_venta', label: 'Punto de Venta (Bs)' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'other', label: 'Otro' },
]

const setPaymentCurrency = (currency: 'USD' | 'VES') => {
  if (currency === paymentCurrency.value) return
  const rate = paymentExchangeRate.value || 1
  if (currency === 'VES') {
    paymentAmount.value = parseFloat((paymentAmount.value * rate).toFixed(2))
  } else {
    paymentAmount.value = parseFloat((paymentAmount.value / rate).toFixed(2))
  }
  paymentCurrency.value = currency
}

const setPaymentMethod = (method: string) => {
  paymentMethod.value = method as PaymentMethod
  if (method === 'mixed' && paymentBreakdown.value.length === 0) {
    paymentBreakdown.value = [{ method: 'cash' as PaymentMethod, inputAmount: paymentAmount.value, currency: paymentCurrency.value, amount: paymentAmount.value }]
  }
  if (method !== 'mixed') {
    paymentAmount.value = paymentTotalUSD.value
    if (paymentCurrency.value === 'VES') {
      paymentAmount.value = parseFloat((paymentAmount.value * (paymentExchangeRate.value || 1)).toFixed(2))
    }
  }
}

const addPaymentBreakdownItem = () => {
  paymentBreakdown.value = [...paymentBreakdown.value, { method: 'cash' as PaymentMethod, inputAmount: 0, currency: 'USD', amount: 0 }]
}

const removePaymentBreakdownItem = (index: number) => {
  paymentBreakdown.value = paymentBreakdown.value.filter((_, i) => i !== index)
  if (paymentBreakdown.value.length <= 1 && paymentMethod.value === 'mixed') {
    paymentMethod.value = paymentBreakdown.value[0]?.method ?? 'cash'
  }
}

const updatePaymentBreakdownItem = (index: number, field: 'method' | 'amount' | 'currency', value: string | number) => {
  const items = [...paymentBreakdown.value]
  if (field === 'method') {
    items[index] = { ...items[index], method: value as PaymentMethod }
  } else if (field === 'currency') {
    const newCurrency = value as 'USD' | 'VES'
    const oldCurrency = items[index].currency
    if (newCurrency === oldCurrency) return
    const rate = paymentExchangeRate.value || 1
    if (newCurrency === 'VES') {
      items[index] = { ...items[index], currency: newCurrency, inputAmount: parseFloat((items[index].inputAmount * rate).toFixed(2)), amount: items[index].inputAmount }
    } else {
      items[index] = { ...items[index], currency: newCurrency, inputAmount: parseFloat((items[index].inputAmount / rate).toFixed(2)) }
    }
  } else {
    const numValue = value as number
    const itemCurrency = items[index].currency
    if (itemCurrency === 'VES') {
      items[index] = { ...items[index], inputAmount: numValue, amount: parseFloat((numValue / (paymentExchangeRate.value || 1)).toFixed(2)) }
    } else {
      items[index] = { ...items[index], inputAmount: numValue, amount: numValue }
    }
  }
  paymentBreakdown.value = items
}

function setPaymentContext(data: PaymentEditContext | null) {
  if (data) {
    paymentContext.value = data
    const hasMultipleBreakdown = data.breakdown && data.breakdown.length > 1
    paymentMethod.value = hasMultipleBreakdown ? 'mixed' : data.method
    paymentCurrency.value = data.currency
    paymentAmount.value = data.amount
    paymentTipAmount.value = Number(data.tipAmount ?? 0)
    paymentExchangeRate.value = data.exchangeRate
    paymentNotes.value = data.notes || ''
    paymentBreakdown.value = data.breakdown ? data.breakdown.map(b => ({ ...b })) : []
    appointmentProducts.value = []
    if (data.appointmentId) {
      db
        .from('inventory_movements')
        .select('id, product_id, products(name, unit_price), quantity, unit_cost')
        .eq('reference_type', 'appointment')
        .eq('reference_id', data.appointmentId)
        .then(({ data: items }: any) => {
          appointmentProducts.value = (items ?? []).map((m: any) => {
            const price = Number(m.products?.unit_price ?? 0)
            return {
              movementId: m.id,
              productId: m.product_id,
              productName: m.products?.name ?? m.product_id,
              quantity: Math.abs(m.quantity),
              unitCost: price > 0 ? price : Number(m.unit_cost ?? 0),
            }
          })
        })
        .catch(() => { appointmentProducts.value = [] })
    }
  } else {
    paymentContext.value = null
    paymentMethod.value = 'cash'
    paymentCurrency.value = 'USD'
    paymentAmount.value = 0
    paymentTipAmount.value = 0
    paymentExchangeRate.value = 1
    paymentNotes.value = ''
    paymentBreakdown.value = []
  }
}

function getPaymentData(): PaymentEditContext | undefined {
  if (!paymentContext.value) return undefined

  const rate = paymentExchangeRate.value || 1
  const effectiveMethod: PaymentMethod = paymentBreakdown.value.length > 1 ? 'mixed' : paymentMethod.value

  const breakdown = effectiveMethod === 'mixed' && paymentBreakdown.value.length > 0
    ? paymentBreakdown.value.map(item => {
        const itemUsd = item.currency === 'VES'
          ? parseFloat((item.inputAmount / rate).toFixed(2))
          : item.inputAmount
        return {
          method: item.method,
          inputAmount: item.inputAmount,
          currency: item.currency,
          amount: itemUsd,
        }
      })
    : undefined

  const usdTotal = effectiveMethod === 'mixed'
    ? paymentTotalUSD.value
    : (paymentCurrency.value === 'VES'
        ? parseFloat((paymentAmount.value / rate).toFixed(2))
        : paymentAmount.value)

  return {
    transactionId: paymentContext.value.transactionId,
    method: effectiveMethod,
    amount: usdTotal,
    currency: effectiveMethod === 'mixed' ? 'USD' : paymentCurrency.value,
    exchangeRate: rate,
    tipAmount: paymentTipAmount.value,
    notes: paymentNotes.value || undefined,
    breakdown,
  }
}

defineExpose({ setPaymentContext, getPaymentData })
</script>
