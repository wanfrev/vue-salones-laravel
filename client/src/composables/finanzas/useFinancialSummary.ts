import { computed } from 'vue'
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { api as supabase, apiRequest } from '../../lib/api'
import { useBusinessStore } from '../../store/business'
import { translateError } from '../../lib/errors'
import { updateTransaction, deleteTransaction, deleteProductSale } from '../../services/posService'
import { toYmd, resolvePeriod, normalizeBucketKey, formatBucketLabel } from '../../lib/periodUtils'
import { useTransactionEdit } from '../finanzas/useTransactionEdit'
import type { PaymentBreakdownItem } from '../../types/pos'
import type { PaymentMethod } from '../../types/database'
import {
  buildTransactionsAll,
  buildProductSalesDetails,
  buildUnifiedTransactions,
  buildEmployeePayments,
  buildEmployeeEarningsByEmployee,
} from '../../business/financialTransactions'

export type UnifiedTransaction = {
  id: string; date: string; description: string; method: string; amount: number
  type: 'ingreso' | 'nomina' | 'gasto'; exchangeRateUsed?: number; breakdownLabel?: string
  source: 'appointment_payment' | 'product_sale' | 'employee_payment' | 'expense'; sourceLabel: string
  _currency?: 'USD' | 'VES'; _originalAmount?: number; notes?: string | null; tipAmount?: number
}

export type EmployeeEarningSummary = {
  employeeId: string; employeeName: string; payType: 'salary' | 'percentage' | 'mixed' | 'unknown'
  payPercentage: number; baseSalary: number; commissionTotal: number; totalEarned: number
}

export type TransactionRow = {
  id: string; appointmentId: string; date: string; client: string; employee: string; service: string
  method: string; rawMethod: PaymentMethod; amount: number; exchangeRateUsed: number
  breakdownLabel: string; breakdown: PaymentBreakdownItem[] | null
  primaryCurrency: 'USD' | 'VES'; primaryAmount: number; notes?: string | null; tipAmount?: number
}

export type ProductSaleDetail = {
  id: string; date: string; product: string; clientName?: string; quantity: number; unitPrice: number
  total: number; currency: 'USD' | 'VES'; exchangeRateUsed: number; originalAmount: number
}

type PaymentRow = {
  id: string; employee: string; client: string; service: string
  amount: number; percentage: number; earnings: number; tipAmount: number
}

export type { PaymentRow }

/** Raw transaction row as returned by TRANSACTIONS_SELECT */
export type DashboardTxRow = {
  id: string
  method: PaymentMethod
  paid_at: string
  created_at: string
  total_amount: number
  exchange_rate_used: number
  tip_amount: number | null
  notes: string | null
  payments_breakdown: PaymentBreakdownItem[] | null
  employee_percentage: number | null
  assistant_percentage: number | null
  appointment_id: string
  appointments: {
    client_id: string
    service_id: string
    employee_id: string
    assistant_employee_id: string | null
    employee_percentage_override: number | null
    group_id: string | null
    clients: { full_name: string } | null
    services: { name: string } | null
    employee_profile: {
      full_name: string
      pay_type: 'salary' | 'percentage' | 'mixed' | null
      pay_percentage: number | null
      base_salary: number | null
    } | null
    assistant_profile: {
      full_name: string
      pay_type: 'salary' | 'percentage' | 'mixed' | null
      pay_percentage: number | null
      base_salary: number | null
    } | null
  } | null
}

export type ServiceRevenue = { name: string; amount: number; percentage: number }
export type ChartBar = { label: string; income: number; expense: number }
type SummaryBucket = { bucket: string; appointments: number; total_amount: number; local_amount: number; employee_amount: number }

