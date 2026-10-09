import { apiRequest } from '../../lib/api'
import type { AppointmentProgram, ClinicalEnrollment, ClinicalProgram } from '../../types/database'

export interface ProgramPayload {
  name: string
  price: number
  validity_days: number
  active?: boolean
  components: Array<{ service_ids: string[]; quantity: number }>
}

export interface EnrollPayload {
  program_id: string
  employee_id: string
  branch_id?: string | null
  /** Fecha local (YYYY-MM-DD) de la primera sesión. */
  starts_on?: string
  /** `start_time` en ISO (UTC): el servidor calcula la hora de fin con la duración del servicio. */
  sessions: Array<{ service_id: string; start_time: string }>
}

// ── Catálogo ──
export const listPrograms = async (activeOnly = false) =>
  apiRequest<ClinicalProgram[]>('GET', `/clinical/programs${activeOnly ? '?active=1' : ''}`)

export const createProgram = async (data: ProgramPayload) => apiRequest<ClinicalProgram>('POST', '/clinical/programs', data)
export const updateProgram = async (id: string, data: Partial<ProgramPayload>) => apiRequest<ClinicalProgram>('PUT', `/clinical/programs/${id}`, data)

// ── Inscripciones ──
export const listClientEnrollments = async (clientId: string) =>
  apiRequest<ClinicalEnrollment[]>('GET', `/clients/${clientId}/clinical-enrollments`)

export const enrollClient = async (clientId: string, data: EnrollPayload) =>
  apiRequest<ClinicalEnrollment>('POST', `/clients/${clientId}/clinical-enrollments`, data)

export const extendEnrollment = async (id: string, expiresOn: string) =>
  apiRequest<ClinicalEnrollment>('PUT', `/clinical/enrollments/${id}`, { expires_on: expiresOn })

export const cancelEnrollment = async (id: string) => apiRequest<ClinicalEnrollment>('DELETE', `/clinical/enrollments/${id}`)

/** true gasta la sesión, false no, null vuelve al criterio automático (según el estado de la cita). */
export const setSessionConsumes = async (id: string, appointmentId: string, consumes: boolean | null) =>
  apiRequest<ClinicalEnrollment>('PUT', `/clinical/enrollments/${id}/sessions/${appointmentId}`, { consumes })

/** `null` (204) si la cita no es de ningún programa. */
export const getProgramOfAppointment = async (appointmentId: string) =>
  apiRequest<AppointmentProgram | null>('GET', `/clinical/appointments/${appointmentId}/program`)
