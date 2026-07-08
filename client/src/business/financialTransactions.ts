import { formatMethod, formatDate } from '../lib/formatters'
import { computeServiceEarnings, type EmployeeCompProfile } from './employeeEarnings'
import type { PaymentBreakdownItem } from '../types/pos'
import type { TransactionRow, UnifiedTransaction, ProductSaleDetail, PaymentRow, EmployeeEarningSummary } from '../composables/finanzas/useFinancialSummary'

export function formatBreakdownLabel(breakdown: PaymentBreakdownItem[] | null | undefined): string {
  if (!breakdown || !Array.isArray(breakdown) || breakdown.length <= 1) return ''
  return breakdown.map(p => {
    const methodName = formatMethod(p.method)
    const amount = p.currency === 'VES'
      ? `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.inputAmount)} Bs`
      : `$${p.inputAmount.toFixed(2)}`
    return `${methodName} ${amount}`
  }).join(' / ')
}

export function sumVESBreakdownInputAmounts(breakdown: PaymentBreakdownItem[] | null | undefined): number {
  if (!breakdown || !Array.isArray(breakdown)) return 0
  return breakdown.filter(b => b.currency === 'VES').reduce((sum, b) => sum + Number(b.inputAmount ?? 0), 0)
}

export function getEffectiveEmployeePercentage(row: {
  employee_percentage: number | null
  appointments?: { employee_percentage_override: number | null } | null
}): number | null {
  const overridePct = row.appointments?.employee_percentage_override
  return overridePct != null ? Number(overridePct) : null
}

export function getProductSaleCurrency(
  refType: string | null, refId: string | null, movementRate: number,
  appointmentPaymentMap: Map<string, { breakdown: PaymentBreakdownItem[]; exchangeRate: number }>,
  movementNotes?: string,
): { currency: 'USD' | 'VES'; exchangeRateUsed: number; originalAmount: (total: number) => number } {
  if (refType === 'appointment' && refId) {
    const paymentEntry = appointmentPaymentMap.get(refId)
    if (paymentEntry) {
      const allVES = paymentEntry.breakdown.length > 0 && paymentEntry.breakdown.every(b => b.currency === 'VES')
      const rate = paymentEntry.exchangeRate ?? 1
      const txNotes = movementNotes ?? ''
      return {
        currency: allVES ? 'VES' : 'USD',
        exchangeRateUsed: rate,
        originalAmount: (total: number) => total * rate,
      }
    }
  }
  return {
    currency: 'USD',
    exchangeRateUsed: movementRate,
    originalAmount: (total: number) => total,
  }
}

export function buildTransactionsAll(rawTransactions: any[]): TransactionRow[] {
  const groupMap = new Map<string, { rows: any[]; services: string[]; employees: string[]; totalAmount: number; totalTip: number; totalVES: number }>()
  const singles: (TransactionRow & { _sortDate: string })[] = []

  for (const row of rawTransactions) {
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
        existing.totalAmount += serviceAmt; existing.totalTip += rowTip; existing.totalVES += vesAmount
      } else {
        groupMap.set(groupId, { rows: [row], services: [serviceName], employees: [employeeName], totalAmount: serviceAmt, totalTip: rowTip, totalVES: vesAmount })
      }
    } else {
      const rowTip = Number((row as any).tip_amount ?? 0)
      const serviceAmt = (row.total_amount as number) - rowTip
      const breakdownLabel = formatBreakdownLabel(breakdown)
      singles.push({
        id: row.id, appointmentId: (row as any).appointment_id as string, date: formatDate(row.paid_at ?? row.created_at),
        client: row.appointments?.clients?.full_name ?? '—', employee: employeeName, service: serviceName,
        method: breakdownLabel || formatMethod(row.method), rawMethod: row.method as any, amount: serviceAmt,
        exchangeRateUsed: row.exchange_rate_used ?? 1, breakdownLabel, breakdown,
        primaryCurrency: isVES ? 'VES' : 'USD', primaryAmount: vesAmount,
        notes: (row as any).notes ?? null, tipAmount: Number((row as any).tip_amount ?? 0), _sortDate: sortDate,
      })
    }
  }

  const grouped: (TransactionRow & { _sortDate: string })[] = []
  for (const [, group] of groupMap) {
    const firstRow = group.rows[0]; const breakdown = (firstRow as any).payments_breakdown as PaymentBreakdownItem[] | null
    const breakdownLabel = formatBreakdownLabel(breakdown); const firstBreakdown = breakdown?.[0]
    const isVES = firstBreakdown?.currency === 'VES'; const sortDate = (firstRow.paid_at ?? firstRow.created_at) as string
    grouped.push({
      id: firstRow.id, appointmentId: (firstRow as any).appointment_id as string, date: formatDate(firstRow.paid_at ?? firstRow.created_at),
      client: firstRow.appointments?.clients?.full_name ?? '—', employee: group.employees.join(', '), service: group.services.join(' + '),
      method: breakdownLabel || formatMethod(firstRow.method), rawMethod: firstRow.method as any, amount: group.totalAmount,
      exchangeRateUsed: firstRow.exchange_rate_used ?? 1, breakdownLabel, breakdown,
      primaryCurrency: isVES ? 'VES' : 'USD', primaryAmount: isVES ? group.totalVES : group.totalAmount,
      notes: (firstRow as any).notes ?? null, tipAmount: group.totalTip, _sortDate: sortDate,
    })
  }

  const result = [...singles, ...grouped]
  result.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
  return result.map(({ _sortDate: _, ...row }) => row)
}

