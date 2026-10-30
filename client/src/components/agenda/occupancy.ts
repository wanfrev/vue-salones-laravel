import { normalizeAppointmentStatus, parseLocalDate, toISODate } from '../../lib/formatters'

export interface OccupancyGap { label: string; minutes: number }
export interface OccupancyRow { id: string; name: string; pctBooked: number; gaps: OccupancyGap[]; dayOff: boolean }

export interface OccupancyInput {
  employees: any[]
  schedules: any[]
  appointments: any[]
  /** Día a calcular (YYYY-MM-DD). */
  dateIso: string
  /** Ventana por defecto del negocio, para quien no tiene horario configurado. */
  defaultStartHour: number
  defaultEndHour: number
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatMinutesAsClock(totalMin: number): string {
  const h24 = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

export function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  return merged
}

/**
 * Cuánto de su jornada tiene reservado cada profesional ese día y qué huecos le quedan. El descanso no cuenta ni como
 * reservado ni como hueco; quien tiene horario configurado pero no trabaja ese día sale como «no trabaja» (no se le
 * muestran las horas por defecto como libres). Las canceladas y no-show no ocupan.
 */
export function computeOccupancyRows(input: OccupancyInput): OccupancyRow[] {
  const { employees, schedules, appointments, dateIso, defaultStartHour, defaultEndHour } = input
  const weekday = parseLocalDate(dateIso, 12, 0, 0).getDay()
  // Ventana por defecto del negocio (no la grilla dinámica): una cita suelta madrugadora no debe cambiar el % de
  // ocupación de quien no tiene horario configurado.
  const gridWindow = { start: defaultStartHour * 60, end: defaultEndHour * 60 }

  type SchedWin = { start: number; end: number; breakStart: number | null; breakEnd: number | null }
  const schedMap = new Map<string, SchedWin>()
  // Quien tiene horario en CUALQUIER día de la semana: distingue «sin horario configurado» (usa la grilla por defecto)
  // de «configurado, pero hoy no» (un día libre real).
  const employeesWithSchedule = new Set<string>()
  for (const s of schedules) {
    if (!s.employee_id) continue
    employeesWithSchedule.add(s.employee_id)
    if (s.weekday === weekday) {
      schedMap.set(s.employee_id, {
        start: timeStrToMinutes(s.start_time),
        end: timeStrToMinutes(s.end_time),
        breakStart: s.break_start ? timeStrToMinutes(s.break_start) : null,
        breakEnd: s.break_end ? timeStrToMinutes(s.break_end) : null,
      })
    }
  }

  const dayAppts = appointments.filter((a: any) => {
    const status = normalizeAppointmentStatus(a)
    if (status === 'cancelled' || status === 'no_show') return false
    return toISODate(new Date(a.start_time)) === dateIso
  })

  // Citas del día por profesional (titular o asistente): una pasada en vez de filtrar por cada profesional.
  const byEmployee = new Map<string, any[]>()
  const push = (id: string | null | undefined, a: any) => {
    if (!id) return
    const list = byEmployee.get(id)
    if (list) list.push(a)
    else byEmployee.set(id, [a])
  }
  for (const a of dayAppts) {
    push(a.employee_id, a)
    if (a.assistant_employee_id && a.assistant_employee_id !== a.employee_id) push(a.assistant_employee_id, a)
  }

  return employees.map((emp: any): OccupancyRow => {
    const sched = schedMap.get(emp.id)
    const dayOff = !sched && employeesWithSchedule.has(emp.id)
    if (dayOff) return { id: emp.id, name: emp.full_name, pctBooked: 0, gaps: [], dayOff: true }
    const win = sched ?? { ...gridWindow, breakStart: null, breakEnd: null }

    const busy: [number, number][] = []
    for (const a of byEmployee.get(emp.id) ?? []) {
      const s = new Date(a.start_time)
      const e = new Date(a.end_time)
      const sMin = Math.max(win.start, s.getHours() * 60 + s.getMinutes())
      const eMin = Math.min(win.end, e.getHours() * 60 + e.getMinutes())
      if (eMin > sMin) busy.push([sMin, eMin])
    }
    const bookedMinutes = mergeRanges(busy).reduce((sum, [s, e]) => sum + (e - s), 0)

    // El descanso reduce la jornada útil y bloquea su hueco igual que una cita real.
    let breakMinutes = 0
    const blocked = [...busy]
    if (win.breakStart != null && win.breakEnd != null) {
      const bs = Math.max(win.start, win.breakStart)
      const be = Math.min(win.end, win.breakEnd)
      if (be > bs) { breakMinutes = be - bs; blocked.push([bs, be]) }
    }
    const merged = mergeRanges(blocked)

    const winMinutes = Math.max(0, win.end - win.start - breakMinutes)
    const pctBooked = winMinutes > 0 ? Math.round((bookedMinutes / winMinutes) * 100) : 100

    const gaps: OccupancyGap[] = []
    let cursor = win.start
    for (const [s, e] of merged) {
      if (s - cursor >= 15) gaps.push({ label: `${formatMinutesAsClock(cursor)} – ${formatMinutesAsClock(s)}`, minutes: s - cursor })
      cursor = Math.max(cursor, e)
    }
    if (win.end - cursor >= 15) gaps.push({ label: `${formatMinutesAsClock(cursor)} – ${formatMinutesAsClock(win.end)}`, minutes: win.end - cursor })

    return { id: emp.id, name: emp.full_name, pctBooked, gaps, dayOff: false }
  }).sort((a, b) => Number(a.dayOff) - Number(b.dayOff) || a.pctBooked - b.pctBooked)
}

/** Ocupación media del equipo ese día (solo quien trabaja); `null` si nadie trabaja. */
export function teamOccupancy(rows: readonly OccupancyRow[]): number | null {
  let sum = 0
  let n = 0
  for (const r of rows) {
    if (r.dayOff) continue
    sum += Math.min(100, r.pctBooked)
    n++
  }
  return n ? Math.round(sum / n) : null
}
