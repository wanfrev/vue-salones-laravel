import { computed, watch } from 'vue'
import { useQuery, useQueryClient, useMutation } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { api as supabase } from '../../lib/api'
import { useBusinessStore } from '../../store/business'
import { updateTransaction, deleteTransaction, deleteProductSale } from '../../services/posService'
import { toYmd, resolvePeriod, normalizeBucketKey, formatBucketLabel } from '../../lib/periodUtils'
import { useTransactionEdit } from '../finanzas/useTransactionEdit'
import type { PaymentBreakdownItem } from '../../types/pos'
import type { PaymentMethod } from '../../types/database'
import {
  formatBreakdownLabel,
  sumVESBreakdownInputAmounts,
  buildTransactionsAll,
  buildProductSalesDetails,
  buildUnifiedTransactions,
  buildEmployeePayments,
  buildEmployeeEarningsByEmployee,
} from '../../business/financialTransactions'

export type UnifiedTransaction = {
  id: string; date: string; description: string; method: string; amount: number
  type: 'ingreso' | 'nomina' | 'gasto'; exchangeRateUsed?: number; breakdownLabel?: string
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

  watch(businessId, (id, _prev, onCleanup) => {
    if (!id) return
    const ch = supabase.channel(`finanzas-updates-${id}`, { config: { broadcast: { self: true } } })
    ch.on('broadcast', { event: 'finanzas-invalidate' }, () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary'] })
    }).subscribe()
    onCleanup(() => { supabase.removeChannel(ch) })
  })

  const summaryQueryKey = computed(() => ['financial-summary', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const)
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const { data, error } = await supabase.rpc('financial_summary', { p_business_id: businessId.value!, p_period_start: toYmd(cfg.start), p_period_end: toYmd(cfg.end), p_period: cfg.bucket, p_branch_id: branchId.value })
      if (error) throw error; return (data ?? []) as SummaryBucket[]
    },
    enabled: computed(() => !!businessId.value),
  })
  const summaryBuckets = computed(() => summaryData.value ?? [])

  const transactionsQueryKey = computed(() => ['finanzas-transactions', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const)
  const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const start = `${toYmd(cfg.start)}T00:00:00`; const end = `${toYmd(cfg.end)}T23:59:59`
      let query = supabase.from('transactions').select('*, appointments!inner(client_id, service_id, employee_id, assistant_employee_id, assistant_percentage, employee_percentage_override, group_id, clients:clients!appointments_client_id_fkey(full_name), services:services!appointments_service_id_fkey(name), employee_profile:profiles!appointments_employee_id_fkey(full_name, pay_type, pay_percentage, base_salary), assistant_profile:profiles!appointments_assistant_employee_id_fkey(full_name, pay_type, pay_percentage, base_salary))').eq('business_id', businessId.value!).gte('paid_at', start).lte('paid_at', end).order('paid_at', { ascending: false }).limit(2000)
      if (branchId.value) query = query.eq('branch_id', branchId.value)
      const { data, error } = await query; if (error) throw error; return data ?? []
    },
    enabled: computed(() => !!businessId.value),
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
    queryFn: async () => { const cfg = periodConfig.value; const start = toYmd(cfg.start); const end = toYmd(cfg.end); let q = supabase.from('employee_payments').select('*, employee_profile:profiles!employee_payments_employee_id_fkey(full_name)').eq('business_id', businessId.value!).gte('payment_date', start).lte('payment_date', end); if (branchId.value) q = q.eq('branch_id', branchId.value); const { data, error } = await q; if (error) throw error; return data ?? [] },
    enabled: computed(() => !!businessId.value),
  })

  const { data: rawExpenses } = useQuery({
    queryKey: computed(() => ['finanzas-expenses', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const),
    queryFn: async () => { const cfg = periodConfig.value; const start = toYmd(cfg.start); const end = toYmd(cfg.end); let q = supabase.from('expenses').select('*').eq('business_id', businessId.value!).gte('expense_date', start).lte('expense_date', end); if (branchId.value) q = q.eq('branch_id', branchId.value); const { data, error } = await q; if (error) throw error; return data ?? [] },
    enabled: computed(() => !!businessId.value),
  })

  const { data: rawInventoryMovements } = useQuery({
    queryKey: computed(() => ['finanzas-product-sales', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const),
    queryFn: async () => { const cfg = periodConfig.value; const start = `${toYmd(cfg.start)}T00:00:00`; const end = `${toYmd(cfg.end)}T23:59:59`; let q = supabase.from('inventory_movements').select('*, products(id, name), clients(full_name)').eq('business_id', businessId.value!).eq('movement_type', 'sale').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }).limit(2000); if (branchId.value) q = q.eq('branch_id', branchId.value); const { data, error } = await q; if (error) throw error; return data ?? [] },
    enabled: computed(() => !!businessId.value),
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

  const unifiedTransactions = computed(() => buildUnifiedTransactions(rawTransactions.value, rawEmployeePayments.value ?? [], rawExpenses.value ?? []))
  const transactions = computed(() => unifiedTransactions.value)
  const employeePayments = computed(() => buildEmployeePayments(rawTransactions.value))
  const employeeEarningsByEmployee = computed(() => buildEmployeeEarningsByEmployee(rawTransactions.value))

  const incomeTotal = computed(() => summaryBuckets.value.reduce((acc, row) => acc + row.total_amount, 0))
  const localIncomeTotal = computed(() => summaryBuckets.value.reduce((acc, row) => acc + row.local_amount, 0))
  const employeePaymentsTotal = computed(() => (rawEmployeePayments.value ?? []).reduce((sum, p) => sum + p.amount, 0))
  const vesIncomeTotal = computed(() => rawTransactions.value.reduce((acc, tx) => acc + (tx.total_amount * (tx.exchange_rate_used ?? 1)), 0))

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
    onSuccess: () => { Promise.allSettled(['finanzas-transactions', 'financial-summary', 'finanzas-employee-payments', 'appointments', 'pos-pending', 'inventario', 'finanzas-product-sales'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Cobro actualizado') },
    onError: (err: unknown) => showError(err instanceof Error ? err.message : 'Error al actualizar'),
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (params: { transactionId: string }) => deleteTransaction(params),
    onSuccess: () => { Promise.allSettled(['finanzas-transactions', 'financial-summary', 'finanzas-employee-payments', 'appointments', 'pos-pending', 'inventario', 'finanzas-product-sales'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Cobro eliminado') },
    onError: (err: unknown) => showError(err instanceof Error ? err.message : 'Error al eliminar'),
  })

  const deleteProductSaleMutation = useMutation({
    mutationFn: (movementId: string) => deleteProductSale(movementId),
    onSuccess: () => { Promise.allSettled(['inventario', 'finanzas-product-sales', 'financial-summary'].map(k => queryClient.invalidateQueries({ exact: false, queryKey: [k] }))); notify('Venta de producto eliminada') },
    onError: (err: unknown) => showError(err instanceof Error ? err.message : 'Error al eliminar'),
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
