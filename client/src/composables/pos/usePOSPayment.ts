import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { recordSale, recordDirectSale, posKeys } from '../../services/posService'
import type { PaymentMethod } from '../../types/database'
import type { POSProductItem, PaymentBreakdownItem, TipAllocationItem } from '../../types/pos'

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

  const mixedMethods = paymentMethods.filter(m => m.value !== 'mixed')

  const methodCurrency = (method: PaymentMethod): 'USD' | 'VES' | null => {
    return paymentMethods.find(m => m.value === method)?.currency ?? null
  }

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
      serviceAmount: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      tipAmount?: number
    }) => recordSale({
      appointmentId: params.appointmentId,
      serviceAmount: params.serviceAmount,
      method: params.method,
      products: params.products,
      notes: params.notes,
      exchangeRate: params.exchangeRate,
      paymentsBreakdown: params.paymentsBreakdown,
      tipAmount: params.tipAmount,
      businessId: businessId.value!,
      branchId: branchId.value,
    }),
    onMutate: async ({ appointmentId }) => {
      await queryClient.cancelQueries({ queryKey: ['pos-pending'] })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['pos-pending'] })
      for (const [key, data] of previousQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, data.filter((appt: any) => {
            if (appt.isGroup && Array.isArray(appt.groupIds)) {
              return !appt.groupIds.includes(appointmentId)
            }
            return appt.id !== appointmentId
          }))
        }
      }
      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      ])
    },
  })

  const directSaleMutation = useMutation({
    mutationFn: (params: {
      totalAmount: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      clientId?: string | null
    }) => recordDirectSale({
      totalAmount: params.totalAmount,
      method: params.method,
      products: params.products,
      notes: params.notes,
      exchangeRate: params.exchangeRate,
      paymentsBreakdown: params.paymentsBreakdown,
      clientId: params.clientId,
      businessId: businessId.value!,
      branchId: branchId.value,
    }),
    onSettled: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
      ])
    },
  })

  const processPayment = async (
    appointmentId: string,
    serviceAmount: number,
    cartProducts: POSProductItem[],
    exchangeRate: number,
    formatDual: (n: number) => string,
    _tipAllocations?: TipAllocationItem[],
  ): Promise<boolean> => {
    if (serviceAmount + cartProducts.reduce((s, p) => s + p.quantity * p.unitPrice, 0) <= 0) {
      showError('El total debe ser mayor a 0')
      return false
    }

    isProcessing.value = true
    try {
      const method = paymentMethod.value
      let breakdown: PaymentBreakdownItem[]

      if (method !== 'mixed') {
        const currency = methodCurrency(method) ?? otherCurrency.value
        const grandTotal = serviceAmount + cartProducts.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
        const inputAmount = currency === 'VES' ? grandTotal * exchangeRate : grandTotal
        breakdown = [{ method, inputAmount, currency, amount: grandTotal }]
      } else {
        breakdown = paymentsBreakdown.value.map(item => ({
          ...item,
          amount: item.currency === 'VES' ? item.inputAmount / exchangeRate : item.inputAmount,
        }))
      }

      await recordMutation.mutateAsync({
        appointmentId,
        serviceAmount,
        method,
        products: cartProducts,
        notes: paymentNotes.value,
        exchangeRate,
        paymentsBreakdown: breakdown,
        tipAmount: tipAmount.value,
      })

      success(`Cobro de ${formatDual(serviceAmount + cartProducts.reduce((s, p) => s + p.unitPrice * p.quantity, 0))} registrado`)
      return true
    } catch (err) {
      const message = (err as any)?.message ?? 'Error al procesar el pago'
      showError(message)
      console.error('[processPayment]', err)
      return false
    } finally {
      isProcessing.value = false
    }
  }

  const processDirectSale = async (
    totalAmount: number,
    cartProducts: POSProductItem[],
    exchangeRate: number,
    formatDual: (n: number) => string,
    clientId?: string | null,
  ): Promise<boolean> => {
    if (totalAmount <= 0) {
      showError('El total debe ser mayor a 0')
      return false
    }

    isProcessing.value = true
    try {
      const method = paymentMethod.value
      let breakdown: PaymentBreakdownItem[]

      if (method !== 'mixed') {
        const currency = methodCurrency(method) ?? otherCurrency.value
        const inputAmount = currency === 'VES' ? totalAmount * exchangeRate : totalAmount
        breakdown = [{ method, inputAmount, currency, amount: totalAmount }]
      } else {
        breakdown = paymentsBreakdown.value.map(item => ({
          ...item,
          amount: item.currency === 'VES' ? item.inputAmount / exchangeRate : item.inputAmount,
        }))
      }

      await directSaleMutation.mutateAsync({
        totalAmount,
        method,
        products: cartProducts,
        notes: paymentNotes.value,
        exchangeRate,
        paymentsBreakdown: breakdown,
        clientId: clientId ?? null,
      })

      success(`Venta directa de ${formatDual(totalAmount)} registrada`)
      return true
    } catch (err) {
      const message = (err as any)?.message ?? 'Error al procesar la venta directa'
      showError(message)
      console.error('[processDirectSale]', err)
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
    processDirectSale,
    reset,
  }
}
