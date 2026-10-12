import type { ClinicalEnrollmentStatus, ClinicalProgram, ClinicalProgramComponent } from '../../types/database'

/**
 * Programas de sesiones: lógica pura (sin Vue) de calendarización y etiquetas. El servidor es quien
 * valida (vigencia, servicios permitidos, choques de horario); aquí solo se arma la propuesta de fechas
 * que la persona revisa antes de crear las citas.
 */

export const ENROLLMENT_STATUS_LABELS: Record<ClinicalEnrollmentStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

export const ENROLLMENT_STATUS_TONE: Record<ClinicalEnrollmentStatus, string> = {
  active: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  expired: 'bg-warning/10 text-warning',
  cancelled: 'bg-bg-secondary text-text-muted',
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

/** Lunes primero, como se lee la semana; `value` es el getDay() de JS (0 = domingo). */
export const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' }, { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
]

export const MAX_PROGRAM_SESSIONS = 60

export const programTotal = (components: Array<Pick<ClinicalProgramComponent, 'quantity'>>): number =>
  components.reduce((sum, c) => sum + (Number.isFinite(c.quantity) ? Math.max(0, Math.trunc(c.quantity)) : 0), 0)

/** "3 de 8" */
export const progressLabel = (used: number, total: number): string => `${used} de ${total}`

type ProgramShape = { components: Array<Pick<ClinicalProgramComponent, 'service_ids' | 'quantity' | 'employee_id' | 'services'>> }

export interface SessionSlot {
  serviceId: string
  /** Especialista de la especialidad (null si el programa no le asignó uno). */
  employeeId: string | null
}

/**
 * Qué toca en cada sesión, ALTERNANDO las especialidades (A, B, A, B...) mientras a cada una le queden
 * sesiones: un niño que va dos veces por semana a un programa de dos especialidades suele ir a una y
 * luego a la otra. Cada sesión parte con el primer servicio de su especialidad y su especialista; la
 * persona puede cambiar el servicio o el especialista de cada fila. Largo = total de sesiones.
 */
export function defaultSlots(program: ProgramShape): SessionSlot[] {
  const left = program.components.map(c => Math.max(0, c.quantity))
  const slots: SessionSlot[] = []
  while (left.some(n => n > 0)) {
    program.components.forEach((c, i) => {
      if (left[i] > 0) {
        left[i]--
        slots.push({ serviceId: c.service_ids[0], employeeId: c.employee_id ?? null })
      }
    })
  }
  return slots
}

/** Todos los servicios del programa (cualquier especialidad), sin repetir y en orden: lo que puede elegir cada sesión. */
export function programServices(program: ProgramShape): Array<{ id: string; name: string }> {
  const seen = new Map<string, string>()
  for (const c of program.components) {
    for (const id of c.service_ids) {
      if (!seen.has(id)) seen.set(id, c.services.find(s => s.id === id)?.name ?? 'Servicio')
    }
  }
  return [...seen].map(([id, name]) => ({ id, name }))
}

/** Índice de la especialidad (componente) a la que pertenece un servicio; -1 si no es del programa. */
export const componentIndexOf = (program: ProgramShape, serviceId: string): number =>
  program.components.findIndex(c => c.service_ids.includes(serviceId))

/** Especialista que el programa asignó a la especialidad de ese servicio (null si no hay). */
export const specialistForService = (program: ProgramShape, serviceId: string): string | null =>
  program.components[componentIndexOf(program, serviceId)]?.employee_id ?? null

/** Nombre de una especialidad: sus servicios («Lenguaje / ABA»). */
export const componentLabel = (c: Pick<ClinicalProgramComponent, 'services'>): string => c.services.map(s => s.name).join(' / ') || 'Especialidad'

export interface ComponentCount {
  label: string
  used: number
  quantity: number
}

