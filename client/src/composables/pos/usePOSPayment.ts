import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { recordSale, recordDirectSale, recordDirectServiceSale, posKeys } from '../../services/posService'
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
  const selectedGiftCardId = ref<string | null>(null)

  const paymentMethods = computed(() => {
    const methods = [
      { label: 'Efectivo ($)', value: 'cash' as PaymentMethod, currency: 'USD' as const },
      { label: 'Efectivo (Bs)', value: 'cash_ves' as PaymentMethod, currency: 'VES' as const },
      { label: 'Tarjeta', value: 'card' as PaymentMethod, currency: 'USD' as const },
      { label: 'Transferencia', value: 'transfer' as PaymentMethod, currency: 'VES' as const },
      { label: 'Zelle', value: 'zelle' as PaymentMethod, currency: 'USD' as const },
      { label: 'Binance', value: 'binance' as PaymentMethod, currency: 'USD' as const },
      { label: 'Cashea', value: 'cashea' as PaymentMethod, currency: 'USD' as const },
      { label: 'Pago Móvil', value: 'pago_movil' as PaymentMethod, currency: 'VES' as const },
    ]
    
    if (businessStore.features.gift_cards) {
      methods.push({ label: 'Gift Card', value: 'gift_card' as PaymentMethod, currency: 'USD' as const })
    }
    
    if (businessStore.nicheType !== 'staffing') {
      methods.push({ label: 'Crédito', value: 'credito' as PaymentMethod, currency: 'USD' as const })
    }
    
    methods.push(
      { label: 'Mixto', value: 'mixed' as PaymentMethod, currency: null as null },
      { label: 'Punto de Vta (Bs)', value: 'punto_venta' as PaymentMethod, currency: 'VES' as const },
      { label: 'Otro', value: 'other' as PaymentMethod, currency: null as null }
    )
    
    return methods
  })

  const mixedMethods = computed(() => paymentMethods.value.filter(m => m.value !== 'mixed'))

  const methodCurrency = (method: PaymentMethod): 'USD' | 'VES' | null => {
    return paymentMethods.value.find(m => m.value === method)?.currency ?? null
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
    selectedGiftCardId.value = null
  }

  const invalidateQueries = async () => {
    const bid = businessId.value
    const brId = branchId.value
    await Promise.allSettled([
      queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(bid, brId) }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['productos'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['products'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['supplier-payments'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['gift-cards'] }),
    ])
    await Promise.allSettled([
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['gift-cards'] }),
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
      clientNameInput?: string | null
      clientPhoneInput?: string | null
    }) => recordDirectSale({
      totalAmount: params.totalAmount,
      method: params.method,
      products: params.products,
      notes: params.notes,
      exchangeRate: params.exchangeRate,
      paymentsBreakdown: params.paymentsBreakdown,
      clientId: params.clientId || null,
      clientNameInput: params.clientNameInput || null,
      clientPhoneInput: params.clientPhoneInput || null,
      businessId: businessId.value!,
      branchId: branchId.value || null,
    }),
    onSuccess: () => {
      success('Venta directa registrada correctamente')
      invalidateQueries()
    },
    onError: (err) => {
      showError((err as any)?.message ?? 'Error al registrar venta directa')
    },
  })

  const directServiceSaleMutation = useMutation({
    mutationFn: (params: {
      services?: Array<{
        serviceId: string
        employeeId: string
        assistantEmployeeId?: string | null
        price: number
      }>
      serviceId?: string
      employeeId?: string
      assistantEmployeeId?: string | null
      clientId?: string | null
      serviceAmount?: number
      productsAmount?: number
      method: PaymentMethod
      products: POSProductItem[]
      notes: string
      exchangeRate: number
      paymentsBreakdown: PaymentBreakdownItem[]
      tipAmount?: number
    }) => recordDirectServiceSale({
      services: params.services,
      serviceId: params.serviceId,
      employeeId: params.employeeId,
      assistantEmployeeId: params.assistantEmployeeId,
      clientId: params.clientId,
      serviceAmount: params.serviceAmount,
      productsAmount: params.productsAmount,
      method: params.method,
      products: params.products,
      notes: params.notes,
      exchangeRate: params.exchangeRate,
      paymentsBreakdown: params.paymentsBreakdown,
      businessId: businessId.value!,
      branchId: branchId.value,
      tipAmount: params.tipAmount,
    }),
    onSuccess: () => {
      success('Cobro de servicio directo registrado correctamente')
      invalidateQueries()
    },
    onError: (err) => {
      showError((err as any)?.message ?? 'Error al registrar servicio directo')
    },
  })

  const isProcessing = computed(() =>
    recordSaleMutation.isPending.value || directSaleMutation.isPending.value || directServiceSaleMutation.isPending.value
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
    const pMethodObj = paymentMethods.value.find(m => m.value === method)
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
            gift_card_id: method === 'gift_card' ? selectedGiftCardId.value : undefined,
            giftCardId: method === 'gift_card' ? selectedGiftCardId.value : undefined,
          }]
        } else {
          const grand = params.serviceAmount + productsTotal + tipAmount.value || 1
          memberBreakdown = breakdownSource.map((item) => ({
            ...item,
            inputAmount: Number(((memberAmount / grand) * item.inputAmount).toFixed(2)),
            amount: Number(((memberAmount / grand) * item.amount).toFixed(2)),
            gift_card_id: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
            giftCardId: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
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
          gift_card_id: method === 'gift_card' ? selectedGiftCardId.value : undefined,
          giftCardId: method === 'gift_card' ? selectedGiftCardId.value : undefined,
        }]
      } else {
        breakdown = breakdownSource.map(item => ({
          ...item,
          gift_card_id: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
          giftCardId: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
        }))
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
    clientNameInput?: string | null
    clientPhoneInput?: string | null
  }): Promise<boolean> => {
    const method = paymentMethod.value
    const notes = paymentNotes.value
    const pMethodObj = paymentMethods.value.find(m => m.value === method)
    const paymentCurrency = pMethodObj?.currency ?? otherCurrency.value

    let breakdown: PaymentBreakdownItem[]
    if (method !== 'mixed') {
      breakdown = [{
        method,
        inputAmount: paymentCurrency === 'VES' ? params.totalAmount * params.exchangeRate : params.totalAmount,
        currency: paymentCurrency as 'USD' | 'VES',
        amount: params.totalAmount,
        gift_card_id: method === 'gift_card' ? selectedGiftCardId.value : undefined,
        giftCardId: method === 'gift_card' ? selectedGiftCardId.value : undefined,
      }]
    } else {
      breakdown = paymentsBreakdown.value.map(item => ({
        ...item,
        gift_card_id: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
        giftCardId: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
      }))
    }

    try {
      await directSaleMutation.mutateAsync({
        totalAmount: params.totalAmount,
        method: method as PaymentMethod,
        products: params.products,
        notes,
        exchangeRate: params.exchangeRate,
        paymentsBreakdown: breakdown,
        clientId: params.clientId || null,
        clientNameInput: params.clientNameInput || null,
        clientPhoneInput: params.clientPhoneInput || null,
      })
      reset()
      return true
    } catch (err) {
      console.error('[POS Checkout Error]', err)
      return false
    }
  }

  const processDirectServiceSale = async (params: {
    services?: Array<{
      serviceId: string
      employeeId: string
      assistantEmployeeId?: string | null
      price: number
    }>
    serviceId?: string
    employeeId?: string
    assistantEmployeeId?: string | null
    clientId?: string | null
    serviceAmount: number
    productsAmount?: number
    products: POSProductItem[]
    exchangeRate: number
    tipAmount?: number
  }): Promise<boolean> => {
    const method = paymentMethod.value
    const notes = paymentNotes.value
    const pMethodObj = paymentMethods.value.find(m => m.value === method)
    const paymentCurrency = pMethodObj?.currency ?? otherCurrency.value
    const totalAmount = params.serviceAmount + (params.productsAmount ?? 0)

    let breakdown: PaymentBreakdownItem[]
    if (method !== 'mixed') {
      breakdown = [{
        method,
        inputAmount: paymentCurrency === 'VES' ? totalAmount * params.exchangeRate : totalAmount,
        currency: paymentCurrency as 'USD' | 'VES',
        amount: totalAmount,
        gift_card_id: method === 'gift_card' ? selectedGiftCardId.value : undefined,
        giftCardId: method === 'gift_card' ? selectedGiftCardId.value : undefined,
      }]
    } else {
      breakdown = paymentsBreakdown.value.map(item => ({
        ...item,
        gift_card_id: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
        giftCardId: item.method === 'gift_card' ? (item.gift_card_id || selectedGiftCardId.value) : undefined,
      }))
    }

    try {
      await directServiceSaleMutation.mutateAsync({
        services: params.services,
        serviceId: params.serviceId,
        employeeId: params.employeeId,
        assistantEmployeeId: params.assistantEmployeeId,
        clientId: params.clientId,
        serviceAmount: params.serviceAmount,
        productsAmount: params.productsAmount ?? 0,
        method: method as PaymentMethod,
        products: params.products,
        notes,
        exchangeRate: params.exchangeRate,
        paymentsBreakdown: breakdown,
        tipAmount: params.tipAmount,
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
    processDirectServiceSale,
    reset,
    selectedGiftCardId,
  }
}
