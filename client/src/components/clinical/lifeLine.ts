import type { LifeEvent, LifeLineData, LifeValence } from '../../types/database'

/** Línea de vida: eventos con año y valencia (-2 muy negativo … +2 muy positivo). Límites = los del servidor. */

export const MAX_EVENTS = 200
export const MIN_YEAR = 1900
export const MAX_YEAR = 2100

export const VALENCES: LifeValence[] = [2, 1, 0, -1, -2]

export const VALENCE_LABELS: Record<LifeValence, string> = {
  2: 'Muy positivo',
  1: 'Positivo',
  0: 'Neutro',
  [-1]: 'Negativo',
  [-2]: 'Muy negativo',
}

export const VALENCE_COLORS: Record<LifeValence, string> = {
  2: '#10b981',
  1: '#6ee7b7',
  0: '#94a3b8',
  [-1]: '#fca5a5',
  [-2]: '#ef4444',
}

export const VALENCE_OPTIONS = VALENCES.map(v => ({ value: String(v), label: VALENCE_LABELS[v] }))

export function newEvent(year: number, over: Partial<LifeEvent> = {}): LifeEvent {
  const id = globalThis.crypto?.randomUUID?.() ?? `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return { id, year, age: null, title: '', valence: 0, note: '', ...over }
}

/** Orden cronológico estable: por año, y a igual año el orden en que se agregaron. */
export function sortEvents(events: ReadonlyArray<LifeEvent>): LifeEvent[] {
  return events.map((e, i) => ({ e, i })).sort((a, b) => a.e.year - b.e.year || a.i - b.i).map(x => x.e)
}

/** Edad estimada del paciente en el año del evento, si se conoce su año de nacimiento. */
export function ageAt(year: number, birthYear: number | null | undefined): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null
  const age = year - birthYear
  return age >= 0 && age <= 120 ? age : null
}

export function lifeLineError(events: ReadonlyArray<LifeEvent>): string | null {
  if (events.length > MAX_EVENTS) return `La línea de vida admite hasta ${MAX_EVENTS} eventos.`
  if (events.some(e => !e.title.trim())) return 'Cada evento necesita un título.'
  if (events.some(e => !Number.isInteger(e.year) || e.year < MIN_YEAR || e.year > MAX_YEAR)) return `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`
  if (events.some(e => e.age !== null && (!Number.isInteger(e.age) || e.age < 0 || e.age > 120))) return 'La edad debe estar entre 0 y 120.'
  return null
}

/** Solo lo que acepta el servidor: títulos recortados y eventos ya ordenados. */
export function lifeLinePayload(events: ReadonlyArray<LifeEvent>): LifeLineData {
  return {
    events: sortEvents(events).map(e => ({ ...e, title: e.title.trim(), note: e.note.trim() })),
  }
}

export interface ChartPoint {
  id: string
  x: number
  y: number
  event: LifeEvent
}

export interface ChartLayout {
  points: ChartPoint[]
  /** Años con marca en el eje (a lo sumo ~8, redondeados a décadas o lustros según el rango). */
  ticks: Array<{ year: number; x: number }>
  /** y del eje central (valencia 0). */
  baseline: number
}

/**
 * Posiciones del gráfico: x proporcional al año (con margen), y según la valencia (arriba lo
 * positivo). Un solo año (o un solo evento) se centra en vez de dividir por cero.
 */
export function chartLayout(
  events: ReadonlyArray<LifeEvent>,
  size: { width: number; height: number; padX?: number; padY?: number } = { width: 720, height: 280 },
): ChartLayout {
  const padX = size.padX ?? 36
  const padY = size.padY ?? 30
  const sorted = sortEvents(events)
  const innerW = size.width - padX * 2
  const innerH = size.height - padY * 2
  const baseline = padY + innerH / 2

  if (sorted.length === 0) return { points: [], ticks: [], baseline }

  const minYear = sorted[0].year
  const maxYear = sorted[sorted.length - 1].year
  const span = maxYear - minYear
  const xOf = (year: number) => (span === 0 ? padX + innerW / 2 : padX + ((year - minYear) / span) * innerW)
  const yOf = (valence: LifeValence) => baseline - (valence / 2) * (innerH / 2)

  const points = sorted.map(e => ({ id: e.id, x: Math.round(xOf(e.year) * 10) / 10, y: Math.round(yOf(e.valence) * 10) / 10, event: e }))

  const step = span <= 10 ? 1 : span <= 30 ? 5 : span <= 80 ? 10 : 20
  const ticks: ChartLayout['ticks'] = []
  if (span === 0) {
    ticks.push({ year: minYear, x: xOf(minYear) })
  } else {
    for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) ticks.push({ year: y, x: xOf(y) })
    if (ticks.length === 0 || ticks[0].year !== minYear) ticks.unshift({ year: minYear, x: xOf(minYear) })
  }

  return { points, ticks, baseline }
}

export function lifeLineSummary(events: ReadonlyArray<LifeEvent>): string {
  const n = events.length
  if (n === 0) return 'Sin eventos todavía'
  const negative = events.filter(e => e.valence < 0).length
  return `${n} evento${n === 1 ? '' : 's'} · ${negative} negativo${negative === 1 ? '' : 's'}`
}
