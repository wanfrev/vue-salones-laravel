import { computed, ref } from 'vue'
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { apiRequest } from '../../lib/api'
import { useBusinessStore } from '../../store/business'
import { translateError } from '../../lib/errors'
import { toYmd, resolvePeriod } from '../../lib/periodUtils'
import { formatMethod, formatDate } from '../../lib/formatters'
import { useCurrency } from '../common/useCurrency'
import type { PaymentBreakdownItem } from '../../types/pos'
import type { PaymentMethod } from '../../types/database'

export type UnifiedTransaction = {
  id: string
  date: string
  description: string
  method: string
  amount: number
  type: 'ingreso' | 'nomina' | 'gasto'
  exchangeRateUsed?: number
  breakdownLabel?: string
  source: string
  sourceLabel: string
  _currency?: 'USD' | 'VES'
  _originalAmount?: number
  notes?: string | null
  tipAmount?: number
}

export type TransactionRow = {
  id: string
  appointmentId: string | null
  date: string
  client: string
  employee: string
  service: string
  method: string
  rawMethod: PaymentMethod
  amount: number
  exchangeRateUsed: number
  breakdownLabel: string
  breakdown: PaymentBreakdownItem[] | null
  primaryCurrency: 'USD' | 'VES'
  primaryAmount: number
  notes?: string | null
  tipAmount?: number
}

export type ProductSaleDetail = {
  id: string
  date: string
  product: string
  clientName?: string
  quantity: number
  unitPrice: number
  total: number
  currency: 'USD' | 'VES'
  exchangeRateUsed: number
  originalAmount: number
  isAppointmentSale: boolean
}

export type PaymentRow = {
  id: string
  employee: string
  client: string
  service: string
  amount: number
  percentage: number
  earnings: number
  tipAmount: number
}

export type ServiceRevenue = { name: string; amount: number; percentage: number }
export type ChartBar = { label: string; income: number; expense: number }

function formatBreakdownLabel(breakdown: PaymentBreakdownItem[] | null | undefined): string {
  if (!breakdown || !Array.isArray(breakdown) || breakdown.length <= 1) return ''
  return breakdown
    .map((p) => {
      const methodLabel = formatMethod(p.method)
      const amt = p.currency === 'VES'
        ? `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.inputAmount)} Bs`
        : `$${p.inputAmount.toFixed(2)}`
      return `${methodLabel} ${amt}`
    })
    .join(' / ')
}

function sumVESBreakdown(breakdown: PaymentBreakdownItem[] | null | undefined): number {
  if (!breakdown || !Array.isArray(breakdown)) return 0
  return breakdown.filter(b => b.currency === 'VES').reduce((s, b) => s + Number(b.inputAmount ?? 0), 0)
}

