import { normalizeAppointmentStatus } from '../../lib/formatters'
import { buildDisplayAppointments } from './gridLayout'

export interface PeriodSummary {
  /** Citas del período tal como se ven en el calendario (una visita con varios servicios de una profesional = una). */
  total: number
  /** Las que siguen en estado «Pendiente» (sin confirmar). */
  pending: number
}

export function summarizePeriod(appts: readonly { status: string; payment_status: string; group_id?: string | null; employee_id?: string | null }[]): PeriodSummary {
  let total = 0
  let pending = 0
  for (const a of buildDisplayAppointments(appts)) {
    total++
    if (normalizeAppointmentStatus(a) === 'pending') pending++
  }
  return { total, pending }
}
