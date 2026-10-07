import { apiRequest } from '../../lib/api'
import type { SessionNotePayload } from './sessionNoteService'
import type { TreatmentPlanPayload } from './treatmentPlanService'
import type {
  CaseOfAppointment, ClientCaseLink, ClinicalCase, ClinicalCaseStatus, ClinicalCaseType, JointSessionNote, JointTreatmentPlan,
  SessionAppointmentOption, SessionNote, TreatmentPlan,
} from '../../types/database'

export interface CreateCasePayload {
  type: ClinicalCaseType
  name: string
  opened_on?: string | null
  primary_client_id?: string | null
  members: Array<{ client_id: string; role?: string | null }>
}

export interface UpdateCasePayload {
  name?: string
  status?: ClinicalCaseStatus
  opened_on?: string | null
  primary_client_id?: string
}

// ── Casos ──
export const listCases = async (status?: ClinicalCaseStatus) =>
  apiRequest<ClinicalCase[]>('GET', `/clinical-cases${status ? `?status=${status}` : ''}`)

export const getCase = async (id: string) => apiRequest<ClinicalCase>('GET', `/clinical-cases/${id}`)
export const createCase = async (data: CreateCasePayload) => apiRequest<ClinicalCase>('POST', '/clinical-cases', data)
export const updateCase = async (id: string, data: UpdateCasePayload) => apiRequest<ClinicalCase>('PUT', `/clinical-cases/${id}`, data)

export const addCaseMember = async (id: string, data: { client_id: string; role?: string | null }) =>
  apiRequest<ClinicalCase>('POST', `/clinical-cases/${id}/members`, data)

export const removeCaseMember = async (id: string, clientId: string) =>
  apiRequest<ClinicalCase>('DELETE', `/clinical-cases/${id}/members/${clientId}`)

// ── Citas del caso ──
export const linkAppointmentToCase = async (caseId: string, appointmentId: string) =>
  apiRequest<{ ok: boolean }>('PUT', `/clinical-cases/${caseId}/appointments/${appointmentId}`)

export const unlinkAppointmentFromCase = async (caseId: string, appointmentId: string) =>
  apiRequest<{ ok: boolean }>('DELETE', `/clinical-cases/${caseId}/appointments/${appointmentId}`)

/** `null` (204) si la cita no pertenece a ningún caso. */
export const getCaseOfAppointment = async (appointmentId: string) =>
  apiRequest<CaseOfAppointment | null>('GET', `/clinical/appointments/${appointmentId}/case`)

export const listCaseAppointments = async (caseId: string) =>
  apiRequest<SessionAppointmentOption[]>('GET', `/clinical-cases/${caseId}/appointments`)

// ── Notas y planes conjuntos ──
export const listCaseNotes = async (caseId: string) => apiRequest<SessionNote[]>('GET', `/clinical-cases/${caseId}/session-notes`)
export const createCaseNote = async (caseId: string, data: SessionNotePayload) =>
  apiRequest<SessionNote>('POST', `/clinical-cases/${caseId}/session-notes`, data)
export const updateCaseNote = async (caseId: string, id: string, data: SessionNotePayload) =>
  apiRequest<SessionNote>('PUT', `/clinical-cases/${caseId}/session-notes/${id}`, data)

export const listCasePlans = async (caseId: string) => apiRequest<TreatmentPlan[]>('GET', `/clinical-cases/${caseId}/treatment-plans`)
export const createCasePlan = async (caseId: string, data: TreatmentPlanPayload) =>
  apiRequest<TreatmentPlan>('POST', `/clinical-cases/${caseId}/treatment-plans`, data)
export const updateCasePlan = async (caseId: string, id: string, data: TreatmentPlanPayload) =>
  apiRequest<TreatmentPlan>('PUT', `/clinical-cases/${caseId}/treatment-plans/${id}`, data)

// ── Lo conjunto visto desde la ficha de un integrante (solo lectura) ──
export const listClientCases = async (clientId: string) => apiRequest<ClientCaseLink[]>('GET', `/clients/${clientId}/clinical-cases`)
export const listJointNotes = async (clientId: string) => apiRequest<JointSessionNote[]>('GET', `/clients/${clientId}/joint-session-notes`)
export const listJointPlans = async (clientId: string) => apiRequest<JointTreatmentPlan[]>('GET', `/clients/${clientId}/joint-treatment-plans`)
