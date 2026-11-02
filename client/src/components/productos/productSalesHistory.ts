import { toISODate } from '../../lib/formatters'

export type RangePreset = '30' | '90' | '180' | '365'
export type SalesSort = 'recent' | 'units' | 'name'

/** Rangos que se ofrecen. El servidor acepta hasta 12 meses; por defecto, 3. */
export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
]

export const SORT_OPTIONS: { value: SalesSort; label: string }[] = [
  { value: 'recent', label: 'Compra más reciente' },
  { value: 'units', label: 'Más unidades' },
  { value: 'name', label: 'Nombre (A–Z)' },
]

/** Fechas locales (YYYY-MM-DD) de un rango que termina hoy e incluye hoy: «30 días» son hoy y los 29 anteriores. */
export function rangeFromPreset(preset: RangePreset, today: Date = new Date()): { start: string; end: string } {
  const days = Number(preset)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  return { start: toISODate(start), end: toISODate(today) }
}

export interface PaymentBadge { label: string; tone: 'warning' | 'info' }

/** Las ventas a crédito y las cortesías se marcan; una venta normal no lleva etiqueta. */
export function salePaymentBadge(sale: { is_credit?: boolean; is_courtesy?: boolean }): PaymentBadge | null {
  if (sale.is_credit) return { label: 'Crédito', tone: 'warning' }
  if (sale.is_courtesy) return { label: 'Cortesía', tone: 'info' }
  return null
}

/** «1 vez» / «3 veces». */
export function timesLabel(n: number): string {
  return `${n} ${n === 1 ? 'vez' : 'veces'}`
}

/** Unidades sin ceros sobrantes: 2 → «2», 1.5 → «1.5». */
export function unitsLabel(n: number): string {
  return String(Number(n.toFixed(3)))
}

/** Clave de una fila de compradora: las ventas sin cliente registrado van todas juntas bajo «none». */
export function buyerKey(clientId: string | null): string {
  return clientId ?? 'none'
}
