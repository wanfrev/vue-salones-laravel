import { db } from '../../lib/api'
import type { Cita, PaymentEditContext } from '../../types/cita'
import type { PaymentMethod } from '../../types/database'

interface RawTxRow {
  id: string
  appointment_id?: string | null
  total_amount: number | string
  method: string
  exchange_rate_used?: number | string | null
  payments_breakdown?: Array<{
    method: PaymentMethod
    inputAmount: number
    currency: 'USD' | 'VES'
    amount: number
    bank_id?: string
    bank_name?: string
  }> | null
  notes?: string | null
  tip_amount?: number | string | null
}

const VES_METHODS = new Set<string>(['cash_ves', 'transfer', 'pago_movil', 'punto_venta'])

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildContextFromSingleTx(tx: RawTxRow, appointmentId: string): PaymentEditContext {
  const rate = Number(tx.exchange_rate_used ?? 1) || 1
  const breakdown = Array.isArray(tx.payments_breakdown) && tx.payments_breakdown.length > 0
    ? tx.payments_breakdown
    : undefined

  const paymentData: PaymentEditContext = {
    transactionId: tx.id,
    appointmentId,
    method: tx.method as PaymentMethod,
    amount: Number(tx.total_amount ?? 0),
    currency: 'USD',
    exchangeRate: rate,
    tipAmount: Number(tx.tip_amount ?? 0),
    notes: tx.notes || undefined,
    breakdown,
  }

  const firstBreakdown = breakdown?.[0]
  if (breakdown && breakdown.length === 1 && firstBreakdown?.currency === 'VES') {
    paymentData.currency = 'VES'
    paymentData.amount = Number(firstBreakdown.inputAmount ?? round2(paymentData.amount * rate))
  } else if (!breakdown && VES_METHODS.has(tx.method)) {
    paymentData.currency = 'VES'
    paymentData.amount = round2(paymentData.amount * rate)
  }

  return paymentData
}

/**
 * Construye el contexto de edición de cobro para CitaFormModal/PaymentEditor.
 *
 * Para citas que pertenecen a un grupo (`groupId`), suma TODAS las transacciones del
 * grupo en vez de cargar solo la sub-cita abierta — de lo contrario, guardar la modal
 * prorrateaba el monto de un solo servicio sobre todo el grupo (encogiendo todos los
 * servicios y sus comisiones a centavos).
 */
export function buildPaymentEditContextFromTransactions(
  rows: RawTxRow[],
  primaryAppointmentId: string,
): PaymentEditContext | null {
  if (!rows || rows.length === 0) return null

  const primary = rows.find(r => r.appointment_id === primaryAppointmentId) ?? rows[0]
  if (rows.length === 1) {
    return buildContextFromSingleTx(primary, primaryAppointmentId)
  }

  const rate = Number(primary.exchange_rate_used ?? 1) || 1
  const totalUsd = round2(rows.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0))
  const totalTip = round2(rows.reduce((sum, r) => sum + Number(r.tip_amount ?? 0), 0))

  const mergedMap = new Map<string, {
    method: PaymentMethod
    currency: 'USD' | 'VES'
    inputAmount: number
    amount: number
    bank_id?: string
    bank_name?: string
  }>()

  for (const row of rows) {
    const rowRate = Number(row.exchange_rate_used ?? rate) || 1
    const rowUsd = Number(row.total_amount ?? 0)
    const items = Array.isArray(row.payments_breakdown) && row.payments_breakdown.length > 0
      ? row.payments_breakdown
      : [{
          method: row.method as PaymentMethod,
          currency: (VES_METHODS.has(row.method) ? 'VES' : 'USD') as 'USD' | 'VES',
          inputAmount: VES_METHODS.has(row.method) ? round2(rowUsd * rowRate) : rowUsd,
          amount: rowUsd,
        }]

    for (const item of items) {
      const key = `${item.method}:${item.currency}`
      const existing = mergedMap.get(key)
      if (existing) {
        existing.inputAmount = round2(existing.inputAmount + Number(item.inputAmount ?? 0))
        existing.amount = round2(existing.amount + Number(item.amount ?? 0))
      } else {
        mergedMap.set(key, {
          method: item.method,
          currency: item.currency,
          inputAmount: round2(Number(item.inputAmount ?? 0)),
          amount: round2(Number(item.amount ?? 0)),
          bank_id: item.bank_id,
          bank_name: item.bank_name,
        })
      }
    }
  }

  const mergedBreakdown = [...mergedMap.values()]
  const isMixed = mergedBreakdown.length > 1
  const singleEntry = !isMixed ? mergedBreakdown[0] : undefined
  const currency: 'USD' | 'VES' = !isMixed && singleEntry?.currency === 'VES' ? 'VES' : 'USD'
  const amount = isMixed
    ? totalUsd
    : (currency === 'VES'
        ? (singleEntry && singleEntry.inputAmount > 0 ? singleEntry.inputAmount : round2(totalUsd * rate))
        : totalUsd)

  return {
    transactionId: primary.id,
    appointmentId: primaryAppointmentId,
    method: isMixed ? 'mixed' : ((singleEntry?.method ?? primary.method) as PaymentMethod),
    amount,
    currency,
    exchangeRate: rate,
    tipAmount: totalTip,
    notes: primary.notes || undefined,
    breakdown: mergedBreakdown.length > 0 ? mergedBreakdown : undefined,
  }
}

export async function loadPaymentEditContext(cita: Cita): Promise<PaymentEditContext | null> {
  if (cita.paymentStatus !== 'paid' && cita.status !== 'paid') {
    return null
  }

  if (cita.groupId) {
    const { data: groupAppointments } = await db
      .from('appointments')
      .select('id')
      .eq('group_id', cita.groupId)

    const appointmentIds = (groupAppointments ?? []).map((a: any) => a.id).filter(Boolean)
    if (appointmentIds.length > 0) {
      const { data: groupTxs } = await db
        .from('transactions')
        .select('id, appointment_id, total_amount, method, exchange_rate_used, payments_breakdown, notes, tip_amount')
        .in('appointment_id', appointmentIds)
        .order('created_at', { ascending: false })

      if (Array.isArray(groupTxs) && groupTxs.length > 0) {
        return buildPaymentEditContextFromTransactions(groupTxs as RawTxRow[], cita.id)
      }
    }
  }

  const { data: tx } = await db
    .from('transactions')
    .select('id, appointment_id, total_amount, method, exchange_rate_used, payments_breakdown, notes, tip_amount')
    .eq('appointment_id', cita.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!tx) return null
  return buildPaymentEditContextFromTransactions([tx as RawTxRow], cita.id)
}
