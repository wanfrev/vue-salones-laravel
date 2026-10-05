import { apiRequest } from '../../lib/api'
import type { AssessmentInstrumentId, ClinicalAssessment } from '../../types/database'

export interface AssessmentPayload {
  instrument: AssessmentInstrumentId
  answers: number[]
  notes: string | null
}

export const listAssessments = async (clientId: string) =>
  apiRequest<ClinicalAssessment[]>('GET', `/clients/${clientId}/assessments`)

/** El puntaje, la severidad y la alerta de riesgo los calcula el servidor — solo se envían las respuestas. */
export const createAssessment = async (clientId: string, data: AssessmentPayload) =>
  apiRequest<ClinicalAssessment>('POST', `/clients/${clientId}/assessments`, data)
