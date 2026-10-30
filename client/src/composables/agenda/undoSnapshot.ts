import { toBusySlot } from '../../components/agenda/conflicts'

export type CalendarStatus = 'pending' | 'confirmed' | 'paid'

/** Cómo estaba una cita antes de moverla o cambiarle el estado, para poder devolverla. */
export interface ApptSnapshot {
  start: string
  end: string
  employeeId: string | null
  status: CalendarStatus | null
}

/**
 * Foto de una cita de la caché (cruda del servidor o ya mapeada). Devuelve null si no se encuentra o si está
 * cancelada: sin una foto fiable no se ofrece «Deshacer».
 */
export function snapshotAppointment(cached: ReadonlyArray<any>, id: string): ApptSnapshot | null {
  const appt = cached.find((a) => a?.id === id)
  if (!appt) return null

  const slot = toBusySlot(appt)
  if (!slot) return null

  return {
    start: new Date(slot.start).toISOString(),
    end: new Date(slot.end).toISOString(),
    employeeId: slot.employeeId,
    status: statusOf(appt),
  }
}

function statusOf(a: any): CalendarStatus | null {
  if (a.payment_status === 'paid' || a.paymentStatus === 'paid' || a.status === 'paid' || a.status === 'completed') return 'paid'
  if (a.status === 'confirmed') return 'confirmed'
  if (a.status === 'pending') return 'pending'
  return null
}