/** Cuántas sesiones hay de cada especialidad frente a las que incluye el programa («Lenguaje 3 de 4»). */
export function componentCounts(program: ProgramShape, rows: Array<{ serviceId: string }>): ComponentCount[] {
  const used = program.components.map(() => 0)
  for (const r of rows) {
    const i = componentIndexOf(program, r.serviceId)
    if (i >= 0) used[i]++
  }
  return program.components.map((c, i) => ({ label: componentLabel(c), used: used[i], quantity: c.quantity }))
}

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function parseLocalDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(y, mo - 1, day)
  // Date "corrige" lo imposible (mes 13 → enero del año siguiente): se exige que devuelva el mismo día.
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day ? d : null
}

/**
 * Propone las fechas de las sesiones: desde `startDate` (inclusive), solo los días de la semana elegidos.
 * Cada día puede tener su propia hora (`times`: el niño viene el lunes a las 4 y el jueves a las 5); un día
 * sin hora propia usa `time`. Devuelve `YYYY-MM-DDTHH:mm` (hora local, como un input datetime-local).
 * Sin días elegidos, fecha inválida o alguna hora inválida → [].
 */
export function proposeSchedule(opts: { count: number; startDate: string; time: string; weekdays: number[]; times?: Record<number, string> }): string[] {
  const start = parseLocalDate(opts.startDate)
  const timeFor = (weekday: number) => opts.times?.[weekday] || opts.time
  if (!start || opts.weekdays.length === 0 || opts.count < 1) return []
  if (opts.weekdays.some(d => !/^\d{2}:\d{2}$/.test(timeFor(d)))) return []

  const days = new Set(opts.weekdays)
  const out: string[] = []
  const cursor = new Date(start)
  // Tope de 2 años de búsqueda: con al menos un día elegido, 60 sesiones caben de sobra.
  for (let guard = 0; out.length < opts.count && guard < 731; guard++) {
    if (days.has(cursor.getDay())) out.push(`${localDate(cursor)}T${timeFor(cursor.getDay())}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Mismo criterio que el servidor: la última sesión no puede pasar de la primera + los días de vigencia. */
export function fitsValidity(dates: string[], validityDays: number): boolean {
  const times = dates.map(d => new Date(d).getTime()).filter(t => !Number.isNaN(t))
  if (times.length === 0) return true
  return Math.max(...times) <= Math.min(...times) + validityDays * DAY_MS
}

/** Fecha (YYYY-MM-DD, local) en que vence un programa que arranca el `startDate`. */
export function expiryDate(startDate: string, validityDays: number): string {
  const d = parseLocalDate(startDate)
  if (!d) return ''
  d.setDate(d.getDate() + validityDays)
  return localDate(d)
}

/** `YYYY-MM-DDTHH:mm` local → ISO UTC (lo que espera el servidor). */
export const toUtcIso = (local: string): string => new Date(local).toISOString()

/** Fecha local (YYYY-MM-DD) de una fila del calendario propuesto. */
export const dateOnly = (local: string): string => local.slice(0, 10)

export interface ScheduleRow {
  start: string // YYYY-MM-DDTHH:mm local
  serviceId: string
  /** Especialista de esta sesión. */
  employeeId: string
}

/** Primer problema de la propuesta que impide crear las citas, o null si está lista. */
export function scheduleProblem(rows: ScheduleRow[], expected: number, validityDays: number): string | null {
  if (rows.length !== expected) return `El programa necesita ${expected} sesiones.`
  if (rows.some(r => !r.start || Number.isNaN(new Date(r.start).getTime()))) return 'Falta la fecha u hora de alguna sesión.'
  if (rows.some(r => !r.serviceId)) return 'Falta la especialidad de alguna sesión.'
  if (rows.some(r => !r.employeeId)) return 'Falta el especialista de alguna sesión.'
  if (!fitsValidity(rows.map(r => r.start), validityDays)) return `Las sesiones deben quedar dentro de los ${validityDays} días de vigencia.`
  return null
}

/** Dos sesiones en el mismo instante: el paciente no puede estar en dos a la vez (aunque sean con especialistas distintos). */
export function hasDuplicateStarts(rows: ScheduleRow[]): boolean {
  const seen = new Set<string>()
  for (const r of rows) {
    if (seen.has(r.start)) return true
    seen.add(r.start)
  }
  return false
}
