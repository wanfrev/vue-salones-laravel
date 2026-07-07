import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { recordSale, posKeys } from '../../services/posService'
import type { PaymentMethod } from '../../types/database'
import type { POSProductItem, PaymentBreakdownItem, TipAllocationItem } from '../../types/pos'

function withTipAllocations(breakdown: PaymentBreakdownItem[], tipAllocations?: TipAllocationItem[]): PaymentBreakdownItem[] {
  if (!tipAllocations || tipAllocations.length === 0 || breakdown.length === 0) return breakdown
  const [first, ...rest] = breakdown
  return [{ ...(first as any), tip_allocations: tipAllocations } as PaymentBreakdownItem, ...rest]
}

export function usePOSPayment() {
  const { authStore } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const paymentMethod = ref<PaymentMethod>('cash')
  const otherCurrency = ref<'USD' | 'VES'>('USD')
  const paymentNotes = ref('')
  const tipAmount = ref(0)
  const isProcessing = ref(false)
  const paymentsBreakdown = ref<PaymentBreakdownItem[]>([])

  const paymentMethods = [
    { label: 'Efectivo ($)', value: 'cash' as PaymentMethod, currency: 'USD' as const },
    { label: 'Efectivo (Bs)', value: 'cash_ves' as PaymentMethod, currency: 'VES' as const },
    { label: 'Tarjeta', value: 'card' as PaymentMethod, currency: 'USD' as const },
    { label: 'Transferencia', value: 'transfer' as PaymentMethod, currency: 'VES' as const },
    { label: 'Zelle', value: 'zelle' as PaymentMethod, currency: 'USD' as const },
    { label: 'Pago Móvil', value: 'pago_movil' as PaymentMethod, currency: 'VES' as const },
    { label: 'Mixto', value: 'mixed' as PaymentMethod, currency: null as null },
    { label: 'Punto de Vta (Bs)', value: 'punto_venta' as PaymentMethod, currency: 'VES' as const },
    { label: 'Otro', value: 'other' as PaymentMethod, currency: null as null },
  ]

  const methodCurrency = (method: PaymentMethod): 'USD' | 'VES' | null => {
    return paymentMethods.find(m => m.value === method)?.currency ?? null
  }

  const mixedMethods = paymentMethods.filter(m => m.value !== 'mixed')

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

  const recordMutation = useMutation({
    mutationFn: (params: {
      appointmentId: string
      amount: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      tipAmount?: number
    }) => recordSale({ ...params, businessId: businessId.value!, branchId: branchId.value }),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['servicios'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['employee-earnings'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['employee-history'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary'] }),
      ])
    },
  })

  const processPayment = async (
    appointmentId: string,
    grandTotal: number,
    products: POSProductItem[],
    exchangeRate: number,
    formatDual: (n: number) => string,
    tipAllocations?: TipAllocationItem[],
  ) => {
    if (grandTotal <= 0) {
      showError('El total debe ser mayor a 0')
      return false
    }

    isProcessing.value = true
    try {
      let breakdown = paymentsBreakdown.value
      if (paymentMethod.value !== 'mixed') {
        const currency = methodCurrency(paymentMethod.value) ?? otherCurrency.value
        const inputAmount = currency === 'VES' ? grandTotal * exchangeRate : grandTotal
        breakdown = [{ method: paymentMethod.value, inputAmount, currency, amount: grandTotal }]
      } else {
        breakdown = breakdown.map(item => ({
          ...item,
          amount: item.currency === 'VES' ? item.inputAmount / exchangeRate : item.inputAmount,
        }))
      }

      await recordMutation.mutateAsync({
        appointmentId,
        amount: grandTotal - tipAmount.value,
        method: paymentMethod.value,
        products,
        notes: paymentNotes.value,
        exchangeRate,
        paymentsBreakdown: withTipAllocations(breakdown, tipAllocations),
        tipAmount: tipAmount.value,
      })

      success(`Cobro de ${formatDual(grandTotal)} registrado correctamente`)
      return true
    } catch (err) {
      const message = (err as any)?.message ?? (err as any)?.error_description ?? (typeof err === 'string' ? err : 'Error al procesar el pago')
      showError(message)
      console.error('[processPayment]', err)
      return false
    } finally {
      isProcessing.value = false
    }
  }

  const reset = () => {
    paymentMethod.value = 'cash'
    otherCurrency.value = 'USD'
    paymentNotes.value = ''
    tipAmount.value = 0
    paymentsBreakdown.value = []
  }

  return {
    paymentMethod,
    otherCurrency,
    paymentNotes,
    tipAmount,
    isProcessing,
    paymentsBreakdown,
    paymentMethods,
    mixedMethods,
    selectMethod,
    addSplit,
    removeSplit,
    processPayment,
    reset,
  }
}