function useFinancialSummary(
  businessId: import('vue').Ref<string | null>,
  selectedPeriod: import('vue').Ref<'month' | 'quarter' | 'year'>,
  expenses: import('vue').Ref<{ date: string; amount: number }[]>,
  selectedMonth?: import('vue').Ref<string>,
) {
  const queryClient = useQueryClient()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)
  const periodConfig = computed(() => resolvePeriod(selectedPeriod.value, selectedMonth?.value))
  const { exchangeRate } = useCurrency()

  // ── Summary + KPIs ──
  const summaryQueryKey = computed(() => [
    'finanzas-summary', businessId.value, selectedPeriod.value,
    selectedMonth?.value ?? null, branchId.value,
  ] as const)

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start: toYmd(cfg.start) + 'T00:00:00',
        end: toYmd(cfg.end) + 'T23:59:59',
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<{ buckets: any[]; kpis: any }>('GET', `/finanzas/summary?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const summaryBuckets = computed(() => summaryData.value?.buckets ?? [])
  const kpis = computed(() => summaryData.value?.kpis ?? {})

  const incomeTotal = computed(() => kpis.value.total_income ?? 0)
  const localIncomeTotal = computed(() => kpis.value.local_income ?? 0)
  const employeePaymentsTotal = computed(() => kpis.value.total_employee_payments ?? 0)
  const vesIncomeTotal = computed(() => incomeTotal.value * exchangeRate.value)

  // ── Transactions (Cobros) ──
  const transactionsQueryKey = computed(() => [
    'finanzas-transactions', businessId.value, selectedPeriod.value,
    selectedMonth?.value ?? null, branchId.value,
  ] as const)

  const { data: transactionsData, isLoading: isTxLoading } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start: toYmd(cfg.start) + 'T00:00:00',
        end: toYmd(cfg.end) + 'T23:59:59',
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<any[]>('GET', `/finanzas/transactions?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const appointmentIncomeDetails = computed<TransactionRow[]>(() => {
    return (transactionsData.value ?? []).map((tx: any) => {
      const breakdown = tx.payments_breakdown as PaymentBreakdownItem[] | null
      const firstBreakdown = breakdown?.[0]
      const isVES = firstBreakdown?.currency === 'VES'
      const method = breakdown && breakdown.length > 0 ? breakdown[0].method : tx.method
      const breakdownLabel = formatBreakdownLabel(breakdown)
      const sumVES = sumVESBreakdown(breakdown)
      const tip = Number(tx.tip_amount ?? 0)
      const serviceAmt = Number(tx.total_amount ?? 0) - tip

      return {
        id: tx.id,
        appointmentId: tx.appointment_id,
        date: formatDate(tx.paid_at),
        client: tx.client_name ?? 'Venta directa',
        employee: tx.employee_name ?? '—',
        service: tx.service_name ?? 'Producto',
        method: breakdownLabel || formatMethod(method),
        rawMethod: method as PaymentMethod,
        amount: serviceAmt,
        exchangeRateUsed: Number(tx.exchange_rate_used ?? 1),
        breakdownLabel,
        breakdown,
        primaryCurrency: isVES ? 'VES' : 'USD',
        primaryAmount: isVES && sumVES > 0 ? sumVES : serviceAmt,
        notes: tx.notes ?? null,
        tipAmount: tip,
      }
    })
  })

  // ── Product Sales ──
  const { data: productSalesData } = useQuery({
    queryKey: computed(() => [
      'finanzas-product-sales', businessId.value, selectedPeriod.value,
      selectedMonth?.value ?? null, branchId.value,
    ] as const),
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start: toYmd(cfg.start) + 'T00:00:00',
        end: toYmd(cfg.end) + 'T23:59:59',
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<any[]>('GET', `/finanzas/product-sales?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const productSalesTotal = computed(() =>
    (productSalesData.value ?? []).reduce((acc: number, r: any) => acc + Number(r.total ?? 0), 0),
  )

  const vesProductSalesTotal = computed(() =>
    (productSalesData.value ?? []).reduce(
      (acc: number, r: any) => acc + Number(r.total ?? 0) * Number(r.exchange_rate_used ?? 1), 0,
    ),
  )

  const productSalesBreakdown = computed(() => {
    const map = new Map<string, number>()
    for (const r of (productSalesData.value ?? [])) {
      const name = r.product ?? 'Sin producto'
      map.set(name, (map.get(name) ?? 0) + Number(r.total ?? 0))
    }
    return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  })

  const productSalesDetails = computed<ProductSaleDetail[]>(() => {
    return (productSalesData.value ?? []).map((r: any) => ({
      id: r.id,
      date: formatDate(r.date),
      product: r.product ?? 'Sin producto',
      clientName: r.client_name || undefined,
      quantity: Number(r.quantity ?? 0),
      unitPrice: Number(r.unit_price ?? 0),
      total: Number(r.total ?? 0),
      currency: 'USD' as const,
      exchangeRateUsed: Number(r.exchange_rate_used ?? 1),
      originalAmount: Number(r.total ?? 0) * Number(r.exchange_rate_used ?? 1),
      isAppointmentSale: r.is_appointment_sale ?? false,
    }))
  })

  // ── Unified transactions ──
  const transactions = computed<UnifiedTransaction[]>(() => {
    const result: UnifiedTransaction[] = []

    // Appointment payments
    for (const tx of (transactionsData.value ?? [])) {
      const tip = Number(tx.tip_amount ?? 0)
      const amt = Number(tx.total_amount ?? 0)
      const serviceAmt = amt - tip
      result.push({
        id: tx.id,
        date: formatDate(tx.paid_at),
        description: `${tx.client_name ?? 'Venta directa'} · ${tx.service_name ?? 'Producto'}`,
        method: formatMethod(tx.method),
        amount: serviceAmt,
        type: 'ingreso',
        exchangeRateUsed: Number(tx.exchange_rate_used ?? 1),
        notes: tx.notes,
        tipAmount: tip,
        source: tx.appointment_id ? 'appointment_payment' : 'direct_sale',
        sourceLabel: tx.appointment_id ? 'Cobro cita' : 'Venta directa',
      })
    }

    // Expenses
    for (const ex of expenses.value) {
      result.push({
        id: 'ex-' + (ex as any).id,
        date: (ex as any).date ?? (ex as any).expense_date,
        description: (ex as any).name ?? 'Gasto',
        method: '—',
        amount: (ex as any).amount ?? 0,
        type: 'gasto',
        source: 'expense',
        sourceLabel: 'Gasto',
      })
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return result
  })

  const allTransactions = transactions

  // ── Employee payments ──
  const employeePayments = computed<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const tx of (transactionsData.value ?? [])) {
      if (!tx.employee_name) continue
      const tip = Number(tx.tip_amount ?? 0)
      const amt = Number(tx.total_amount ?? 0)
      const serviceAmt = Math.max(0, amt - tip)
      const pct = Number(tx.employee_percentage ?? 0)
      rows.push({
        id: tx.id,
        employee: tx.employee_name ?? '—',
        client: tx.client_name ?? '—',
        service: tx.service_name ?? '—',
        amount: amt,
        percentage: pct,
        earnings: serviceAmt * (pct / 100) + tip,
        tipAmount: tip,
      })
    }
    return rows
  })

  // ── Services revenue ──
  const servicesRevenue = computed<ServiceRevenue[]>(() => {
    const totals = new Map<string, number>()
    for (const tx of (transactionsData.value ?? [])) {
      const name = tx.service_name ?? 'Sin servicio'
      totals.set(name, (totals.get(name) ?? 0) + Number(tx.total_amount ?? 0))
    }
    const total = incomeTotal.value
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  })

  // ── Chart data ──
  const chartData = computed<ChartBar[]>(() => {
    return summaryBuckets.value.map((row: any) => ({
      label: formatDate(row.bucket, { month: 'short', day: 'numeric' }),
      income: Number(row.total_amount ?? 0),
      expense: 0,
    }))
  })

  // ── Loading state ──
  const isLoading = computed(() => isSummaryLoading.value || isTxLoading.value)

  // ── Mutations ──
  const { success: notify, error: showError } = useNotification()

  const editTransactionMutation = useMutation({
    mutationFn: (params: {
      transactionId: string
      totalAmount?: number
      method?: PaymentMethod
      notes?: string
      exchangeRate?: number
      paymentsBreakdown?: PaymentBreakdownItem[]
    }) => apiRequest('PUT', `/transactions/${params.transactionId}`, {
      total_amount: params.totalAmount,
      method: params.method,
      notes: params.notes,
      exchange_rate_used: params.exchangeRate,
      payments_breakdown: params.paymentsBreakdown,
    }),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      ])
      notify('Cobro actualizado')
    },
    onError: (err: unknown) => showError(translateError(err, 'Error al actualizar cobro')),
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (params: { transactionId: string }) =>
      apiRequest('DELETE', `/transactions/${params.transactionId}`),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      ])
      notify('Cobro eliminado')
    },
    onError: (err: unknown) => showError(translateError(err, 'Error al eliminar cobro')),
  })

  const deleteProductSaleMutation = useMutation({
    mutationFn: (movementId: string) =>
      apiRequest('DELETE', `/inventory-movements/${movementId}`),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      ])
      notify('Venta de producto eliminada')
    },
    onError: (err: unknown) => showError(translateError(err, 'Error al eliminar venta')),
  })

  // ── Edit modal state ──
  const showEditModal = ref(false)
  const editingTransaction = ref<any>(null)
  const editingAmount = ref(0)
  const editingCurrency = ref<'USD' | 'VES'>('USD')
  const editingMethod = ref('')
  const editingBreakdown = ref<PaymentBreakdownItem[]>([])
  const editingNotes = ref('')
  const isEditingMixed = computed(() => (editingBreakdown.value?.length ?? 0) > 1)
  const editingTotalAmount = computed(() =>
    editingBreakdown.value.reduce((sum, b) => sum + (b.currency === 'VES' ? b.inputAmount / (editingTransaction.value?.exchange_rate_used ?? 1) : b.inputAmount), 0),
  )
  const paymentMethodOptions = ref([
    { label: 'Efectivo ($)', value: 'cash' },
    { label: 'Efectivo (Bs)', value: 'cash_ves' },
    { label: 'Tarjeta', value: 'card' },
    { label: 'Transferencia', value: 'transfer' },
    { label: 'Zelle', value: 'zelle' },
    { label: 'Pago Móvil', value: 'pago_movil' },
    { label: 'Punto de Vta (Bs)', value: 'punto_venta' },
    { label: 'Otro', value: 'other' },
  ])

  const setEditingCurrency = (_v: 'USD' | 'VES') => {}

  const startEdit = (item: any) => {
    editingTransaction.value = item
    editingAmount.value = item.amount ?? 0
    editingCurrency.value = item.primaryCurrency ?? 'USD'
    editingMethod.value = item.rawMethod ?? 'cash'
    editingNotes.value = item.notes ?? ''
    editingBreakdown.value = item.breakdown && item.breakdown.length > 0
      ? [...item.breakdown]
      : [{
        method: item.rawMethod ?? 'cash',
        inputAmount: item.primaryCurrency === 'VES' ? item.primaryAmount : item.amount,
        currency: item.primaryCurrency ?? 'USD',
        amount: item.amount,
      }]
    showEditModal.value = true
  }

  const cancelEdit = () => { showEditModal.value = false }

  const setEditingMethod = (v: string) => { editingMethod.value = v }

  const updateBreakdownItem = (idx: number, data: any) => {
    if (editingBreakdown.value[idx]) {
      editingBreakdown.value[idx] = { ...editingBreakdown.value[idx], ...data }
    }
  }

  const addBreakdownItem = () => {
    editingBreakdown.value.push({ method: 'cash', inputAmount: 0, currency: 'USD', amount: 0 })
  }

  const removeBreakdownItem = (idx: number) => {
    editingBreakdown.value.splice(idx, 1)
  }

  const saveEdit = () => {
    const tx = editingTransaction.value
    if (!tx) return
    const breakdown = editingBreakdown.value.length > 1 ? editingBreakdown.value : null
    editTransactionMutation.mutate({
      transactionId: tx.id,
      totalAmount: isEditingMixed.value ? editingTotalAmount.value : editingAmount.value,
      method: editingMethod.value as PaymentMethod,
      notes: editingNotes.value || null,
      paymentsBreakdown: breakdown ?? undefined,
    })
    showEditModal.value = false
  }

  const handleConfirmDelete = (txId: string) => {
    if (window.confirm('¿Eliminar este cobro?')) {
      deleteTransactionMutation.mutate({ transactionId: txId })
    }
  }

  const handleDeleteProductSale = (movementId: string, productName: string) => {
    if (window.confirm(`¿Eliminar la venta de "${productName}"?`)) {
      deleteProductSaleMutation.mutate(movementId)
    }
  }

  return {
    summaryBuckets,
    transactions,
    allTransactions,
    transactionsAll: appointmentIncomeDetails,
    incomeTotal,
    localIncomeTotal,
    employeePaymentsTotal,
    vesIncomeTotal,
    servicesRevenue,
    chartData,
    employeePayments,
    appointmentIncomeDetails,
    productSalesTotal,
    vesProductSalesTotal,
    productSalesBreakdown,
    productSalesDetails,
    isLoading,
    editTransactionMutation,
    deleteTransactionMutation,
    deleteProductSaleMutation,
    handleDeleteProductSale,
    showEditModal,
    editingTransaction,
    editingAmount,
    editingCurrency,
    setEditingCurrency,
    editingMethod,
    editingBreakdown,
    editingNotes,
    isEditingMixed,
    editingTotalAmount,
    paymentMethodOptions,
    startEdit,
    cancelEdit,
    setEditingMethod,
    updateBreakdownItem,
    addBreakdownItem,
    removeBreakdownItem,
    saveEdit,
    confirmDeleteTransaction: handleConfirmDelete,
  }
}

export { useFinancialSummary }
