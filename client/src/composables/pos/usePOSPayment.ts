import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { recordSale, recordDirectSale, posKeys } from '../../services/posService'
import type { PaymentMethod } from '../../types/database'
import type { POSProductItem, PaymentBreakdownItem } from '../../types/pos'

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

  const reset = () => {
    paymentMethod.value = 'cash'
    otherCurrency.value = 'USD'
    paymentNotes.value = ''
    tipAmount.value = 0
    paymentsBreakdown.value = []
  }

  const invalidateQueries = async () => {
    const bid = businessId.value
    const brId = branchId.value
    await Promise.allSettled([
      queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(bid, brId) }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['supplier-payments'] }),
    ])
    await Promise.allSettled([
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
    ])
  }

  const recordSaleMutation = useMutation({
    mutationFn: async (payloads: Array<{
      appointmentId: string
      serviceAmount: number
      productsAmount: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      tipAmount?: number
    }>) => {
      const results = []
      for (const p of payloads) {
        const res = await recordSale({
          appointmentId: p.appointmentId,
          serviceAmount: p.serviceAmount,
          productsAmount: p.productsAmount,
          method: p.method,
          products: p.products,
          notes: p.notes,
          exchangeRate: p.exchangeRate,
          paymentsBreakdown: p.paymentsBreakdown,
          tipAmount: p.tipAmount,
          businessId: businessId.value!,
          branchId: branchId.value,
        })
        results.push(res)
      }
      return results
    },
    onMutate: async (payloads) => {
      await queryClient.cancelQueries({ queryKey: ['pos-pending'], exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['pos-pending'], exact: false })
      const targetIds = new Set(payloads.map(p => p.appointmentId))

      for (const [key, oldData] of previousQueries) {
        if (Array.isArray(oldData)) {
          queryClient.setQueryData(key, oldData.filter((appt: any) => {
            if (appt.isGroup && Array.isArray(appt.groupIds)) {
              return !appt.groupIds.some((gid: string) => targetIds.has(gid))
            }
            return !targetIds.has(appt.id)
          }))
        }
      }
      return { previousQueries }
    },
    onSuccess: () => {
      success('Cobro registrado correctamente')
      invalidateQueries()
    },
    onError: (err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      showError((err as any)?.message ?? 'Error al procesar el pago')
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
    onSuccess: () => {
      success('Venta directa registrada correctamente')
      invalidateQueries()
    },
    onError: (err) => {
      showError((err as any)?.message ?? 'Error al registrar venta directa')
    },
  })

  const isProcessing = computed(() =>
    recordSaleMutation.isPending.value || directSaleMutation.isPending.value
  )

  const processPayment = async (params: {
    appointmentId: string
    serviceAmount: number
    products: POSProductItem[]
    exchangeRate: number
    tipAmount: number
    productsAmount: number
    isGroup?: boolean
    groupIds?: string[]
    members?: any[]
    groupPrice?: number
    tipAllocations?: Record<string, number>
  }): Promise<boolean> => {
    const { isGroup, groupIds, members, groupPrice, tipAllocations } = params
    const method = paymentMethod.value
    const notes = paymentNotes.value
    const exchangeRt = params.exchangeRate
    const breakdownSource = paymentsBreakdown.value
    const pMethodObj = paymentMethods.find(m => m.value === method)
    const paymentCurrency = pMethodObj?.currency ?? otherCurrency.value

    let payloads: Array<{
      appointmentId: string
      serviceAmount: number
      productsAmount: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      tipAmount?: number
    }> = []

    if (isGroup && groupIds && groupIds.length > 1 && members && groupPrice) {
      let remainingService = params.serviceAmount
      const productsTotal = params.productsAmount

      for (let i = 0; i < groupIds.length; i++) {
        const isLast = i === groupIds.length - 1
        const proportion = members[i].price / groupPrice
        const serviceShare = isLast
          ? Math.max(0, Math.round(remainingService * 100) / 100)
          : Math.round(params.serviceAmount * proportion * 100) / 100

        if (!isLast) remainingService -= serviceShare

        const memberAmount = i === 0 ? serviceShare + productsTotal : serviceShare
        const productsForThis = i === 0 ? productsTotal : 0
        const employeeId = members[i]?.employeeId
        const fullTip = employeeId ? (tipAllocations?.[employeeId] ?? 0) : 0
        const memberServices = members.filter((m: any) => m.employeeId === employeeId).length
        const memberTip = Number((memberServices > 0 ? fullTip / memberServices : 0).toFixed(2))

        let memberBreakdown: PaymentBreakdownItem[]
        if (method !== 'mixed') {
          memberBreakdown = [{
            method,
            inputAmount: paymentCurrency === 'VES' ? memberAmount * exchangeRt : memberAmount,
            currency: paymentCurrency as 'USD' | 'VES',
            amount: memberAmount,
          }]
        } else {
          const grand = params.serviceAmount + productsTotal + tipAmount.value || 1
          memberBreakdown = breakdownSource.map((item) => ({
            ...item,
            inputAmount: Number(((memberAmount / grand) * item.inputAmount).toFixed(2)),
            amount: Number(((memberAmount / grand) * item.amount).toFixed(2)),
          }))
        }

        payloads.push({
          appointmentId: groupIds[i],
          serviceAmount: i === 0 ? serviceShare : memberAmount,
          productsAmount: productsForThis,
          method: method as PaymentMethod,
          products: i === 0 ? params.products : [],
          notes,
          exchangeRate: exchangeRt,
          paymentsBreakdown: memberBreakdown,
          tipAmount: memberTip,
        })
      }
    } else {
      const totalAmount = params.serviceAmount + params.productsAmount
      let breakdown: PaymentBreakdownItem[]

      if (method !== 'mixed') {
        breakdown = [{
          method,
          inputAmount: paymentCurrency === 'VES' ? totalAmount * exchangeRt : totalAmount,
          currency: paymentCurrency as 'USD' | 'VES',
          amount: totalAmount,
        }]
      } else {
        breakdown = [...breakdownSource]
      }

      payloads.push({
        appointmentId: params.appointmentId,
        serviceAmount: params.serviceAmount,
        productsAmount: params.productsAmount,
        method: method as PaymentMethod,
        products: params.products,
        notes,
        exchangeRate: exchangeRt,
        paymentsBreakdown: breakdown,
        tipAmount: params.tipAmount,
      })
    }

    try {
      await recordSaleMutation.mutateAsync(payloads)
      reset()
      return true
    } catch {
      return false
    }
  }

  const processDirectSale = async (params: {
    totalAmount: number
    products: POSProductItem[]
    exchangeRate: number
    clientId?: string | null
  }): Promise<boolean> => {
    const method = paymentMethod.value
    const notes = paymentNotes.value
    const pMethodObj = paymentMethods.find(m => m.value === method)
    const paymentCurrency = pMethodObj?.currency ?? otherCurrency.value

    let breakdown: PaymentBreakdownItem[]
    if (method !== 'mixed') {
      breakdown = [{
        method,
        inputAmount: paymentCurrency === 'VES' ? params.totalAmount * params.exchangeRate : params.totalAmount,
        currency: paymentCurrency as 'USD' | 'VES',
        amount: params.totalAmount,
      }]
    } else {
      breakdown = [...paymentsBreakdown.value]
    }

    try {
      await directSaleMutation.mutateAsync({
        totalAmount: params.totalAmount,
        method: method as PaymentMethod,
        products: params.products,
        notes,
        exchangeRate: params.exchangeRate,
        paymentsBreakdown: breakdown,
        clientId: params.clientId ?? null,
      })
      reset()
      return true
    } catch {
      return false
    }
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