export function buildProductSalesDetails(
  rawInventoryMovements: any[],
  appointmentPaymentMap: Map<string, { breakdown: PaymentBreakdownItem[]; exchangeRate: number }>,
): ProductSaleDetail[] {
  return rawInventoryMovements.map((r: any, idx: number) => {
    const quantity = Math.abs(Number(r.quantity ?? 0)); const unitPrice = Number(r.unit_cost ?? 0); const total = quantity * unitPrice
    const { currency, exchangeRateUsed, originalAmount } = getProductSaleCurrency(r.reference_type ?? null, r.reference_id ?? null, Number(r.exchange_rate_used ?? 1), appointmentPaymentMap, r.notes)
    return { id: r.id ?? `product-${idx}`, date: formatDate(r.created_at), product: r.products?.name ?? 'Sin producto', clientName: r.clients?.full_name || undefined, quantity, unitPrice, total, currency, exchangeRateUsed, originalAmount: currency === 'VES' ? total * exchangeRateUsed : originalAmount(total) }
  })
}

export function buildUnifiedTransactions(
  rawTransactions: any[],
  rawEmployeePayments: any[],
  rawExpenses: any[],
): UnifiedTransaction[] {
  const result: Array<UnifiedTransaction & { sortDate: string }> = []
  const groupMap = new Map<string, { txs: any[]; services: string[]; employees: string[]; totalAmount: number; totalTip: number; totalVES: number }>()

  for (const tx of rawTransactions) {
    const groupId = (tx as any).appointments?.group_id as string | null
    const serviceName = tx.appointments?.services?.name ?? '—'
    const employeeName = tx.appointments?.employee_profile?.full_name ?? '—'
    const breakdown = (tx as any).payments_breakdown as PaymentBreakdownItem[] | null
    const firstBreakdown = breakdown?.[0]; const isVES = firstBreakdown?.currency === 'VES'
    const sumVES = sumVESBreakdownInputAmounts(breakdown)
    const txTip = Number((tx as any).tip_amount ?? 0); const serviceAmt = (tx.total_amount as number) - txTip
    const vesAmount = isVES && sumVES > 0 ? sumVES : serviceAmt

    if (groupId) {
      const existing = groupMap.get(groupId)
      if (existing) {
        existing.txs.push(tx); if (!existing.services.includes(serviceName)) existing.services.push(serviceName)
        if (!existing.employees.includes(employeeName)) existing.employees.push(employeeName)
        existing.totalAmount += serviceAmt; existing.totalTip += txTip; existing.totalVES += vesAmount
      } else {
        groupMap.set(groupId, { txs: [tx], services: [serviceName], employees: [employeeName], totalAmount: serviceAmt, totalTip: txTip, totalVES: vesAmount })
      }
    } else {
      result.push({ id: tx.id, date: formatDate(tx.paid_at ?? tx.created_at), description: (tx.appointments?.clients?.full_name ?? '—') + ' · ' + serviceName, method: formatBreakdownLabel(breakdown) || formatMethod(tx.method), amount: serviceAmt, type: 'ingreso', exchangeRateUsed: tx.exchange_rate_used ?? 1, _currency: isVES ? 'VES' : 'USD', _originalAmount: vesAmount, notes: (tx as any).notes ?? null, tipAmount: Number((tx as any).tip_amount ?? 0), sortDate: tx.paid_at ?? tx.created_at })
    }
  }

  for (const [, group] of groupMap) {
    const firstTx = group.txs[0]; const breakdown = (firstTx as any).payments_breakdown as PaymentBreakdownItem[] | null
    const firstBreakdown = breakdown?.[0]; const isVES = firstBreakdown?.currency === 'VES'
    result.push({ id: firstTx.id, date: formatDate(firstTx.paid_at ?? firstTx.created_at), description: (firstTx.appointments?.clients?.full_name ?? '—') + ' · ' + group.services.join(' + '), method: formatBreakdownLabel(breakdown) || formatMethod(firstTx.method), amount: group.totalAmount, type: 'ingreso', exchangeRateUsed: firstTx.exchange_rate_used ?? 1, _currency: isVES ? 'VES' : 'USD', _originalAmount: isVES ? group.totalVES : group.totalAmount, notes: (firstTx as any).notes ?? null, tipAmount: group.totalTip, sortDate: firstTx.paid_at ?? firstTx.created_at })
  }

  for (const ep of (rawEmployeePayments ?? [])) {
    const epCurrency = ((ep as any).currency === 'VES' ? 'VES' : 'USD') as 'USD' | 'VES'
    result.push({ id: 'ep-' + ep.id, date: formatDate(ep.payment_date), description: 'Pago a ' + (ep.employee_profile?.full_name ?? 'empleado'), method: formatMethod(ep.payment_method), amount: ep.amount, type: 'nomina', sortDate: ep.payment_date, _currency: epCurrency, _originalAmount: epCurrency === 'VES' ? Number((ep as any).original_amount ?? 0) : Number(ep.amount) })
  }

  for (const ex of (rawExpenses ?? [])) {
    const exCurrency = ((ex as any).currency === 'VES' ? 'VES' : undefined) as 'USD' | 'VES' | undefined
    result.push({ id: 'ex-' + ex.id, date: formatDate(ex.expense_date), description: ex.name, method: '—', amount: ex.amount, type: 'gasto', exchangeRateUsed: exCurrency === 'VES' ? Number((ex as any).exchange_rate_used ?? 1) : undefined, _currency: exCurrency, _originalAmount: exCurrency === 'VES' ? Number((ex as any).original_amount ?? 0) : undefined, sortDate: ex.expense_date })
  }

  result.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
  return result.map(({ sortDate: _, ...tx }) => tx)
}

