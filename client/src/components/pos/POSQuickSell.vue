<template>
  <div class="rounded-xl border border-border bg-surface p-4">
    <div class="flex items-center gap-2 mb-3">
      <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      <h3 class="text-base font-semibold text-text">Venta de productos</h3>
    </div>

    <div class="relative mb-3">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar producto y vender..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <div v-if="!selected" class="space-y-1">
      <div v-if="!search" class="mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5 px-1">
        <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        Productos disponibles
      </div>

      <div class="max-h-40 overflow-y-auto space-y-1">
        <button
          v-for="product in displayedProducts"
          :key="product.id"
          @click="selectProduct(product)"
          :disabled="Number(product.available_qty ?? 0) <= 0"
          class="w-full text-left rounded-lg px-3 py-2 text-sm transition-theme hover:bg-bg-secondary flex items-center justify-between disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div>
            <span class="text-text">{{ product.name }}</span>
            <p class="text-xs text-text-muted">Disponible: {{ Number(product.available_qty ?? 0) }}</p>
          </div>
          <span class="text-text-muted whitespace-nowrap">{{ formatDual(product.unit_price) }}</span>
        </button>
        <div v-if="displayedProducts.length === 0" class="py-4 text-center text-sm text-text-muted">
          {{ search ? 'Sin resultados' : 'No hay productos disponibles para la venta' }}
        </div>
      </div>
    </div>

    <div v-else class="space-y-3 rounded-lg bg-bg-secondary p-3">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted">Resumen de cobro</h4>
      <div class="flex items-center justify-between text-sm">
        <div>
          <p class="text-sm font-medium text-text">{{ selected.name }}</p>
          <p class="text-xs text-text-muted">Stock disponible: {{ selected.available_qty ?? 0 }}</p>
        </div>
        <button
          @click="cancelSelection"
          class="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-theme"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex-1">
          <label class="block text-xs font-medium text-text-muted mb-1">Cantidad</label>
          <input
            v-model.number="quantity"
            type="number" min="1"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium text-text-muted mb-1">Precio unitario ($)</label>
          <input
            v-model.number="unitPrice"
            type="number" min="0" step="0.01"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>
      </div>

      <div class="border-t border-border-subtle pt-3 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-text-muted">Producto</span>
          <span class="font-medium text-text">{{ formatDual(total) }}</span>
        </div>
        <div class="flex items-center justify-between border-t border-border pt-2">
          <span class="text-base font-bold text-text">Total</span>
          <span class="text-lg font-bold text-primary">{{ formatDual(total) }}</span>
        </div>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-medium text-text">Método de pago</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="pm in paymentMethods"
            :key="pm.value"
            @click="selectMethod(pm.value)"
            :class="[
              'rounded-lg border p-2 text-sm font-medium transition-theme text-center relative',
              paymentMethod === pm.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-secondary hover:bg-bg-secondary'
            ]"
          >
            {{ pm.label }}
            <span
              v-if="pm.currency"
              class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              :class="pm.currency === 'USD' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
            >{{ pm.currency === 'USD' ? '$' : 'Bs' }}</span>
          </button>
        </div>
      </div>

      <div v-if="paymentMethod === 'other'" class="space-y-2">
        <label class="block text-sm font-medium text-text">Moneda</label>
        <div class="flex rounded-lg border border-border bg-bg-secondary/50 p-0.5">
          <button
            @click="otherCurrency = 'USD'"
            class="flex-1 rounded-md py-1.5 text-xs font-medium transition-theme"
            :class="otherCurrency === 'USD' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'"
          >USD ($)</button>
          <button
            @click="otherCurrency = 'VES'"
            class="flex-1 rounded-md py-1.5 text-xs font-medium transition-theme"
            :class="otherCurrency === 'VES' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'"
          >VES (Bs)</button>
        </div>
      </div>

      <div v-if="paymentMethod === 'mixed'" class="space-y-2 border-t border-border-subtle pt-3">
        <label class="block text-sm font-medium text-text">Distribución del pago</label>
        <div v-for="(split, idx) in paymentsBreakdown" :key="idx" class="flex items-center gap-2">
          <select
            v-model="split.method"
            class="flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none focus:border-primary"
          >
            <option v-for="m in mixedMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <select
            v-model="split.currency"
            class="w-16 rounded-lg border border-border bg-surface px-1 py-2 text-xs text-text outline-none focus:border-primary"
          >
            <option value="USD">USD</option>
            <option value="VES">Bs</option>
          </select>
          <div class="relative flex-1">
            <input
              v-model.number="split.inputAmount"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none placeholder:text-text-muted focus:border-primary"
            />
          </div>
          <button
            v-if="paymentsBreakdown.length > 1"
            @click="removeSplit(idx)"
            class="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex items-center justify-between text-xs">
          <button @click="addSplit" class="text-primary hover:text-primary-hover transition-theme font-medium">
            + Agregar método
          </button>
          <span :class="splitRemaining === 0 ? 'text-success' : 'text-warning'">
            Restante: {{ formatDual(splitRemaining) }}
          </span>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">Notas</label>
        <textarea
          v-model="notes"
          rows="2"
          placeholder="Notas del pago (opcional)"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
        ></textarea>
      </div>

      <button
        @click="handleSell"
        :disabled="isSaving || !canSell"
        class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-text-inverse transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        <svg v-if="isSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {{ isSaving ? 'Procesando...' : `Cobrar ${formatDual(total)}` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useCurrency } from '../../composables/common/useCurrency'
