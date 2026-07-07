import { computed, watch } from 'vue'
import { useQuery, useQueryClient, useMutation } from '@tanstack/vue-query'
import { useNotification } from './useNotification'
import { formatMethod, formatDate } from '../lib/formatters'
import { api as supabase } from '../lib/api'
import { useBusinessStore } from '../store/business'
import { updateTransaction, deleteTransaction, deleteProductSale } from '../services/posService'
import { toYmd, resolvePeriod, normalizeBucketKey, formatBucketLabel } from '../lib/periodUtils'
import { computeServiceEarnings, type EmployeeCompProfile } from '../business/employeeEarnings'
import { useTransactionEdit } from './useTransactionEdit'
import type { Transaction, EmployeePayment, Expense, PaymentMethod } from '../types/database'
import type { PaymentBreakdownItem } from '../types/pos'

export type UnifiedTransaction = {
  id: string
  date: string
  description: string
  method: string
  amount: number
  type: 'ingreso' | 'nomina' | 'gasto'
  exchangeRateUsed?: number
  breakdownLabel?: string
  _currency?: 'USD' | 'VES'
  _originalAmount?: number
  notes?: string | null
  tipAmount?: number
}

export type EmployeeEarningSummary = {
  employeeId: string
  employeeName: string
  payType: 'salary' | 'percentage' | 'mixed' | 'unknown'
  payPercentage: number
  baseSalary: number
  commissionTotal: number
  totalEarned: number
}

type SummaryBucket = {
  bucket: string
  appointments: number
  total_amount: number
  local_amount: number
  employee_amount: number
}

export type TransactionRow = {
  id: string
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
  quantity: number
  unitPrice: number
  total: number
  currency: 'USD' | 'VES'
  exchangeRateUsed: number
  originalAmount: number
}

type PaymentRow = {
  id: string
  employee: string
  client: string
  service: string
  amount: number
  percentage: number
  earnings: number
  tipAmount: number
}

export type ServiceRevenue = {
  name: string
  amount: number
  percentage: number
}

export type ChartBar = {
  label: string
  income: number
  expense: number
}

function formatBreakdownLabel(breakdown: PaymentBreakdownItem[] | null | undefined): string {
  if (!breakdown || !Array.isArray(breakdown) || breakdown.length <= 1) return ''
  return breakdown.map(p => {
    const methodName = formatMethod(p.method)
    const amount = p.currency === 'VES'
      ? `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.inputAmount)} Bs`
      : `$${p.inputAmount.toFixed(2)}`
    return `${methodName} ${amount}`
  }).join(' / ')
}

function sumVESBreakdownInputAmounts(breakdown: PaymentBreakdownItem[] | null | undefined): number {
  if (!breakdown || !Array.isArray(breakdown)) return 0
  return breakdown
    .filter(b => b.currency === 'VES')
    .reduce((sum, b) => sum + Number(b.inputAmount ?? 0), 0)
}



