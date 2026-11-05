import { toISODate } from '../../lib/formatters'

export type MovementType = 'sale' | 'purchase' | 'consumption' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return'
export type PeriodPreset = 'today' | '7' | '30' | 'month' | 'last_month' | '90' | 'year' | 'custom'
export type MovementDirection = '' | 'in' | 'out'
export type MovementSort = 'recent' | 'oldest' | 'quantity'

/** Tipos que se ofrecen como filtro, en el orden en que se muestran. */
export const TYPE_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'sale', label: 'Ventas' },
  { value: 'consumption', label: 'Consumos' },
  { value: 'purchase', label: 'Compras' },
  { value: 'adjustment', label: 'Ajustes' },
  { value: 'transfer_in', label: 'Transferencias (entrada)' },
  { value: 'transfer_out', label: 'Transferencias (salida)' },
  { value: 'return', label: 'Devoluciones' },
]

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'today', label: 'Hoy' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este año' },
  { value: 'custom', label: 'Elegir fechas…' },
]

export const DIRECTION_OPTIONS: { value: MovementDirection; label: string }[] = [
  { value: '', label: 'Entradas y salidas' },
  { value: 'in', label: 'Solo entradas' },
  { value: 'out', label: 'Solo salidas' },
]

export const SORT_OPTIONS: { value: MovementSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'quantity', label: 'Mayor cantidad' },
]

/** El servidor acepta hasta 12 meses (366 días) por consulta. */
export const MAX_RANGE_DAYS = 366

const DAY_MS = 86_400_000
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Fechas locales (YYYY-MM-DD) de un período. «Este mes» y «Este año» llegan hasta hoy; «Mes pasado» es el mes
 * calendario completo anterior; «Últimos N días» incluye hoy. Con `custom` se usan las fechas elegidas tal cual.
 */
export function rangeForPreset(preset: PeriodPreset, today: Date = new Date(), custom: { start: string; end: string } = { start: '', end: '' }): { start: string; end: string } {
  const t = atMidnight(today)
  switch (preset) {
    case 'today': return { start: toISODate(t), end: toISODate(t) }
    case '7':
    case '30':
    case '90': return { start: toISODate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - (Number(preset) - 1))), end: toISODate(t) }
    case 'month': return { start: toISODate(new Date(t.getFullYear(), t.getMonth(), 1)), end: toISODate(t) }
    case 'last_month': return {
      start: toISODate(new Date(t.getFullYear(), t.getMonth() - 1, 1)),
      end: toISODate(new Date(t.getFullYear(), t.getMonth(), 0)),
    }
    case 'year': return { start: toISODate(new Date(t.getFullYear(), 0, 1)), end: toISODate(t) }
    case 'custom': return { start: custom.start, end: custom.end }
  }
}

/** Por qué un rango no se puede consultar (null si está bien). Mismas reglas que el servidor. */
export function rangeError(range: { start: string; end: string }): string | null {
  if (!range.start || !range.end) return 'Elige la fecha inicial y la final.'
  if (range.end < range.start) return 'La fecha final no puede ser anterior a la inicial.'
  const days = Math.round((new Date(`${range.end}T00:00:00`).getTime() - new Date(`${range.start}T00:00:00`).getTime()) / DAY_MS)
  if (days > MAX_RANGE_DAYS) return 'El rango máximo es de 12 meses.'
  return null
}

/** Colores de cada tipo (los de siempre en esta pantalla). */
export function typeTone(type: string): { text: string; dot: string } {
  if (type === 'purchase') return { text: 'text-success', dot: 'bg-success' }
  if (type === 'sale') return { text: 'text-primary', dot: 'bg-primary' }
  if (type === 'adjustment') return { text: 'text-warning', dot: 'bg-warning' }
  if (type === 'consumption') return { text: 'text-danger', dot: 'bg-danger' }
  return { text: 'text-info', dot: 'bg-info' }
}

/** Cantidad con signo explícito: +10 / −2. */
export function signedQty(n: number): string {
  const abs = String(Number(Math.abs(n).toFixed(3)))
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs
}

/** Unidades sin ceros sobrantes. */
export function unitsText(n: number): string {
  return String(Number(n.toFixed(3)))
}

const ORIGIN_LABELS: Record<string, string> = {
  appointment: 'En una cita',
  direct: 'Venta directa',
  employee_payment: 'Consumo de empleado',
  employee_payment_void: 'Reversión de consumo',
  purchase_invoice: 'Factura de compra',
  transfer: 'Transferencia entre sucursales',
  correction: 'Corrección por eliminar una venta',
}

/** De dónde viene el movimiento, en palabras; sin referencia es un movimiento manual. */
export function originLabel(referenceType: string | null | undefined): string {
  return referenceType ? (ORIGIN_LABELS[referenceType] ?? referenceType) : 'Manual'
}

/** «Elena Empleada» → rol en palabras para la etiqueta de la persona a la que afecta. */
export function personLabel(role: string | null | undefined): string {
  return role === 'client' ? 'Cliente' : role === 'employee' ? 'Empleado' : 'Persona'
}
