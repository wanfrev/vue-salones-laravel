import { formatMethod } from './formatters'

/**
 * Cómo se pagó una gift card al venderla. Es dinero recibido (entra al Cuadre del Día), no ingreso de Finanzas: el
 * ingreso se reconoce cuando la gift card se usa en el POS. La moneda de cada línea la decide su método, igual que en el
 * POS: efectivo Bs, transferencia, pago móvil y punto de venta se escriben en bolívares; el resto en dólares.
 * Estas funciones solo convierten y validan lo que se escribe; el servidor vuelve a validarlo todo.
 */
export type GiftCardPayMethod = 'cash' | 'cash_ves' | 'card' | 'transfer' | 'zelle' | 'binance' | 'pago_movil' | 'punto_venta' | 'other'

export const PAY_METHODS: { value: GiftCardPayMethod; label: string; currency: 'USD' | 'VES'; bank: boolean }[] = [
  { value: 'cash', label: 'Efectivo ($)', currency: 'USD', bank: false },
  { value: 'zelle', label: 'Zelle', currency: 'USD', bank: false },
  { value: 'card', label: 'Tarjeta', currency: 'USD', bank: false },
  { value: 'binance', label: 'Binance', currency: 'USD', bank: false },
  { value: 'cash_ves', label: 'Efectivo (Bs)', currency: 'VES', bank: false },
  { value: 'pago_movil', label: 'Pago Móvil', currency: 'VES', bank: true },
  { value: 'transfer', label: 'Transferencia', currency: 'VES', bank: true },
  { value: 'punto_venta', label: 'Punto de Vta (Bs)', currency: 'VES', bank: true },
  { value: 'other', label: 'Otro', currency: 'USD', bank: false },
]

/** Una línea del cobro: `amount` está en la moneda de su método (Bs para los de bolívares, $ para el resto). */
export interface PaymentLine {
  method: GiftCardPayMethod
  amount: number | null
  bankId: string | null
}

const info = (method: GiftCardPayMethod) => PAY_METHODS.find(m => m.value === method)!

export const methodCurrency = (method: GiftCardPayMethod): 'USD' | 'VES' => info(method).currency
export const methodHasBank = (method: GiftCardPayMethod): boolean => info(method).bank

const round2 = (n: number) => Math.round(n * 100) / 100

/** Dólares que vale una línea (las de bolívares se convierten con la tasa). */
export function lineUsd(line: PaymentLine, rate: number): number {
  const amount = Number(line.amount ?? 0)
  if (!(amount > 0)) return 0
  if (methodCurrency(line.method) === 'USD') return round2(amount)
  return rate > 0 ? round2(amount / rate) : 0
}

export const totalUsd = (lines: PaymentLine[], rate: number): number => round2(lines.reduce((s, l) => s + lineUsd(l, rate), 0))

export const hasVesLine = (lines: PaymentLine[]): boolean => lines.some(l => methodCurrency(l.method) === 'VES')

/** Lo que se escribe en una línea (en la moneda de su método) para que valga `usd` dólares. */
export function amountForUsd(method: GiftCardPayMethod, usd: number, rate: number): number {
  if (methodCurrency(method) === 'USD') return round2(usd)
  return round2(usd * (rate > 0 ? rate : 0))
}

/** Por qué el cobro no se puede guardar (null si está bien). `target` = lo que deben sumar, en dólares. */
export function paymentError(lines: PaymentLine[], rate: number, target?: number | null): string | null {
  if (!lines.length) return 'Indica cómo se pagó la gift card.'
  if (lines.some(l => !(Number(l.amount ?? 0) > 0))) return 'Cada forma de pago necesita un monto mayor a 0.'
  if (hasVesLine(lines) && !(rate > 0)) return 'Falta la tasa de cambio para pagos en bolívares.'
  if (target != null && Math.abs(totalUsd(lines, rate) - target) > 0.02) {
    return `Lo pagado ($${totalUsd(lines, rate).toFixed(2)}) no coincide con el monto de la gift card ($${target.toFixed(2)}).`
  }
  return null
}

/** Cuerpo para el servidor: las líneas tal cual, y la tasa solo si hay pagos en bolívares. */
export function toPayload(lines: PaymentLine[], rate: number, paidDate?: string | null) {
  return {
    lines: lines.map(l => ({ method: l.method, input_amount: Number(l.amount), bank_id: methodHasBank(l.method) ? (l.bankId || null) : null })),
    ...(hasVesLine(lines) ? { exchange_rate: rate } : {}),
    ...(paidDate ? { paid_date: paidDate } : {}),
  }
}

/** Lo que se guarda de cada línea (formato del desglose del POS). */
export interface SavedSplit { method: string; currency: 'USD' | 'VES'; inputAmount: number; amount: number; bankName?: string | null }

/** «Efectivo ($) $50.00» · «Pago Móvil (Banesco) 5.000,00 Bs»: cómo se pagó, para mostrarlo en la gift card. */
export function describePayment(splits: SavedSplit[]): string {
  return splits
    .map(s => {
      const label = formatMethod(s.method) + (s.bankName ? ` (${s.bankName})` : '')
      const amount = s.currency === 'VES'
        ? `${Number(s.inputAmount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
        : `$${Number(s.amount).toFixed(2)}`
      return `${label} ${amount}`
    })
    .join(' + ')
}
