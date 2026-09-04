import { apiRequest } from '../../lib/api'
import type { ClinicalHistory } from '../../types/database'

export type ClinicalHistorySections = Pick<
  ClinicalHistory,
  'anamnesis' | 'examen_fisico' | 'examenes_complementarios' | 'diagnostico' | 'certificado_veracidad' | 'observaciones_generales'
>

export const listClinicalHistories = async (clientId: string) =>
  apiRequest<ClinicalHistory[]>('GET', `/clients/${clientId}/clinical-histories`)

export const createClinicalHistory = async (clientId: string, data: Partial<ClinicalHistorySections>) =>
  apiRequest<ClinicalHistory>('POST', `/clients/${clientId}/clinical-histories`, data)

export const updateClinicalHistory = async (clientId: string, id: string, data: Partial<ClinicalHistorySections>) =>
  apiRequest<ClinicalHistory>('PUT', `/clients/${clientId}/clinical-histories/${id}`, data)