function buildExpenseBuckets(rows: { date: string; amount: number }[], bucket: 'day' | 'week' | 'month') {
  const map = new Map<string, number>()
  for (const row of rows) { const key = normalizeBucketKey(new Date(row.date), bucket); map.set(key, (map.get(key) ?? 0) + row.amount) }
  return map
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

  const TRANSACTIONS_SELECT = 'id, method, paid_at, created_at, total_amount, exchange_rate_used, tip_amount, notes, payments_breakdown, employee_percentage, assistant_percentage, appointment_id, appointments!inner(client_id, service_id, employee_id, assistant_employee_id, employee_percentage_override, group_id, clients(full_name), services(name), employee_profile:profiles!appointments_employee_id_fkey(full_name, pay_type, pay_percentage, base_salary), assistant_profile:profiles!appointments_assistant_employee_id_fkey(full_name))'

  const EMPLOYEE_PAYMENTS_SELECT = 'id, payment_date, amount, payment_method, currency, original_amount, employee_profile:profiles!employee_payments_employee_id_fkey(full_name)'

  const summaryQueryKey = computed(() => ['financial-summary', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const)
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const data = await apiRequest<SummaryBucket[]>('POST', '/rpc/financial_summary', {
        p_business_id: businessId.value!,
        p_period_start: toYmd(cfg.start),
        p_period_end: toYmd(cfg.end),
        p_period: cfg.bucket,
        p_branch_id: branchId.value,
      })
      return (data ?? []) as SummaryBucket[]
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })
  const summaryBuckets = computed<SummaryBucket[]>(() => {
    const v = summaryData.value
    return Array.isArray(v) ? v : []
  })

  const transactionsQueryKey = computed(() => ['finanzas-transactions', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const)
  const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const start = `${toYmd(cfg.start)}T00:00:00`
      const end = `${toYmd(cfg.end)}T23:59:59`
      const params = new URLSearchParams({ start, end })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<DashboardTxRow[]>('GET', `/transactions?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })
  const rawTransactions = computed(() => transactionsData.value ?? [])

  const appointmentPaymentMap = computed(() => {
    const map = new Map<string, { breakdown: PaymentBreakdownItem[]; exchangeRate: number }>()
    for (const tx of rawTransactions.value) {
      const apptId = (tx as any).appointment_id as string | undefined; if (!apptId) continue
      const breakdown = (tx as any).payments_breakdown as PaymentBreakdownItem[] | null
      if (breakdown && breakdown.length > 0) map.set(apptId, { breakdown, exchangeRate: tx.exchange_rate_used ?? 1 })
    }
    return map
  })

  const { data: rawEmployeePayments } = useQuery({
    queryKey: computed(() => ['finanzas-employee-payments', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const),
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start_date: toYmd(cfg.start),
        end_date: toYmd(cfg.end),
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<any[]>('GET', `/employee-payments?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const { data: rawExpenses } = useQuery({
    queryKey: computed(() => ['finanzas-expenses', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const),
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start_date: toYmd(cfg.start),
        end_date: toYmd(cfg.end),
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      return await apiRequest<any[]>('GET', `/expenses?${params.toString()}`)
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const { data: rawInventoryMovements } = useQuery({
    queryKey: computed(() => ['finanzas-product-sales', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const),
    queryFn: async () => {
      const cfg = periodConfig.value
      const params = new URLSearchParams({
        start_date: toYmd(cfg.start),
        end_date: toYmd(cfg.end),
      })
      if (branchId.value) params.set('branch_id', branchId.value)
      const rows = await apiRequest<any[]>('GET', `/inventory-movements?${params.toString()}`)
      return (rows ?? []).filter((row: any) => row.movement_type === 'sale')
    },
    enabled: computed(() => !!businessId.value),
    placeholderData: keepPreviousData,
  })

  const transactionsAll = computed(() => buildTransactionsAll(rawTransactions.value))
  const appointmentIncomeDetails = computed(() => transactionsAll.value)

  const productSalesTotal = computed(() => (rawInventoryMovements.value ?? []).reduce((acc: number, r: any) => acc + Math.abs(Number(r.quantity ?? 0)) * Number(r.unit_cost ?? 0), 0))
  const vesProductSalesTotal = computed(() => (rawInventoryMovements.value ?? []).reduce((acc: number, r: any) => acc + Math.abs(Number(r.quantity ?? 0)) * Number(r.unit_cost ?? 0) * Number(r.exchange_rate_used ?? 1), 0))
  const productSalesBreakdown = computed(() => {
    const map = new Map<string, number>()
    for (const r of (rawInventoryMovements.value ?? [])) { const name = r.products?.name ?? 'Sin producto'; map.set(name, (map.get(name) ?? 0) + Math.abs(Number(r.quantity ?? 0)) * Number(r.unit_cost ?? 0)) }
    return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  })
  const productSalesDetails = computed(() => buildProductSalesDetails(rawInventoryMovements.value ?? [], appointmentPaymentMap.value))

  const unifiedTransactions = computed(() =>
    buildUnifiedTransactions(
      rawTransactions.value,
      rawEmployeePayments.value ?? [],
      rawExpenses.value ?? [],
      rawInventoryMovements.value ?? [],
    )
  )
  const transactions = computed(() => unifiedTransactions.value)
  const employeePayments = computed(() => buildEmployeePayments(rawTransactions.value))
  const employeeEarningsByEmployee = computed(() => buildEmployeeEarningsByEmployee(rawTransactions.value))

  const incomeTotal = computed(() => summaryBuckets.value.reduce((acc, row) => acc + Number(row.total_amount ?? 0), 0))
  const localIncomeTotal = computed(() => summaryBuckets.value.reduce((acc, row) => acc + Number(row.local_amount ?? 0), 0))
  const employeePaymentsTotal = computed(() => (rawEmployeePayments.value ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0))
  const vesIncomeTotal = computed(() => rawTransactions.value.reduce((acc, tx) => acc + (Number(tx.total_amount ?? 0) * Number(tx.exchange_rate_used ?? 1)), 0))

  const servicesRevenue = computed<ServiceRevenue[]>(() => {
    const totals = new Map<string, number>()
    for (const tx of transactionsAll.value) totals.set(tx.service || 'Sin servicio', (totals.get(tx.service || 'Sin servicio') ?? 0) + tx.amount)
    const total = incomeTotal.value
    return [...totals.entries()].map(([name, amount]) => ({ name, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount)
  })

  const chartData = computed<ChartBar[]>(() => {
    const cfg = periodConfig.value; const expenseBuckets = buildExpenseBuckets(expenses.value, cfg.bucket)
    const entries = summaryBuckets.value.map(row => ({ label: formatBucketLabel(new Date(row.bucket), cfg.bucket), incomeValue: row.total_amount, expenseValue: expenseBuckets.get(normalizeBucketKey(new Date(row.bucket), cfg.bucket)) ?? 0 }))
    const maxValue = Math.max(1, ...entries.map(e => Math.max(e.incomeValue, e.expenseValue)))
    return entries.map(e => ({ label: e.label, income: Math.max(4, Math.round((e.incomeValue / maxValue) * 140)), expense: Math.max(4, Math.round((e.expenseValue / maxValue) * 140)) }))
  })

  const isLoading = computed(() => isSummaryLoading.value || isTransactionsLoading.value)

  const { success: notify, error: showError } = useNotification()

  const editTransactionMutation = useMutation({
    mutationFn: (params: { transactionId: string; amount?: number; method?: PaymentMethod; notes?: string; exchangeRate?: number; paymentsBreakdown?: PaymentBreakdownItem[] }) => updateTransaction(params),
    onSuccess: async () => { await Promise.allSettled(['finanzas-transactions', 'financial-summary', 'finanzas-employee-payments', 'appointments', 'pos-pending', 'inventario', 'finanzas-product-sales'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Cobro actualizado') },
    onError: (err: unknown) => showError(translateError(err, 'Error al actualizar cobro')),
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (params: { transactionId: string }) => deleteTransaction(params),
    onSuccess: async () => { await Promise.allSettled(['finanzas-transactions', 'financial-summary', 'finanzas-employee-payments', 'appointments', 'pos-pending', 'inventario', 'finanzas-product-sales'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Cobro eliminado') },
    onError: (err: unknown) => showError(translateError(err, 'Error al eliminar cobro')),
  })

  const deleteProductSaleMutation = useMutation({
    mutationFn: (movementId: string) => deleteProductSale(movementId),
    onSuccess: async () => { await Promise.allSettled(['inventario', 'finanzas-product-sales', 'financial-summary'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Venta de producto eliminada') },
    onError: (err: unknown) => showError(translateError(err, 'Error al eliminar cobro')),
  })

  const { showEditModal, editingTransaction, editingAmount, editingCurrency, setEditingCurrency, editingMethod, editingBreakdown, editingNotes, isEditingMixed, editingTotalAmount, paymentMethodOptions, startEdit, cancelEdit, setEditingMethod, updateBreakdownItem, addBreakdownItem, removeBreakdownItem, saveEdit: onSaveEdit, confirmDeleteTransaction } = useTransactionEdit(showError)

  const saveEdit = () => onSaveEdit((params) => editTransactionMutation.mutate({ transactionId: params.transactionId, amount: params.amount, method: params.method, notes: params.notes, paymentsBreakdown: params.paymentsBreakdown }))
  const handleConfirmDelete = (txId: string) => confirmDeleteTransaction(txId, (id) => deleteTransactionMutation.mutate({ transactionId: id }))
  const handleDeleteProductSale = (movementId: string, productName: string) => { if (window.confirm(`¿Eliminar la venta de "${productName}"?`)) deleteProductSaleMutation.mutate(movementId) }

  return {
    summaryBuckets, transactions, allTransactions: unifiedTransactions, transactionsAll,
    incomeTotal, localIncomeTotal, employeePaymentsTotal, vesIncomeTotal,
    servicesRevenue, chartData, employeePayments, employeeEarningsByEmployee,
    appointmentIncomeDetails, productSalesTotal, vesProductSalesTotal,
    productSalesBreakdown, productSalesDetails, isLoading,
    editTransactionMutation, deleteTransactionMutation, deleteProductSaleMutation,
    handleDeleteProductSale,
    showEditModal, editingTransaction, editingAmount, editingCurrency, setEditingCurrency,
    editingMethod, editingBreakdown, editingNotes, isEditingMixed, editingTotalAmount,
    paymentMethodOptions, startEdit, cancelEdit, setEditingMethod,
    updateBreakdownItem, addBreakdownItem, removeBreakdownItem,
    saveEdit, confirmDeleteTransaction: handleConfirmDelete,
  }
}
export { useFinancialSummary }