import { useNotification } from '../../composables/common/useNotification'
import { posKeys } from '../../services/posService'
import { sellProduct, inventarioKeys } from '../../services/inventarioService'
import { useBusinessStore } from '../../store/business'
import type { PaymentMethod } from '../../types/database'
import type { PaymentBreakdownItem } from '../../types/pos'

const props = defineProps<{
  products: any[]
  businessId: string
}>()

const { formatDual, exchangeRate } = useCurrency()
const { success, error: showError } = useNotification()
const queryClient = useQueryClient()
const businessStore = useBusinessStore()
const branchId = computed(() => businessStore.currentBranchId)

const search = ref('')
const selected = ref<any>(null)
const quantity = ref(1)
const unitPrice = ref(0)
const notes = ref('')
const paymentMethod = ref<PaymentMethod>('cash')
const otherCurrency = ref<'USD' | 'VES'>('USD')
const paymentsBreakdown = ref<PaymentBreakdownItem[]>([])

const paymentMethods = [
  { label: 'Efectivo ($)', value: 'cash' as PaymentMethod, currency: 'USD' as const },
  { label: 'Efectivo (Bs)', value: 'cash_ves' as PaymentMethod, currency: 'VES' as const },
  { label: 'Tarjeta', value: 'card' as PaymentMethod, currency: 'USD' as const },
  { label: 'Transferencia', value: 'transfer' as PaymentMethod, currency: 'VES' as const },
  { label: 'Zelle', value: 'zelle' as PaymentMethod, currency: 'USD' as const },
  { label: 'Pago Móvil', value: 'pago_movil' as PaymentMethod, currency: 'VES' as const },
  { label: 'Mixto', value: 'mixed' as PaymentMethod, currency: null as null },
  { label: 'Otro', value: 'other' as PaymentMethod, currency: null as null },
]

const mixedMethods = paymentMethods.filter(m => m.value !== 'mixed')

const displayedProducts = computed(() => {
  if (!search.value) {
    const withStock = props.products.filter((p: any) => Number(p.available_qty ?? 0) > 0)
    if (withStock.length > 0) {
      return withStock.slice(0, 8)
    }
    return props.products.slice(0, 8)
  }
  const q = search.value.toLowerCase()
  return props.products.filter((p: any) =>
    p.name.toLowerCase().includes(q)
  ).slice(0, 8)
})

const total = computed(() =>
  quantity.value > 0 && unitPrice.value > 0 ? quantity.value * unitPrice.value : 0
)

const splitRemaining = computed(() => {
  if (paymentMethod.value !== 'mixed') return 0
  const paid = paymentsBreakdown.value.reduce((sum, split) => {
    const usd = split.currency === 'VES'
      ? (split.inputAmount || 0) / exchangeRate.value
      : (split.inputAmount || 0)
    return sum + usd
  }, 0)
  return Math.max(0, total.value - paid)
})

const canSell = computed(() => {
  if (!selected.value || total.value <= 0) return false
  if (quantity.value > Number(selected.value.available_qty ?? 0)) return false
  if (paymentMethod.value !== 'mixed') return true

  if (paymentsBreakdown.value.length === 0) return false
  const paid = paymentsBreakdown.value.reduce((sum, split) => {
    const usd = split.currency === 'VES'
      ? (split.inputAmount || 0) / exchangeRate.value
      : (split.inputAmount || 0)
    return sum + usd
  }, 0)
  return Math.abs(paid - total.value) < 0.01
})

const saleCurrency = computed<'USD' | 'VES'>(() => {
  if (paymentMethod.value === 'mixed' && paymentsBreakdown.value.length > 0) {
    return paymentsBreakdown.value[0].currency
  }
  if (paymentMethod.value === 'other') return otherCurrency.value
  const pmDef = paymentMethods.find(m => m.value === paymentMethod.value)
  return pmDef?.currency ?? 'USD'
})

const sellMutation = useMutation({
  mutationFn: () =>
    sellProduct(
      props.businessId, selected.value!.id, quantity.value, notes.value,
      null, unitPrice.value, exchangeRate.value, saleCurrency.value,
      branchId.value,
    ),
  onSuccess: () => {
    Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: inventarioKeys.all(props.businessId, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: inventarioKeys.movements(props.businessId, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: posKeys.products(props.businessId, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: ['finanzas-product-sales'] }),
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finanzas-transactions'] }),
    ])
    success('Venta registrada correctamente')
    cancelSelection()
  },
  onError: (err) => {
    showError((err as any)?.message ?? 'Error al registrar la venta')
  },
})

const isSaving = sellMutation.isPending

const selectMethod = (method: PaymentMethod) => {
  paymentMethod.value = method
  if (method === 'mixed') {
    paymentsBreakdown.value = [{ method: 'cash', inputAmount: 0, currency: 'USD', amount: 0 }]
  } else {
    paymentsBreakdown.value = []
  }
}

const addSplit = () => {
  paymentsBreakdown.value.push({ method: 'cash', inputAmount: 0, currency: 'USD', amount: 0 })
}

const removeSplit = (idx: number) => {
  paymentsBreakdown.value.splice(idx, 1)
}

const selectProduct = (product: any) => {
  selected.value = product
  quantity.value = 1
  unitPrice.value = Number(product.unit_price)
  notes.value = ''
  search.value = ''
}

const cancelSelection = () => {
  selected.value = null
  quantity.value = 1
  unitPrice.value = 0
  notes.value = ''
  paymentMethod.value = 'cash'
  otherCurrency.value = 'USD'
  paymentsBreakdown.value = []
}

const handleSell = () => {
  if (!canSell.value) return
  if (quantity.value > Number(selected.value.available_qty ?? 0)) {
    showError('La cantidad supera el stock disponible')
    return
  }
  sellMutation.mutate()
}
</script>
