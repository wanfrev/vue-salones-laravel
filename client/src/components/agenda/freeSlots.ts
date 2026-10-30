import type { BusySlot } from './conflicts'

export interface ScheduleRow {
  employee_id: string
  weekday: number
  start_time: string
  end_time: string
  break_start?: string | null
  break_end?: string | null
}

export interface FinderEmployee {
  id: string
  name: string
}

export interface FreeSlot {
  employeeId: string
  employeeName: string
  /** Día (YYYY-MM-DD, hora local). */
  date: string
  /** Minutos desde la medianoche. */
  startMin: number
  endMin: number
  /** Cuánto dura el hueco libre completo (puede ser más que lo pedido). */
  minutes: number
}

export interface FreeSlotQuery {
  /** Días a revisar (YYYY-MM-DD). */
  days: ReadonlyArray<string>
  /** Ahora, en ms: lo que ya pasó hoy no cuenta como libre. */
  now: number
  employees: ReadonlyArray<FinderEmployee>
  schedules: ReadonlyArray<ScheduleRow>
  busy: ReadonlyArray<BusySlot>
  /** Duración mínima que necesita el hueco. */
  minMinutes: number
  /** Limita la búsqueda a una profesional. */
  employeeId?: string
  /** Horario que se usa si la profesional no tiene ninguno configurado (minutos desde la medianoche). */
  defaultWindow?: { start: number; end: number }
  /** Los huecos de hoy empiezan en el siguiente múltiplo de esto (por defecto 15 min). */
  stepMin?: number
}

const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const merge = (ranges: [number, number][]): [number, number][] => {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const [s, e] of sorted) {
    const last = out[out.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else out.push([s, e])
  }
  return out
}

/**
 * Huecos libres de cada profesional en los días pedidos que alcanzan `minMinutes`. Reglas, las mismas del panel de
 * Disponibilidad: se trabaja dentro del horario del día de la semana; quien tiene horarios configurados pero ninguno
 * ese día no trabaja; quien no tiene ninguno usa el horario por defecto; el descanso y las citas (como profesional
 * o como asistente) bloquean; y lo que ya pasó de hoy no cuenta. Ordenado por día, hora y profesional.
 */
export function findFreeSlots(q: FreeSlotQuery): FreeSlot[] {
  const step = q.stepMin ?? 15
  const fallback = q.defaultWindow ?? { start: 7 * 60, end: 21 * 60 }
  const people = q.employeeId ? q.employees.filter(e => e.id === q.employeeId) : q.employees
  const result: FreeSlot[] = []

  for (const date of q.days) {
    const dayStart = new Date(`${date}T00:00:00`).getTime()
    const weekday = new Date(`${date}T12:00:00`).getDay()
    if (!Number.isFinite(dayStart)) continue
    const nowMin = (q.now - dayStart) / 60_000

    for (const person of people) {
      const own = q.schedules.filter(s => s.employee_id === person.id)
      const windows = own.length === 0
        ? [{ start: fallback.start, end: fallback.end, bs: null as number | null, be: null as number | null }]
        : own.filter(s => s.weekday === weekday).map(s => ({
            start: toMin(s.start_time),
            end: toMin(s.end_time),
            bs: s.break_start ? toMin(s.break_start) : null,
            be: s.break_end ? toMin(s.break_end) : null,
          }))

      for (const win of windows) {
        const blocked: [number, number][] = []

        if (win.bs != null && win.be != null && win.be > win.bs) blocked.push([win.bs, win.be])

        for (const b of q.busy) {
          if (b.employeeId !== person.id && b.assistantId !== person.id) continue
          const s = Math.max(win.start, (b.start - dayStart) / 60_000)
          const e = Math.min(win.end, (b.end - dayStart) / 60_000)
          if (e > s) blocked.push([s, e])
        }

        // Lo que ya pasó de hoy: el hueco empieza en el siguiente múltiplo del paso.
        if (nowMin > win.start) blocked.push([win.start, Math.min(win.end, Math.ceil(nowMin / step) * step)])

        let cursor = win.start
        const close = (until: number) => {
          if (until - cursor >= q.minMinutes && until > cursor) {
            result.push({ employeeId: person.id, employeeName: person.name, date, startMin: cursor, endMin: until, minutes: until - cursor })
          }
        }
        for (const [s, e] of merge(blocked)) {
          close(s)
          cursor = Math.max(cursor, e)
        }
        close(win.end)
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin || a.employeeName.localeCompare(b.employeeName))
}
