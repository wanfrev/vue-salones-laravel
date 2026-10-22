/**
 * Periodos de la gestión de pagos del equipo (nómina y deuda): día, semana (lunes a domingo), mes,
 * «todo» y rango personalizado. TypeScript puro y testeable; antes vivía dentro de GestionTabs.vue.
 *
 * Reglas heredadas, sin cambios:
 *  - La semana empieza el lunes.
 *  - Un mes en curso termina HOY (no se cuentan días que todavía no llegan); uno pasado, su último día.
 *  - «Todo» abarca 2000-01-01 a 2099-12-31 (el servidor necesita fechas, no «sin límite»).
 */
import { toYmd } from '../../lib/periodUtils'
import { parseLocalDate } from '../../lib/formatters'

export type PeriodMode = 'all' | 'day' | 'week' | 'month' | 'custom'

export interface DateRange { start: Date; end: Date }
export interface YmdRange { start: string; end: string }

export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const ALL_START = '2000-01-01'
export const ALL_END = '2099-12-31'

export const dayStart = (d: Date): Date => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }
export const dayEnd = (d: Date): Date => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c }
/** Lunes de la semana de `d`. */
export const weekStart = (d: Date): Date => { const c = dayStart(d); c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); return c }
const monthStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1)
const monthEnd = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

/** 'YYYY-MM' (el valor de <input type="month">). */
export const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** 'YYYY-MM' -> primer día de ese mes; null si no es válido. */
export function parseMonthInput(value: string | undefined | null): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!m) return null
  const month = Number(m[2])
  return month >= 1 && month <= 12 ? new Date(Number(m[1]), month - 1, 1) : null
}

export interface CustomRange { start: string; end: string }

/** Rango de fechas de un periodo. `anchor` es cualquier fecha dentro del periodo elegido. */
export function periodRange(mode: PeriodMode, anchor: Date, now: Date = new Date(), custom?: Partial<CustomRange>): DateRange {
  if (mode === 'all') return { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31, 23, 59, 59, 999) }
  if (mode === 'custom') {
    return {
      start: custom?.start ? dayStart(parseLocalDate(custom.start)) : new Date(2000, 0, 1),
      end: custom?.end ? dayEnd(parseLocalDate(custom.end)) : new Date(2099, 11, 31, 23, 59, 59, 999),
    }
  }
  if (mode === 'day') return { start: dayStart(anchor), end: dayEnd(anchor) }
  if (mode === 'week') {
    const start = weekStart(anchor)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { start, end: dayEnd(end) }
  }
  const isCurrent = anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth()
  return { start: monthStart(anchor), end: isCurrent ? dayEnd(now) : monthEnd(anchor) }
}

/** Lo mismo que periodRange, en texto Y-m-d (lo que viaja al servidor). */
export function periodYmd(mode: PeriodMode, anchor: Date, now: Date = new Date(), custom?: Partial<CustomRange>): YmdRange {
  if (mode === 'all') return { start: ALL_START, end: ALL_END }
  const r = periodRange(mode, anchor, now, custom)
  if (mode === 'custom') return { start: custom?.start || toYmd(r.start), end: custom?.end || toYmd(r.end) }
  return { start: toYmd(r.start), end: toYmd(r.end) }
}

const human = (d: Date) => `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`

/** «21 Octubre 2026», «19-25 Octubre 2026», «Octubre 2026», «Todo el historial»… */
export function periodLabel(mode: PeriodMode, anchor: Date, custom?: Partial<CustomRange>): string {
  if (mode === 'all') return 'Todo el historial'
  if (mode === 'custom') {
    if (custom?.start && custom?.end) {
      const a = parseLocalDate(custom.start)
      const b = parseLocalDate(custom.end)
      return custom.start === custom.end ? human(a) : `${human(a)} al ${human(b)}`
    }
    return 'Rango personalizado'
  }
  if (mode === 'day') return human(anchor)
  if (mode === 'week') {
    const ws = weekStart(anchor)
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    if (ws.getMonth() === we.getMonth()) return `${ws.getDate()}-${we.getDate()} ${MONTHS_ES[ws.getMonth()]} ${ws.getFullYear()}`
    return `${ws.getDate()} ${MONTHS_ES[ws.getMonth()]} - ${we.getDate()} ${MONTHS_ES[we.getMonth()]} ${we.getFullYear()}`
  }
  return `${MONTHS_ES[anchor.getMonth()]} ${anchor.getFullYear()}`
}

/** Mueve el periodo uno atrás (-1) o adelante (+1): un día, siete días o un mes. */
export function shiftAnchor(mode: PeriodMode, anchor: Date, direction: -1 | 1): Date {
  const d = new Date(anchor)
  if (mode === 'day') d.setDate(d.getDate() + direction)
  else if (mode === 'week') d.setDate(d.getDate() + 7 * direction)
  else if (mode === 'month') { d.setDate(1); d.setMonth(d.getMonth() + direction) }
  return d
}

/** ¿El periodo ya es el actual (o uno futuro)? «Todo» y «rango» no tienen siguiente. */
export function isCurrentPeriod(mode: PeriodMode, anchor: Date, now: Date = new Date()): boolean {
  if (mode === 'all' || mode === 'custom') return true
  if (mode === 'day') return dayStart(anchor).getTime() >= dayStart(now).getTime()
  if (mode === 'week') return weekStart(anchor).getTime() >= weekStart(now).getTime()
  return anchor.getFullYear() > now.getFullYear()
    || (anchor.getFullYear() === now.getFullYear() && anchor.getMonth() >= now.getMonth())
}

export type RangePreset = 'last7' | 'currentBiweekly' | 'lastBiweekly' | 'currentMonth' | 'last30'

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'currentBiweekly', label: 'Esta quincena' },
  { key: 'lastBiweekly', label: 'Quincena anterior' },
  { key: 'currentMonth', label: 'Este mes' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'last30', label: 'Últimos 30 días' },
]

/** Atajos del rango personalizado. Las quincenas son 1-15 y 16-fin de mes. */
export function presetRange(preset: RangePreset, today: Date = new Date()): YmdRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const ymd = (yy: number, mm: number, dd: number) => toYmd(new Date(yy, mm, dd))
  const lastDayOf = (yy: number, mm: number) => new Date(yy, mm + 1, 0).getDate()

  switch (preset) {
    case 'last7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { start: toYmd(from), end: toYmd(today) }
    }
    case 'last30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { start: toYmd(from), end: toYmd(today) }
    }
    case 'currentMonth':
      return { start: ymd(y, m, 1), end: ymd(y, m, lastDayOf(y, m)) }
    case 'currentBiweekly':
      return d <= 15
        ? { start: ymd(y, m, 1), end: ymd(y, m, 15) }
        : { start: ymd(y, m, 16), end: ymd(y, m, lastDayOf(y, m)) }
    case 'lastBiweekly':
      return d <= 15
        ? { start: ymd(y, m - 1, 16), end: ymd(y, m - 1, lastDayOf(y, m - 1)) }
        : { start: ymd(y, m, 1), end: ymd(y, m, 15) }
  }
}

/** ¿La fecha (Y-m-d o ISO) cae dentro del rango, ambos extremos incluidos? */
export function inRange(date: string | undefined | null, range: DateRange): boolean {
  if (!date) return false
  const d = parseLocalDate(date)
  return !Number.isNaN(d.getTime()) && d >= range.start && d <= range.end
}
