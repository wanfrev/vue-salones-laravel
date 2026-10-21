/**
 * Cobro del servicio de Luma a cada negocio (lo configura el superadmin, lo ve solo el admin).
 * Tipos y textos puros: el cálculo de cuándo avisar y cuánto vive en el servidor
 * (BillingService::noticeFor); aquí solo se arma el mensaje y el formato.
 */
import { formatDateHuman } from './formatters'

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'none'
export type BillingCurrency = 'USD' | 'VES'

export interface BillingNotice {
  status: 'upcoming' | 'due_today' | 'overdue'
  kind: 'initial' | 'recurring'
  in_trial: boolean
  amount: number
  currency: BillingCurrency
  due_on: string
  days_left: number
  days_overdue: number
  cycle: BillingCycle
  payment_instructions: string | null
  custom_message: string | null
  dismissible: boolean
}

export interface BillingPlan {
  enabled: boolean
  currency: BillingCurrency
  trial_ends_on: string | null
  initial_amount: number | null
  cycle: BillingCycle
  recurring_amount: number | null
  next_due_on: string | null
  next_is_initial: boolean
  remind_days_before: number[]
  payment_instructions: string | null
  custom_message: string | null
}

export interface BillingPayment {
  id: string
  amount: number
  currency: BillingCurrency
  paid_on: string
  covered_due_on: string
  kind: 'initial' | 'recurring'
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface BusinessBillingData {
  plan: BillingPlan | null
  amount_due: number | null
  today: string
  notice_today: BillingNotice | null
  payments: BillingPayment[]
}

export const CYCLE_OPTIONS: { value: BillingCycle; label: string; months: number }[] = [
  { value: 'monthly', label: 'Mensual', months: 1 },
  { value: 'quarterly', label: 'Trimestral', months: 3 },
  { value: 'semiannual', label: 'Semestral', months: 6 },
  { value: 'annual', label: 'Anual', months: 12 },
  { value: 'none', label: 'Pago único (no se repite)', months: 0 },
]

const CYCLE_NOUN: Record<BillingCycle, string> = {
  monthly: 'mensualidad',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  annual: 'anualidad',
  none: 'pago',
}

export function cycleLabel(cycle: BillingCycle): string {
  return CYCLE_OPTIONS.find(c => c.value === cycle)?.label ?? cycle
}

export function formatBillingAmount(amount: number, currency: BillingCurrency): string {
  const n = amount.toLocaleString(currency === 'VES' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'VES' ? `Bs. ${n}` : `$${n}`
}

/** "YYYY-MM-DD" + n meses sin desbordar (31 ene + 1 mes = 28/29 feb), igual que el servidor. */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1 + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
}

function daysText(n: number): string {
  return n === 1 ? '1 día' : `${n} días`
}

/** Título y texto del banner según el estado del aviso. */
export function billingNoticeText(n: BillingNotice): { title: string; body: string } {
  const amount = formatBillingAmount(n.amount, n.currency)
  const date = formatDateHuman(n.due_on)
  const what = n.kind === 'initial' ? 'tu primer pago' : `tu ${CYCLE_NOUN[n.cycle]}`

  if (n.status === 'overdue') {
    return {
      title: 'Tu pago de Luma está pendiente',
      body: `${capitalize(what)} de ${amount} venció el ${date} (hace ${daysText(n.days_overdue)}). Ponte al día para seguir disfrutando de tu aliado sin interrupciones.`,
    }
  }
  if (n.status === 'due_today') {
    return {
      title: 'Hoy toca renovar a tu aliado',
      body: `${capitalize(what)} de ${amount} vence hoy.`,
    }
  }
  if (n.in_trial) {
    return {
      title: n.days_left === 1 ? 'Mañana termina tu mes gratis' : `Tu mes gratis termina en ${daysText(n.days_left)}`,
      body: `Esperamos que Luma te esté ayudando. Para seguir con tu aliado, ${what} será de ${amount} el ${date}.`,
    }
  }
  return {
    title: 'Recuerda renovar a tu aliado',
    body: `${capitalize(what)} de ${amount} vence ${n.days_left === 1 ? 'mañana' : `en ${daysText(n.days_left)}`} (${date}).`,
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Clave para recordar que el admin cerró el banner HOY. Incluye la fecha de vencimiento: si el
 * superadmin marca el pago o cambia la fecha, el aviso nuevo vuelve a salir.
 */
export function billingDismissKey(businessId: string, notice: BillingNotice, today: string): string {
  return `luma:billing-dismissed:${businessId}:${notice.due_on}:${notice.status}:${today}`
}
