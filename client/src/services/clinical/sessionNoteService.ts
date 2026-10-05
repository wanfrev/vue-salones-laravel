import { apiRequest } from '../../lib/api'
import type { ClinicalRiskLevel, SessionAppointmentOption, SessionNote, SessionNoteContent } from '../../types/database'

export interface SessionNotePayload {
  appointment_id: string | null
  session_date: string
  duration_minutes: number | null
  risk_level: ClinicalRiskLevel
  mood_rating: number | null
  content: SessionNoteContent
  tasks: string | null
}

export const listSessionNotes = async (clientId: string) =>
  apiRequest<SessionNote[]>('GET', `/clients/${clientId}/session-notes`)

export const listSessionAppointments = async (clientId: string) =>
  apiRequest<SessionAppointmentOption[]>('GET', `/clients/${clientId}/session-notes/appointments`)

export const createSessionNote = async (clientId: string, data: SessionNotePayload) =>
  apiRequest<SessionNote>('POST', `/clients/${clientId}/session-notes`, data)

export const updateSessionNote = async (clientId: string, id: string, data: SessionNotePayload) =>
  apiRequest<SessionNote>('PUT', `/clients/${clientId}/session-notes/${id}`, data)
