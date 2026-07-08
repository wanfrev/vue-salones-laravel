import { formatDate, formatTime } from '../lib/formatters'
import { api as supabase } from '../lib/api'
import type { EmployeePayment } from '../types/database'

export const dashboardKeys = {
  appointments: (businessId?: string | null, employeeId?: string | null, branchId?: string | null) => ['employee-appointments', businessId, employeeId, branchId] as const,
  earnings: (businessId?: string | null, employeeId?: string | null, branchId?: string | null) => ['employee-earnings', businessId, employeeId, branchId] as const,
  payments: (businessId?: string | null, employeeId?: string | null, branchId?: string | null) => ['employee-payments', businessId, employeeId, branchId] as const,
  history: (businessId?: string | null, employeeId?: string | null, branchId?: string | null) => ['employee-history', businessId, employeeId, branchId] as const,
}

export interface EmployeeAppointmentRecord {
  id: string
  date: string
  time: string
  clientName: string
  serviceName: string
  servicePrice: number
  status: string
  paymentStatus: string
}

export interface EmployeeEarningRecord {
  id: string
  date: string
  paidAt: string
  clientName: string
  serviceName: string
  totalAmount: number
  exchangeRateUsed: number
  method: string
  currency: 'USD' | 'VES'
  employeePercentage: number
  employeeEarnings: number
  tipAmount: number
}

