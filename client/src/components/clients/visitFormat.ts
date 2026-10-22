/** Textos y estilos del historial de visitas (sin lógica de negocio: los totales los calcula el servidor). */
import { formatMethod } from '../../lib/formatters'
import type { ClientVisit, VisitPayment, VisitState } from '../../types/clientVisits'

const STATE_LABELS: Record<VisitState, string> = {
  attended: 'Atendida',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATE_CLASSES: Record<VisitState, string> = {
  attended: 'bg-success/10 text-success border border-success/30',
  pending: 'bg-warning/10 text-warning border border-warning/30',
  cancelled: 'bg-bg-secondary text-text-muted border border-border',
  no_show: 'bg-danger/10 text-danger border border-danger/30',
}

export function visitStateLabel(visit: Pick<ClientVisit, 'kind' | 'state'>): string {
  return visit.kind === 'sale' ? 'Venta directa' : STATE_LABELS[visit.state]
}

export function visitStateClass(visit: Pick<ClientVisit, 'kind' | 'state'>): string {
  return visit.kind === 'sale' ? 'bg-primary/10 text-primary border border-primary/30' : STATE_CLASSES[visit.state]
}

/** Cancelada / no asistió: se muestran, pero sin monto ni estado de pago (no se cobró nada). */
export function isInactiveVisit(visit: Pick<ClientVisit, 'state'>): boolean {
  return visit.state === 'cancelled' || visit.state === 'no_show'
}

const PAYMENT_STATUS_LABELS: Record<ClientVisit['payment_status'], string> = {
  paid: 'Pagado',
  partial: 'Pago parcial',
  unpaid: 'Sin pagar',
}

const PAYMENT_STATUS_CLASSES: Record<ClientVisit['payment_status'], string> = {
  paid: 'text-success',
  partial: 'text-warning',
  unpaid: 'text-danger',
}

export const paymentStatusLabel = (status: ClientVisit['payment_status']) => PAYMENT_STATUS_LABELS[status]
export const paymentStatusClass = (status: ClientVisit['payment_status']) => PAYMENT_STATUS_CLASSES[status]

const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** 1234.5 -> "$1,234.5" */
export function formatUsd(amount: number): string {
  return `$${numberFormat.format(amount)}`
}

/** "Efectivo ($) $10", "Pago Móvil Bs 400 (Banesco)". Sin moneda = USD. */
export function formatPaymentLine(payment: VisitPayment): string {
  const amount = payment.currency === 'VES' ? `Bs ${numberFormat.format(payment.amount)}` : formatUsd(payment.amount)
  const bank = payment.bank ? ` (${payment.bank})` : ''
  return `${formatMethod(payment.method)} ${amount}${bank}`
}

/** "Shampoo ×2" — la cantidad se omite cuando es 1. */
export function formatProductLine(product: { name: string; quantity: number }): string {
  return product.quantity === 1 ? product.name : `${product.name} ×${numberFormat.format(product.quantity)}`
}

/** "Lucía" o "Lucía + Ana" cuando hubo ayudante. */
export function formatStaff(service: { employee: string | null; assistant: string | null }): string {
  if (service.employee && service.assistant) return `${service.employee} + ${service.assistant}`
  return service.employee ?? service.assistant ?? ''
}
