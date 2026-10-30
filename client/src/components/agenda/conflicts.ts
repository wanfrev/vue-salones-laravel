/**
 * Choques de horario de una profesional (o asistente) al agendar. Mismo criterio que el servidor
 * (AppointmentService::checkOverlap): las citas canceladas o con inasistencia no ocupan, las de la propia
 * visita (mismo group_id) no chocan entre sí, y cada cita ocupa desde su inicio hasta SU propio fin.
 */
export interface BusySlot {
  id: string
  groupId: string | null
  employeeId: string | null
  assistantId: string | null
  start: number
  end: number
  clientName: string
}

const INACTIVE = new Set(['cancelled', 'no_show'])

/**
 * Normaliza una cita de la caché de TanStack Query. Ahí conviven dos formas: filas crudas del servidor
 * (start_time/end_time) y citas ya mapeadas (date/time/duration). Con la cruda se usa su `end_time` real: antes
 * se asumían 30 min cuando no había `duration`, y una cita larga parecía terminar enseguida.
 */
export function toBusySlot(a: any): BusySlot | null {
  const status = a?.status ?? a?.paymentStatus
  if (status && INACTIVE.has(status)) return null
  // El servidor ignora las filas con historia clínica al medir choques: no se avisa de lo que no bloquea.
  if (a?.clinical_history != null) return null

  const start = a.start_time ? new Date(a.start_time).getTime() : new Date(`${a.date}T${a.time}:00`).getTime()
  const end = a.end_time ? new Date(a.end_time).getTime() : start + (Number(a.duration) || 30) * 60_000
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  return {
    id: String(a.id),
    groupId: a.groupId ?? a.group_id ?? null,
    employeeId: a.employeeId ?? a.employee_id ?? null,
    assistantId: a.assistantId ?? a.assistant_employee_id ?? null,
    start,
    end,
    clientName: a.clientName ?? a.client?.full_name ?? a.clients?.full_name ?? 'otra cliente',
  }
}

/** Todas las citas de la caché, sin repetidas (la misma cita puede estar en varias consultas). */
export function busySlotsFrom(cached: ReadonlyArray<any>): BusySlot[] {
  const byId = new Map<string, BusySlot>()
  for (const a of cached) {
    const slot = toBusySlot(a)
    if (slot && !byId.has(slot.id)) byId.set(slot.id, slot)
  }
  return [...byId.values()]
}

/** Citas con las que choca `personId` (como profesional o como asistente) en [start, end). */
export function findConflicts(
  personId: string,
  start: number,
  end: number,
  busy: ReadonlyArray<BusySlot>,
  ignore: { id?: string | null; groupId?: string | null } = {},
): BusySlot[] {
  if (!personId) return []

  return busy.filter((b) => {
    if (ignore.id && b.id === ignore.id) return false
    if (ignore.groupId && b.groupId && b.groupId === ignore.groupId) return false
    if (b.employeeId !== personId && b.assistantId !== personId) return false

    return b.start < end && b.end > start
  })
}

/** «Ya tiene a María de 9:00 a. m. a 10:30 a. m.» (o «y otra cita más» si choca con varias). */
export function describeConflict(conflicts: ReadonlyArray<BusySlot>, who: 'empleado' | 'asistente' = 'empleado'): string {
  const first = conflicts[0]
  if (!first) return ''

  const time = (ms: number) => new Date(ms).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  const subject = who === 'asistente' ? 'El asistente ya tiene' : 'Ya tiene'
  const extra = conflicts.length > 1 ? ` (y ${conflicts.length - 1} más)` : ''

  return `${subject} a ${first.clientName} de ${time(first.start)} a ${time(first.end)}${extra}`
}