export function buildEmployeePayments(rawTransactions: any[]): PaymentRow[] {
  const rows: PaymentRow[] = []
  for (const row of rawTransactions) {
    const tipAmount = Number((row as any).tip_amount ?? 0)
    const serviceAmount = Math.max(0, Number(row.total_amount ?? 0) - tipAmount)
    const mainCalc = computeServiceEarnings(serviceAmount, row.appointments?.employee_profile, getEffectiveEmployeePercentage(row))
    rows.push({ id: row.id, employee: row.appointments?.employee_profile?.full_name ?? '—', client: row.appointments?.clients?.full_name ?? '—', service: row.appointments?.services?.name ?? '—', amount: row.total_amount, percentage: mainCalc.percentage, earnings: mainCalc.earnings + tipAmount, tipAmount })

    const assistantId = row.appointments?.assistant_employee_id; const assistantPct = Number(row.assistant_percentage ?? 0)
    if (assistantId && assistantPct > 0) {
      rows.push({ id: `${row.id}-asst`, employee: (row.appointments?.assistant_profile?.full_name ?? '—') + ' (asistente)', client: row.appointments?.clients?.full_name ?? '—', service: row.appointments?.services?.name ?? '—', amount: row.total_amount, percentage: assistantPct, earnings: serviceAmount * (assistantPct / 100), tipAmount: 0 })
    }
  }
  return rows
}

export function buildEmployeeEarningsByEmployee(rawTransactions: any[]): EmployeeEarningSummary[] {
  const map = new Map<string, { employeeName: string; payType: string; payPercentage: number; baseSalary: number; commissionTotal: number }>()

  const ensureEntry = (id: string, name: string, profile?: EmployeeCompProfile | null) => {
    if (!id || map.has(id)) return
    const pt = profile?.pay_type ?? 'percentage'
    map.set(id, { employeeName: name || '—', payType: pt, payPercentage: pt === 'salary' ? 0 : Number(profile?.pay_percentage ?? 0), baseSalary: pt === 'percentage' ? 0 : Number(profile?.base_salary ?? 0), commissionTotal: 0 })
  }

  for (const tx of rawTransactions) {
    const appt = tx.appointments; if (!appt) continue
    const mainId = appt.employee_id ?? ''; const mainProfile = appt.employee_profile
    if (mainId) {
      ensureEntry(mainId, mainProfile?.full_name ?? '—', mainProfile)
      const tipAmount = Number((tx as any).tip_amount ?? 0)
      const calc = computeServiceEarnings(Math.max(0, Number(tx.total_amount ?? 0) - tipAmount), mainProfile, getEffectiveEmployeePercentage(tx))
      map.get(mainId)!.commissionTotal += calc.earnings + tipAmount
    }
    const assistantId = appt.assistant_employee_id
    if (assistantId && Number(tx.assistant_percentage ?? 0) > 0) {
      ensureEntry(assistantId, appt.assistant_profile?.full_name ?? '—', appt.assistant_profile)
      map.get(assistantId)!.commissionTotal += Number(tx.total_amount ?? 0) * (Number(tx.assistant_percentage ?? 0) / 100)
    }
  }

  return [...map.entries()].map(([employeeId, data]) => ({ employeeId, employeeName: data.employeeName, payType: data.payType as EmployeeEarningSummary['payType'], payPercentage: data.payPercentage, baseSalary: data.baseSalary, commissionTotal: data.commissionTotal, totalEarned: data.baseSalary + data.commissionTotal }))
}