function buildExpenseBuckets(rows: { date: string; amount: number }[], bucket: 'day' | 'week' | 'month') {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = normalizeBucketKey(new Date(row.date), bucket)
    map.set(key, (map.get(key) ?? 0) + row.amount)
  }
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

  // Keep Finanzas in sync across sessions/devices (e.g. POS on another browser/device).
  watch(
    businessId,
    (id, _prev, onCleanup) => {
      if (!id) return

      const channel = supabase
        .channel(`finanzas-live-${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_movements', filter: `business_id=eq.${id}` },
          () => {
            queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales', id] })
            queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary', id] })
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions', filter: `business_id=eq.${id}` },
          () => {
            queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions', id] })
            queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary', id] })
          },
        )
        .subscribe()

      onCleanup(() => {
        supabase.removeChannel(channel)
      })
    },
    { immediate: true },
  )

  const summaryQueryKey = computed(() =>
    ['financial-summary', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const
  )

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const start = toYmd(cfg.start)
      const end = toYmd(cfg.end)
      const { data, error } = await supabase.rpc('financial_summary', {
        p_business_id: businessId.value!,
        p_period_start: start,
        p_period_end: end,
        p_period: cfg.bucket,
        p_branch_id: branchId.value,
      })
      if (error) throw error
      return (data ?? []) as SummaryBucket[]
    },
    enabled: computed(() => !!businessId.value),
  })

  const summaryBuckets = computed(() => summaryData.value ?? [])

  const transactionsQueryKey = computed(() =>
    ['finanzas-transactions', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value] as const
  )

  const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      const cfg = periodConfig.value
      const endExclusive = new Date(cfg.end)
      endExclusive.setDate(endExclusive.getDate() + 1)

      let query = supabase
        .from('transactions')
        .select(`
          id,
          appointment_id,
          paid_at,
          created_at,
          total_amount,
          method,
          employee_percentage,
          assistant_amount,
          assistant_percentage,
          exchange_rate_used,
          payments_breakdown,
          notes,
          tip_amount,
          appointments (
            client_id,
            service_id,
            employee_id,
            assistant_employee_id,
            assistant_percentage,
            employee_percentage_override,
            group_id,
            clients ( full_name ),
            services ( name ),
            employee_profile:profiles!appointments_employee_id_fkey ( full_name, pay_type, pay_percentage, base_salary ),
            assistant_profile:profiles!appointments_assistant_employee_id_fkey ( full_name, pay_type, pay_percentage, base_salary )
          )
        `)
        .eq('business_id', businessId.value!)
        .gte('created_at', cfg.start.toISOString())
        .lt('created_at', endExclusive.toISOString())
        .order('created_at', { ascending: false })

      if (branchId.value) {
        query = query.eq('branch_id', branchId.value)
      }

      const { data, error } = await query

      if (error) throw error

      const raw = (data ?? []) as Array<
        Transaction & {
          exchange_rate_used?: number | null
          appointments?: {
            client_id: string | null
            service_id: string | null
            employee_id: string | null
            assistant_employee_id: string | null
            assistant_percentage: number | null
            employee_percentage_override: number | null
            group_id: string | null
            clients?: { full_name: string | null } | null
            services?: { name: string | null } | null
            employee_profile?: {
              full_name: string | null
              pay_type?: 'salary' | 'percentage' | 'mixed' | null
              pay_percentage?: number | null
              base_salary?: number | null
            } | null
            assistant_profile?: {
              full_name: string | null
              pay_type?: 'salary' | 'percentage' | 'mixed' | null
              pay_percentage?: number | null
              base_salary?: number | null
            } | null
          } | null
        }
      >

      return raw
    },
    enabled: computed(() => !!businessId.value),
  })

  const rawTransactions = computed(() => transactionsData.value ?? [])

  const appointmentPaymentMap = computed(() => {
    const map = new Map<string, { breakdown: PaymentBreakdownItem[]; exchangeRate: number }>()
    for (const tx of rawTransactions.value) {
      const apptId = (tx as any).appointment_id as string | undefined
      if (!apptId) continue
      const breakdown = (tx as any).payments_breakdown as PaymentBreakdownItem[] | null
      if (breakdown && breakdown.length > 0) {
        map.set(apptId, { breakdown, exchangeRate: tx.exchange_rate_used ?? 1 })
      }
    }
    return map
  })

  const getProductSaleCurrency = (refType: string | null, refId: string | null, movementRate: number, movementNotes?: string): {
    currency: 'USD' | 'VES'
    exchangeRateUsed: number
    originalAmount: (total: number) => number
  } => {
    if (refType === 'appointment' && refId) {
      const pmt = appointmentPaymentMap.value.get(refId)
      if (pmt) {
        const firstBreakdown = pmt.breakdown[0]
        const isVES = firstBreakdown?.currency === 'VES'
        return {
          currency: isVES ? 'VES' : 'USD',
          exchangeRateUsed: pmt.exchangeRate,
          originalAmount: (total: number) => total,
        }
      }
    }
    const rate = movementRate || 1
    const notes = movementNotes ?? ''
    const vesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?)\]/)
    if (vesMatch) {
      const parsedRate = Number(vesMatch[1])
      return {
        currency: 'VES',
        exchangeRateUsed: parsedRate > 0 ? parsedRate : rate,
        originalAmount: (total: number) => total,
      }
    }
    return {
      currency: 'USD',
      exchangeRateUsed: rate,
      originalAmount: (total: number) => total,
    }
  }

  // Employee payments query for same period
  const { data: rawEmployeePayments } = useQuery({
    queryKey: computed(() => ['finanzas-employee-payments', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value]),
    queryFn: async () => {
      const cfg = periodConfig.value
      let query = supabase
        .from('employee_payments')
        .select('id, amount, payment_method, payment_date, notes, currency, original_amount, exchange_rate_used, employee_profile:profiles!employee_payments_employee_id_fkey(full_name)')
        .eq('business_id', businessId.value!)
        .gte('payment_date', toYmd(cfg.start))
        .lte('payment_date', toYmd(cfg.end))
        .order('payment_date', { ascending: false })

      if (branchId.value) {
        query = query.eq('branch_id', branchId.value)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Array<EmployeePayment & { employee_profile?: { full_name: string } | null }>
    },
    enabled: computed(() => !!businessId.value),
  })

  // Expenses query for same period
  const { data: rawExpenses } = useQuery({
    queryKey: computed(() => ['finanzas-expenses', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value]),
    queryFn: async () => {
      const cfg = periodConfig.value
      let query = supabase
        .from('expenses')
        .select('id, name, amount, expense_date, notes, currency, original_amount, exchange_rate_used')
        .eq('business_id', businessId.value!)
        .gte('expense_date', toYmd(cfg.start))
        .lte('expense_date', toYmd(cfg.end))
        .order('expense_date', { ascending: false })

      if (branchId.value) {
        query = query.eq('branch_id', branchId.value)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Expense[]
    },
    enabled: computed(() => !!businessId.value),
  })

  // Product sales (inventory movements with movement_type = 'sale') for the same period
  const { data: rawInventoryMovements } = useQuery({
    queryKey: computed(() => ['finanzas-product-sales', businessId.value, selectedPeriod.value, selectedMonth?.value ?? null, branchId.value]),
    queryFn: async () => {
      const cfg = periodConfig.value
      const endExclusive = new Date(cfg.end)
      endExclusive.setDate(endExclusive.getDate() + 1)
      let query = supabase
        .from('inventory_movements')
        .select('id, product_id, variant_id, movement_type, quantity, unit_cost, exchange_rate_used, reference_type, reference_id, notes, created_at, products ( name )')
        .eq('business_id', businessId.value!)
        .eq('movement_type', 'sale')
        .gte('created_at', cfg.start.toISOString())
        .lt('created_at', endExclusive.toISOString())
        .order('created_at', { ascending: false })

      if (branchId.value) {
        query = query.eq('branch_id', branchId.value)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Array<any>
    },
    enabled: computed(() => !!businessId.value),
  })

  const transactionsAll = computed<TransactionRow[]>(() => {
    const groupMap = new Map<string, {
      rows: any[]
      services: string[]
      employees: string[]
      totalAmount: number
      totalTip: number
      totalVES: number
    }>()
    const singles: (TransactionRow & { _sortDate: string })[] = []

    for (const row of rawTransactions.value) {
      const groupId = (row as any).appointments?.group_id as string | null
      const serviceName = row.appointments?.services?.name ?? '—'
      const employeeName = row.appointments?.employee_profile?.full_name ?? '—'
      const breakdown = (row as any).payments_breakdown as PaymentBreakdownItem[] | null
      const firstBreakdown = breakdown?.[0]
      const isVES = firstBreakdown?.currency === 'VES'
      const sumVES = sumVESBreakdownInputAmounts(breakdown)
      const vesAmount = isVES && sumVES > 0 ? sumVES : row.total_amount
      const sortDate = (row.paid_at ?? row.created_at) as string

      if (groupId) {
        const rowTip = Number((row as any).tip_amount ?? 0)
        const serviceAmt = (row.total_amount as number) - rowTip
        const existing = groupMap.get(groupId)
        if (existing) {
          existing.rows.push(row)
          if (!existing.services.includes(serviceName)) existing.services.push(serviceName)
          if (!existing.employees.includes(employeeName)) existing.employees.push(employeeName)
          existing.totalAmount += serviceAmt
          existing.totalTip += rowTip
          existing.totalVES += vesAmount
        } else {
          groupMap.set(groupId, {
            rows: [row],
            services: [serviceName],
            employees: [employeeName],
            totalAmount: serviceAmt,
            totalTip: rowTip,
            totalVES: vesAmount,
          })
        }
      } else {
        const rowTip = Number((row as any).tip_amount ?? 0)
        const serviceAmt = (row.total_amount as number) - rowTip
        const breakdownLabel = formatBreakdownLabel(breakdown)
        singles.push({
          id: row.id,
          date: formatDate(row.paid_at ?? row.created_at),
          client: row.appointments?.clients?.full_name ?? '—',
          employee: employeeName,
          service: serviceName,
          method: breakdownLabel || formatMethod(row.method),
          rawMethod: row.method as PaymentMethod,
          amount: serviceAmt,
          exchangeRateUsed: row.exchange_rate_used ?? 1,
          breakdownLabel,
          breakdown,
          primaryCurrency: isVES ? 'VES' : 'USD',
          primaryAmount: vesAmount,
          notes: (row as any).notes ?? null,
          tipAmount: Number((row as any).tip_amount ?? 0),
          _sortDate: sortDate,
        })
      }
    }

    const grouped: (TransactionRow & { _sortDate: string })[] = []
    for (const [, group] of groupMap) {
      const firstRow = group.rows[0]
      const breakdown = (firstRow as any).payments_breakdown as PaymentBreakdownItem[] | null
      const breakdownLabel = formatBreakdownLabel(breakdown)
      const firstBreakdown = breakdown?.[0]
      const isVES = firstBreakdown?.currency === 'VES'
      const sortDate = (firstRow.paid_at ?? firstRow.created_at) as string

      grouped.push({
        id: firstRow.id,
        date: formatDate(firstRow.paid_at ?? firstRow.created_at),
        client: firstRow.appointments?.clients?.full_name ?? '—',
        employee: group.employees.join(', '),
        service: group.services.join(' + '),
        method: breakdownLabel || formatMethod(firstRow.method),
        rawMethod: firstRow.method as PaymentMethod,
        amount: group.totalAmount,
        exchangeRateUsed: firstRow.exchange_rate_used ?? 1,
        breakdownLabel,
        breakdown,
        primaryCurrency: isVES ? 'VES' : 'USD',
        primaryAmount: isVES ? group.totalVES : group.totalAmount,
        notes: (firstRow as any).notes ?? null,
        tipAmount: group.totalTip,
        _sortDate: sortDate,
      })
    }

    const result = [...singles, ...grouped]
    result.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
    return result.map(({ _sortDate: _, ...row }) => row)
  })

  const appointmentIncomeDetails = computed(() => transactionsAll.value)

  // Compute product sales totals from inventory movements (movement_type = 'sale')
  const productSalesTotal = computed(() => {
    const rows = rawInventoryMovements.value ?? []
    return rows.reduce((acc: number, r: any) => {
      const qty = Math.abs(Number(r.quantity ?? 0))
      const price = Number(r.unit_cost ?? 0)
      return acc + qty * price
    }, 0)
  })

  const vesProductSalesTotal = computed(() => {
    const rows = rawInventoryMovements.value ?? []
    return rows.reduce((acc: number, r: any) => {
      const qty = Math.abs(Number(r.quantity ?? 0))
      const price = Number(r.unit_cost ?? 0)
      const rate = Number(r.exchange_rate_used ?? 1)
      return acc + qty * price * rate
    }, 0)
  })

  const productSalesBreakdown = computed(() => {
    const rows = rawInventoryMovements.value ?? []
    const map = new Map<string, number>()
    for (const r of rows) {
      const name = r.products?.name ?? 'Sin producto'
      const amount = Math.abs(Number(r.quantity ?? 0)) * Number(r.unit_cost ?? 0)
      map.set(name, (map.get(name) ?? 0) + amount)
    }
    return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  })

  const productSalesDetails = computed<ProductSaleDetail[]>(() => {
    const rows = rawInventoryMovements.value ?? []
    return rows.map((r: any, idx: number) => {
      const quantity = Math.abs(Number(r.quantity ?? 0))
      const unitPrice = Number(r.unit_cost ?? 0)
      const total = quantity * unitPrice
      const { currency, exchangeRateUsed, originalAmount } = getProductSaleCurrency(
        r.reference_type ?? null, r.reference_id ?? null, Number(r.exchange_rate_used ?? 1), r.notes,
      )
      const orig = originalAmount(total)
      return {
        id: r.id ?? `product-${idx}`,
        date: formatDate(r.created_at),
        product: r.products?.name ?? 'Sin producto',
        quantity,
        unitPrice,
        total,
        currency,
        exchangeRateUsed,
        originalAmount: currency === 'VES' ? total * exchangeRateUsed : orig,
      }
    })
  })

  const unifiedTransactions = computed<UnifiedTransaction[]>(() => {
    const result: Array<UnifiedTransaction & { sortDate: string }> = []

    // Appointment payments (income) - group by group_id
    const groupMap = new Map<string, {
      txs: any[]
      services: string[]
      employees: string[]
      totalAmount: number
      totalTip: number
      totalVES: number
    }>()

    for (const tx of rawTransactions.value) {
      const groupId = (tx as any).appointments?.group_id as string | null
      const serviceName = tx.appointments?.services?.name ?? '—'
      const employeeName = tx.appointments?.employee_profile?.full_name ?? '—'
      const breakdown = (tx as any).payments_breakdown as PaymentBreakdownItem[] | null
      const firstBreakdown = breakdown?.[0]
      const isVES = firstBreakdown?.currency === 'VES'
      const sumVES = sumVESBreakdownInputAmounts(breakdown)
      const txTip = Number((tx as any).tip_amount ?? 0)
      const serviceAmt = (tx.total_amount as number) - txTip
      const vesAmount = isVES && sumVES > 0 ? sumVES : serviceAmt

      if (groupId) {
        const existing = groupMap.get(groupId)
        if (existing) {
          existing.txs.push(tx)
          if (!existing.services.includes(serviceName)) existing.services.push(serviceName)
          if (!existing.employees.includes(employeeName)) existing.employees.push(employeeName)
          existing.totalAmount += serviceAmt
          existing.totalTip += txTip
          existing.totalVES += vesAmount
        } else {
          groupMap.set(groupId, {
            txs: [tx],
            services: [serviceName],
            employees: [employeeName],
            totalAmount: serviceAmt,
            totalTip: txTip,
            totalVES: vesAmount,
          })
        }
      } else {
        const breakdownLabel = formatBreakdownLabel(breakdown)
        result.push({
          id: tx.id,
          date: formatDate(tx.paid_at ?? tx.created_at),
          description: (tx.appointments?.clients?.full_name ?? '—') + ' · ' + serviceName,
          method: breakdownLabel || formatMethod(tx.method),
          amount: serviceAmt,
          type: 'ingreso',
          exchangeRateUsed: tx.exchange_rate_used ?? 1,
          breakdownLabel,
          _currency: isVES ? 'VES' : 'USD',
          _originalAmount: vesAmount,
          notes: (tx as any).notes ?? null,
          tipAmount: Number((tx as any).tip_amount ?? 0),
          sortDate: tx.paid_at ?? tx.created_at,
        })
      }
    }

    // Add grouped transactions
    for (const [, group] of groupMap) {
      const firstTx = group.txs[0]
      const breakdown = (firstTx as any).payments_breakdown as PaymentBreakdownItem[] | null
      const breakdownLabel = formatBreakdownLabel(breakdown)
      const firstBreakdown = breakdown?.[0]
      const isVES = firstBreakdown?.currency === 'VES'
      const servicesStr = group.services.join(' + ')

      result.push({
        id: firstTx.id,
        date: formatDate(firstTx.paid_at ?? firstTx.created_at),
        description: (firstTx.appointments?.clients?.full_name ?? '—') + ' · ' + servicesStr,
        method: breakdownLabel || formatMethod(firstTx.method),
        amount: group.totalAmount,
        type: 'ingreso',
        exchangeRateUsed: firstTx.exchange_rate_used ?? 1,
        breakdownLabel,
        _currency: isVES ? 'VES' : 'USD',
        _originalAmount: isVES ? group.totalVES : group.totalAmount,
        notes: (firstTx as any).notes ?? null,
        tipAmount: group.totalTip,
        sortDate: firstTx.paid_at ?? firstTx.created_at,
      })
    }

    // Employee payments (nomina)
    const empPayments = rawEmployeePayments.value ?? []
    for (const ep of empPayments) {
      const epCurrency = ((ep as any).currency === 'VES' ? 'VES' : 'USD') as 'USD' | 'VES'
      const epOriginalAmount = epCurrency === 'VES' ? Number((ep as any).original_amount ?? 0) : Number(ep.amount)
      result.push({
        id: 'ep-' + ep.id,
        date: formatDate(ep.payment_date),
        description: 'Pago a ' + (ep.employee_profile?.full_name ?? 'empleado'),
        method: formatMethod(ep.payment_method),
        amount: ep.amount,
        type: 'nomina',
        sortDate: ep.payment_date,
        _currency: epCurrency,
        _originalAmount: epOriginalAmount,
      })
    }

    // Expenses (gastos)
    const expensesList = rawExpenses.value ?? []
    for (const ex of expensesList) {
      const exCurrency = ((ex as any).currency === 'VES' ? 'VES' : undefined) as 'USD' | 'VES' | undefined
      const exOriginalAmount = exCurrency === 'VES' ? Number((ex as any).original_amount ?? 0) : undefined
      const exExchangeRate = exCurrency === 'VES' ? Number((ex as any).exchange_rate_used ?? 1) : undefined
      result.push({
        id: 'ex-' + ex.id,
        date: formatDate(ex.expense_date),
        description: ex.name,
        method: '—',
        amount: ex.amount,
        type: 'gasto',
        exchangeRateUsed: exExchangeRate,
        _currency: exCurrency,
        _originalAmount: exOriginalAmount,
        sortDate: ex.expense_date,
      })
    }

    result.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    return result.map(({ sortDate: _sortDate, ...tx }) => tx)
  })

  const transactions = computed(() => unifiedTransactions.value)

  const getEffectiveEmployeePercentage = (row: {
    employee_percentage: number | null
    appointments?: { employee_percentage_override: number | null } | null
  }): number | null => {
    const overridePct = row.appointments?.employee_percentage_override
    if (overridePct != null) return Number(overridePct)
    return row.employee_percentage != null ? Number(row.employee_percentage) : null
  }

  const employeePayments = computed<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const row of rawTransactions.value) {
      const tipAmount = Number((row as any).tip_amount ?? 0)
      const serviceAmount = Math.max(0, Number(row.total_amount ?? 0) - tipAmount)
      const mainCalc = computeServiceEarnings(
        serviceAmount,
        row.appointments?.employee_profile,
        getEffectiveEmployeePercentage(row),
      )
      rows.push({
        id: row.id,
        employee: row.appointments?.employee_profile?.full_name ?? '—',
        client: row.appointments?.clients?.full_name ?? '—',
        service: row.appointments?.services?.name ?? '—',
        amount: row.total_amount,
        percentage: mainCalc.percentage,
        earnings: mainCalc.earnings + tipAmount,
        tipAmount,
      })

      // Assistant row if assigned
      const assistantId = row.appointments?.assistant_employee_id
      const assistantPct = Number(row.assistant_percentage ?? 0)
      if (assistantId && assistantPct > 0) {
        const assistantName = row.appointments?.assistant_profile?.full_name ?? '—'
        const assistantEarnings = serviceAmount * (assistantPct / 100)
        rows.push({
          id: `${row.id}-asst`,
          employee: assistantName + ' (asistente)',
          client: row.appointments?.clients?.full_name ?? '—',
          service: row.appointments?.services?.name ?? '—',
          amount: row.total_amount,
          percentage: assistantPct,
          earnings: assistantEarnings,
          tipAmount: 0,
        })
      }
    }
    return rows
  })

  const employeeEarningsByEmployee = computed<EmployeeEarningSummary[]>(() => {
    const map = new Map<string, {
      employeeName: string
      payType: string
      payPercentage: number
      baseSalary: number
      commissionTotal: number
    }>()

    const ensureEntry = (id: string, name: string, profile?: EmployeeCompProfile | null) => {
      if (!id) return
      if (!map.has(id)) {
        const pt = profile?.pay_type ?? 'percentage'
        map.set(id, {
          employeeName: name || '—',
          payType: pt,
          payPercentage: pt === 'salary' ? 0 : Number(profile?.pay_percentage ?? 0),
          baseSalary: pt === 'percentage' ? 0 : Number(profile?.base_salary ?? 0),
          commissionTotal: 0,
        })
      }
    }

    for (const tx of rawTransactions.value) {
      const appt = tx.appointments
      if (!appt) continue

      // Main employee
      const mainId = appt.employee_id ?? ''
      const mainProfile = appt.employee_profile
      if (mainId) {
        ensureEntry(mainId, mainProfile?.full_name ?? '—', mainProfile)
        const tipAmount = Number((tx as any).tip_amount ?? 0)
        const serviceAmount = Math.max(0, Number(tx.total_amount ?? 0) - tipAmount)
        const calc = computeServiceEarnings(
          serviceAmount,
          mainProfile,
          getEffectiveEmployeePercentage(tx),
        )
        map.get(mainId)!.commissionTotal += calc.earnings + tipAmount
      }

      // Assistant if assigned
      const assistantId = appt.assistant_employee_id
      const assistantPct = Number(tx.assistant_percentage ?? 0)
      if (assistantId && assistantPct > 0) {
        ensureEntry(assistantId, appt.assistant_profile?.full_name ?? '—', appt.assistant_profile)
        map.get(assistantId)!.commissionTotal += Number(tx.total_amount ?? 0) * (assistantPct / 100)
      }
    }

    return [...map.entries()].map(([employeeId, data]) => ({
      employeeId,
      employeeName: data.employeeName,
      payType: data.payType as EmployeeEarningSummary['payType'],
      payPercentage: data.payPercentage,
      baseSalary: data.baseSalary,
      commissionTotal: data.commissionTotal,
      totalEarned: data.baseSalary + data.commissionTotal,
    }))
  })

  const incomeTotal = computed(() =>
    summaryBuckets.value.reduce((acc, row) => acc + row.total_amount, 0)
  )

  const localIncomeTotal = computed(() =>
    summaryBuckets.value.reduce((acc, row) => acc + row.local_amount, 0)
  )

  const employeePaymentsTotal = computed(() =>
    (rawEmployeePayments.value ?? []).reduce((sum, p) => sum + p.amount, 0)
  )

  const vesIncomeTotal = computed(() =>
    rawTransactions.value.reduce((acc, tx) => acc + (tx.total_amount * (tx.exchange_rate_used ?? 1)), 0)
  )

  const servicesRevenue = computed<ServiceRevenue[]>(() => {
    const totals = new Map<string, number>()
    for (const tx of transactionsAll.value) {
      const key = tx.service || 'Sin servicio'
      totals.set(key, (totals.get(key) ?? 0) + tx.amount)
    }
    const total = incomeTotal.value
    return [...totals.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  })

  const chartData = computed<ChartBar[]>(() => {
    const cfg = periodConfig.value
    const expenseBuckets = buildExpenseBuckets(expenses.value, cfg.bucket)
    const entries = summaryBuckets.value.map(row => {
      const bucketKey = normalizeBucketKey(new Date(row.bucket), cfg.bucket)
      const expenseValue = expenseBuckets.get(bucketKey) ?? 0
      return {
        label: formatBucketLabel(new Date(row.bucket), cfg.bucket),
        incomeValue: row.total_amount,
        expenseValue,
      }
    })

    const maxValue = Math.max(1, ...entries.map(item => Math.max(item.incomeValue, item.expenseValue)))
    return entries.map(item => ({
      label: item.label,
      income: Math.max(4, Math.round((item.incomeValue / maxValue) * 140)),
      expense: Math.max(4, Math.round((item.expenseValue / maxValue) * 140)),
    }))
  })

  const isLoading = computed(() => isSummaryLoading.value || isTransactionsLoading.value)

  const { success: notify, error: showError } = useNotification()

  const editTransactionMutation = useMutation({
    mutationFn: (params: {
      transactionId: string
      amount?: number
      method?: PaymentMethod
      notes?: string
      exchangeRate?: number
      paymentsBreakdown?: PaymentBreakdownItem[]
    }) => updateTransaction(params),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-employee-payments'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      ])
      notify('Cobro actualizado correctamente')
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al actualizar el cobro')
    },
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (params: { transactionId: string }) => deleteTransaction(params),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-employee-payments'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      ])
      notify('Cobro eliminado correctamente')
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al eliminar el cobro')
    },
  })

  const deleteProductSaleMutation = useMutation({
    mutationFn: (movementId: string) => deleteProductSale(movementId),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
        queryClient.invalidateQueries({ exact: false, queryKey: ['financial-summary'] }),
      ])
      notify('Venta de producto eliminada correctamente')
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al eliminar la venta')
    },
  })

  const {
    showEditModal, editingTransaction, editingAmount, editingCurrency, setEditingCurrency,
    editingMethod, editingBreakdown, editingNotes,
    isEditingMixed, editingTotalAmount, paymentMethodOptions,
    startEdit, cancelEdit, setEditingMethod,
    updateBreakdownItem, addBreakdownItem, removeBreakdownItem,
    saveEdit: onSaveEdit, confirmDeleteTransaction,
  } = useTransactionEdit(showError)

  const saveEdit = () => {
    onSaveEdit((params) => {
      editTransactionMutation.mutate({
        transactionId: params.transactionId,
        amount: params.amount,
        method: params.method,
        notes: params.notes,
        paymentsBreakdown: params.paymentsBreakdown,
      })
    })
  }

  const handleConfirmDelete = (txId: string) => {
    confirmDeleteTransaction(txId, (id) => {
      deleteTransactionMutation.mutate({ transactionId: id })
    })
  }

  const handleDeleteProductSale = (movementId: string, productName: string) => {
    if (window.confirm(`¿Eliminar la venta de "${productName}"?\n\nEl stock se devolverá al inventario. Esta acción no se puede deshacer.`)) {
      deleteProductSaleMutation.mutate(movementId)
    }
  }

  return {
    summaryBuckets,
    transactions,
    allTransactions: unifiedTransactions,
    transactionsAll,
    incomeTotal,
    localIncomeTotal,
    employeePaymentsTotal,
    vesIncomeTotal,
    servicesRevenue,
    chartData,
    employeePayments,
    employeeEarningsByEmployee,
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