export const listEmployeeAppointments = async (
  businessId: string,
  employeeId: string,
  branchId?: string | null
): Promise<EmployeeAppointmentRecord[]> => {
  let query = supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      payment_status,
      clients ( full_name ),
      services ( name, price )
    `)
    .eq('business_id', businessId)
    .or(`employee_id.eq.${employeeId},assistant_employee_id.eq.${employeeId}`)
    .in('status', ['confirmed', 'completed', 'cancelled', 'no_show', 'pending'])
    .order('start_time', { ascending: false })
    .limit(100)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error

  type ApptRow = {
    id: string; start_time: string; end_time: string; status: string; payment_status: string
    clients: { full_name: string } | null; services: { name: string; price: number } | null
  }
  return (data ?? []).map((row: ApptRow) => ({
    id: row.id,
    date: formatDate(row.start_time),
    time: formatTime(row.start_time),
    clientName: row.clients?.full_name ?? '—',
    serviceName: row.services?.name ?? '—',
    servicePrice: Number(row.services?.price ?? 0),
    status: row.status,
    paymentStatus: row.payment_status,
  }))
}

export const listEmployeeTransactions = async (
  businessId: string,
  employeeId: string,
  branchId?: string | null
): Promise<EmployeeEarningRecord[]> => {
  const extractTipAllocations = (paymentsBreakdown: any): Map<string, number> => {
    const map = new Map<string, number>()
    const rows = Array.isArray(paymentsBreakdown) ? paymentsBreakdown : []
    for (const split of rows) {
      const allocations = Array.isArray((split as any)?.tip_allocations) ? (split as any).tip_allocations : []
      for (const alloc of allocations) {
        const id = String(alloc?.employee_id ?? '')
        const amount = Number(alloc?.amount ?? 0)
        if (!id || amount <= 0) continue
        map.set(id, Number(((map.get(id) ?? 0) + amount).toFixed(2)))
      }
    }
    return map
  }
  // Step 1: Get appointments in business/branch to map transactions to client and fallback service data.
  let apptQuery = supabase
    .from('appointments')
    .select('id, employee_id, assistant_employee_id, assistant_percentage, client_id, service_id, employee_percentage_override, group_id')
    .eq('business_id', businessId)

  if (branchId) apptQuery = apptQuery.eq('branch_id', branchId)

  const { data: apptData, error: apptError } = await apptQuery
  if (apptError) throw apptError

  type ApptRow = {
    id: string
    employee_id: string
    assistant_employee_id: string | null
    assistant_percentage: number | null
    client_id: string
    service_id: string
    employee_percentage_override: number | null
    group_id: string | null
  }
  const appts = (apptData ?? []) as ApptRow[]
  const apptIds = appts.map(a => a.id)
  if (apptIds.length === 0) return []

  // Step 2: Get appointment_services rows where employee participates as main or assistant.
  type AppointmentServiceRow = {
    id: string
    appointment_id: string
    service_id: string
    employee_id: string
    assistant_id: string | null
    assistant_percentage: number | null
    price_applied: number
  }
  const { data: apptServicesData, error: apptServicesError } = await supabase
    .from('appointment_services')
    .select('id, appointment_id, service_id, employee_id, assistant_id, assistant_percentage, price_applied')
    .in('appointment_id', apptIds)
    .or(`employee_id.eq.${employeeId},assistant_id.eq.${employeeId}`)

  if (apptServicesError) throw apptServicesError

  const apptServices = (apptServicesData ?? []) as AppointmentServiceRow[]

  // Step 3: Resolve service/client names and reference percentages.
  const clientIds = Array.from(new Set(appts.map(a => a.client_id).filter(Boolean)))
  const serviceIdsFromAppointments = appts.map(a => a.service_id).filter(Boolean)
  const serviceIdsFromPivot = apptServices.map(s => s.service_id).filter(Boolean)
  const serviceIds = Array.from(new Set([...serviceIdsFromAppointments, ...serviceIdsFromPivot]))

  type ClientRow = { id: string; full_name: string | null }
  type ServiceRow = { id: string; name: string | null; local_percentage: number | null }
  type ProfileRow = { id: string; pay_type: string | null; pay_percentage: number | null }

  const [clientsRes, servicesRes, employeeProfileRes] = await Promise.all([
    clientIds.length > 0
      ? supabase.from('clients').select('id, full_name').in('id', clientIds)
      : Promise.resolve({ data: [] as ClientRow[], error: null }),
    serviceIds.length > 0
      ? supabase.from('services').select('id, name, local_percentage').in('id', serviceIds)
      : Promise.resolve({ data: [] as ServiceRow[], error: null }),
    supabase.from('profiles').select('id, pay_type, pay_percentage').eq('id', employeeId).maybeSingle(),
  ])

  if (clientsRes.error) throw clientsRes.error
  if (servicesRes.error) throw servicesRes.error
  if (employeeProfileRes.error) throw employeeProfileRes.error

  const clientsMap = new Map<string, string>()
  for (const c of (clientsRes.data ?? [])) clientsMap.set(c.id, c.full_name ?? c.id)

  const servicesMap = new Map<string, { name: string; localPct: number }>()
  for (const s of (servicesRes.data ?? [])) {
    servicesMap.set(s.id, {
      name: s.name ?? s.id,
      localPct: Number(s.local_percentage ?? 50),
    })
  }

  const apptMap = new Map<string, ApptRow>(appts.map(a => [a.id, a]))

  const groupToAppts = new Map<string, ApptRow[]>()
  const apptToGroup = new Map<string, string>()
  for (const a of appts) {
    if (a.group_id) {
      const list = groupToAppts.get(a.group_id) ?? []
      list.push(a)
      groupToAppts.set(a.group_id, list)
      apptToGroup.set(a.id, a.group_id)
    }
  }

  const processedGroups = new Set<string>()

  // Step 4: Get transactions and project rows per employee-service.
  type TxRow = {
    id: string; paid_at: string; total_amount: number; exchange_rate_used: number | null
    employee_amount: number; employee_percentage: number; assistant_amount: number | null; assistant_percentage: number | null
    tip_amount: number | null
    method: string | null; payments_breakdown: any; appointment_id: string
  }
  let txQuery = supabase
    .from('transactions')
    .select('id, paid_at, total_amount, exchange_rate_used, employee_amount, employee_percentage, assistant_amount, assistant_percentage, tip_amount, method, payments_breakdown, appointment_id')
    .eq('business_id', businessId)
    .in('appointment_id', apptIds)
    .order('paid_at', { ascending: false })

  if (branchId) {
    txQuery = txQuery.eq('branch_id', branchId)
  }

  const { data, error } = await txQuery

  if (error) throw error

  const raw = (data ?? []) as TxRow[]

  const txByAppt = new Map<string, TxRow>(raw.map(r => [r.appointment_id, r]))

  const employeeProfile = employeeProfileRes.data as ProfileRow | null

  const appointmentServicesMap = new Map<string, AppointmentServiceRow[]>()
  for (const svc of apptServices) {
    const list = appointmentServicesMap.get(svc.appointment_id) ?? []
    list.push(svc)
    appointmentServicesMap.set(svc.appointment_id, list)
  }

  const result: EmployeeEarningRecord[] = []

  for (const row of raw) {
    const totalAmount = Number(row.total_amount)
    const exchangeRateUsed = Number(row.exchange_rate_used ?? 1)
    const method = row.method ?? 'cash'
    const appt = apptMap.get(row.appointment_id)
    if (!appt) continue

    const isMixed = method === 'mixed'
    const isVESMethod = ['cash_ves', 'transfer', 'pago_movil'].includes(method)

    let currency: 'USD' | 'VES' = 'USD'
    if (isVESMethod) {
      currency = 'VES'
    } else if (isMixed && row.payments_breakdown) {
      const breakdown = Array.isArray(row.payments_breakdown) ? row.payments_breakdown : []
      const hasVES = breakdown.some((b: any) => b.currency === 'VES')
      if (hasVES) currency = 'VES'
    }

    const groupId = appt.group_id

    if (groupId) {
      if (processedGroups.has(groupId)) continue
      processedGroups.add(groupId)

      const groupAppts = groupToAppts.get(groupId) ?? []
      const allPivotRows = groupAppts.flatMap(a => appointmentServicesMap.get(a.id) ?? [])
      const employeePivots = allPivotRows.filter(svc =>
        svc.employee_id === employeeId || (svc.assistant_id != null && svc.assistant_id === employeeId)
      )

      const isAnyMain = groupAppts.some(a => a.employee_id === employeeId)
      const isAnyAssistant = groupAppts.some(a => a.assistant_employee_id != null && a.assistant_employee_id === employeeId)

      if (employeePivots.length > 0) {
        const groupTx = groupAppts.map(a => txByAppt.get(a.id)).find(t => t)
        const groupRow = groupTx ?? row

        const serviceNames: string[] = []
        let combinedTotal = 0
        let combinedEarnings = 0

        for (const svc of employeePivots) {
          const svcAppt = apptMap.get(svc.appointment_id)
          const meta = servicesMap.get(svc.service_id)
          serviceNames.push(meta?.name ?? svc.service_id)
          const svcPrice = Number(svc.price_applied ?? 0)
          combinedTotal += svcPrice

          const isAsst = svc.assistant_id != null && svc.assistant_id === employeeId
          const overridePct = svcAppt?.employee_percentage_override
          const assistantPct = Number(svc.assistant_percentage ?? svcAppt?.assistant_percentage ?? 0)
          const defaultEmployeePct = Number(groupRow.employee_percentage ?? 50)
          const pct = isAsst ? assistantPct : (overridePct ?? defaultEmployeePct)
          combinedEarnings += Number((svcPrice * pct / 100).toFixed(2))
        }

        const groupTip = Number(groupRow.tip_amount ?? 0)
        const displayPct = Number(groupRow.employee_percentage ?? 50)
        const percentage = isAnyAssistant && !isAnyMain ? Number(employeePivots[0]?.assistant_percentage ?? 0) : displayPct
        const tipAmount = isAnyMain ? groupTip : 0

        result.push({
          id: `group:${groupId}:${employeeId}`,
          date: formatDate(groupRow.paid_at),
          paidAt: groupRow.paid_at,
          clientName: clientsMap.get(appt.client_id) ?? '—',
          serviceName: serviceNames.join(' + '),
        totalAmount: combinedTotal,
          exchangeRateUsed: Number(groupRow.exchange_rate_used ?? 1),
          method: groupRow.method ?? 'cash',
          currency,
        employeePercentage: percentage,
          employeeEarnings: Number((combinedEarnings + tipAmount).toFixed(2)),
          tipAmount,
        })
        continue
      }

      if (!isAnyMain && !isAnyAssistant) continue

      let combinedTotal = 0
      let combinedTip = 0
      let combinedEarnings = 0
      const serviceNames: string[] = []

      for (const ga of groupAppts) {
        const gaTx = txByAppt.get(ga.id)
        if (!gaTx) continue
        const gaServiceAmount = Number(gaTx.total_amount) - Number(gaTx.tip_amount ?? 0)
        combinedTotal += Number(gaTx.total_amount)
        combinedTip += Number(gaTx.tip_amount ?? 0)
        serviceNames.push(servicesMap.get(ga.service_id)?.name ?? ga.service_id)

        const isAsst = ga.assistant_employee_id != null && ga.assistant_employee_id === employeeId
        const overridePct = ga.employee_percentage_override
        const defaultPct = Number(gaTx.employee_percentage ?? 50)
        const assistantPct = Number(gaTx.assistant_percentage ?? 0)
        const pct = isAsst ? assistantPct : (overridePct ?? defaultPct)
        combinedEarnings += Number((gaServiceAmount * pct / 100).toFixed(2))
      }

      if (combinedTotal === 0) continue

      const firstTx = groupAppts.map(a => txByAppt.get(a.id)).find(t => t != null)
      const percentage = isAnyAssistant && !isAnyMain
        ? Number(firstTx?.assistant_percentage ?? 0)
        : Number(firstTx?.employee_percentage ?? 50)
      const tipAmount = isAnyMain ? combinedTip : 0

      result.push({
        id: `group:${groupId}:${employeeId}`,
        date: formatDate(firstTx?.paid_at ?? row.paid_at),
        paidAt: firstTx?.paid_at ?? row.paid_at,
        clientName: clientsMap.get(appt.client_id) ?? '—',
        serviceName: serviceNames.join(' + '),
        totalAmount: combinedTotal - combinedTip,
        exchangeRateUsed: Number(firstTx?.exchange_rate_used ?? 1),
        method: firstTx?.method ?? 'cash',
        currency,
        employeePercentage: percentage,
        employeeEarnings: Number((combinedEarnings + tipAmount).toFixed(2)),
        tipAmount,
      })
      continue
    }

    const pivotRows = appointmentServicesMap.get(row.appointment_id) ?? []
    const tipAllocationsMap = extractTipAllocations(row.payments_breakdown)
    const explicitTipForEmployee = Number(tipAllocationsMap.get(employeeId) ?? 0)

    if (pivotRows.length > 0) {
      const servicePortion = Number(totalAmount - Number(row.tip_amount ?? 0))
      const totalPivotPrice = pivotRows.reduce((sum, svc) => sum + Number(svc.price_applied ?? 0), 0)

      for (const svc of pivotRows) {
        const isMain = svc.employee_id === employeeId
        const isAssistant = svc.assistant_id != null && svc.assistant_id === employeeId
        if (!isMain && !isAssistant) continue

        const serviceMeta = servicesMap.get(svc.service_id)
        const serviceName = serviceMeta?.name ?? svc.service_id
        const servicePrice = Number(svc.price_applied ?? 0)
        const proportionalTotal = totalPivotPrice > 0
          ? Number((servicePortion * servicePrice / totalPivotPrice).toFixed(2))
          : servicePrice

        const assistantPct = Number(row.assistant_percentage ?? svc.assistant_percentage ?? appt.assistant_percentage ?? 0)
        const overridePct = appt.employee_percentage_override
        const employeePct = overridePct ?? Number(row.employee_percentage ?? 50)
        const percentage = isAssistant ? assistantPct : employeePct
        const earningsFromService = Number((proportionalTotal * percentage / 100).toFixed(2))

        const tipAmount = !isAssistant && appt.employee_id === employeeId
          ? Number(row.tip_amount ?? 0)
          : 0

        result.push({
          id: `${row.id}:${svc.id}:${isAssistant ? 'assistant' : 'main'}`,
          date: formatDate(row.paid_at),
          paidAt: row.paid_at,
          clientName: clientsMap.get(appt.client_id) ?? '—',
          serviceName,
          totalAmount: proportionalTotal,
          exchangeRateUsed,
          method,
          currency,
          employeePercentage: percentage,
          employeeEarnings: Number((earningsFromService + tipAmount).toFixed(2)),
          tipAmount,
        })
      }

      continue
    }

    // Fallback for legacy rows without appointment_services.
    const isAssistant = appt.assistant_employee_id != null && appt.assistant_employee_id === employeeId
    const payType = employeeProfile?.pay_type ?? 'percentage'
    const percentage = isAssistant
      ? Number(row.assistant_percentage ?? 0)
      : payType === 'salary'
        ? 0
        : Number(row.employee_percentage ?? 0)
    const earningsFromService = isAssistant
      ? Number(row.assistant_amount ?? 0)
      : payType === 'salary'
        ? 0
        : Math.max(0, Number(row.employee_amount ?? 0) - Number(row.tip_amount ?? 0))

    const tipAmount = explicitTipForEmployee > 0
      ? explicitTipForEmployee
      : Number(row.tip_amount ?? 0)

    result.push({
      id: row.id,
      date: formatDate(row.paid_at),
      paidAt: row.paid_at,
      clientName: clientsMap.get(appt.client_id) ?? '—',
      serviceName: servicesMap.get(appt.service_id)?.name ?? appt.service_id,
      totalAmount: Number(row.total_amount) - Number(row.tip_amount ?? 0),
      exchangeRateUsed,
      method,
      currency,
      employeePercentage: percentage,
      employeeEarnings: Number((earningsFromService + tipAmount).toFixed(2)),
      tipAmount,
    })
  }

  return result.sort((a, b) => b.paidAt.localeCompare(a.paidAt))
}

export const listEmployeePayments = async (
  businessId: string,
  employeeId: string,
  branchId?: string | null
): Promise<EmployeePayment[]> => {
  let query = supabase
    .from('employee_payments')
    .select('*')
    .eq('business_id', businessId)
    .eq('employee_id', employeeId)
    .order('payment_date', { ascending: false })

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as EmployeePayment[]
}
