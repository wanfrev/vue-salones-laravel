/** Lo mínimo que hace falta de una cita para ordenarla y agruparla por hora en el tablero semanal. */
export interface BoardAppt {
  id: string
  startMs: number
}

export type BoardItem<T extends BoardAppt> =
  | { kind: 'hour'; key: string; hour: number; count: number }
  | { kind: 'now'; key: string }
  | { kind: 'row'; key: string; appt: T }

/**
 * Arma la columna de un día del tablero semanal: las citas en orden cronológico, un encabezado por cada hora con
 * cuántas citas empiezan en ella y, si se pasa `nowMs` (solo en la columna de hoy), la línea de «ahora» antes de la
 * primera cita que aún no empieza (o al final si ya empezaron todas).
 *
 * Una sola pasada sobre las citas ordenadas: nada de `.filter()` por hora.
 */
export function buildBoardItems<T extends BoardAppt>(appts: readonly T[], nowMs: number | null = null): BoardItem<T>[] {
  const sorted = [...appts].sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id))

  const perHour = new Map<number, number>()
  const hours: number[] = sorted.map(a => new Date(a.startMs).getHours())
  for (const h of hours) perHour.set(h, (perHour.get(h) ?? 0) + 1)

  const items: BoardItem<T>[] = []
  let lastHour = -1
  let nowPlaced = nowMs === null

  sorted.forEach((appt, i) => {
    if (!nowPlaced && appt.startMs >= nowMs!) {
      items.push({ kind: 'now', key: 'now' })
      nowPlaced = true
    }
    const hour = hours[i]
    if (hour !== lastHour) {
      items.push({ kind: 'hour', key: `h${hour}`, hour, count: perHour.get(hour)! })
      lastHour = hour
    }
    items.push({ kind: 'row', key: appt.id, appt })
  })

  if (!nowPlaced) items.push({ kind: 'now', key: 'now' })
  return items
}

/**
 * Cuántas citas empiezan en cada hora de `from` a `to` (incluidas), para el mini gráfico de barras del día en el
 * celular. Citas fuera de ese rango no cuentan. Una pasada.
 */
export function hourHistogram(appts: readonly BoardAppt[], from: number, to: number): number[] {
  const bins = new Array<number>(Math.max(0, to - from + 1)).fill(0)
  for (const a of appts) {
    const h = new Date(a.startMs).getHours()
    if (h >= from && h <= to) bins[h - from]++
  }
  return bins
}

/** «9 AM», «12 PM»: etiqueta corta de una hora del día (0–23). */
export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}
