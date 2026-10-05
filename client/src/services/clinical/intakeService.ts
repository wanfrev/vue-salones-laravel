import { apiRequest } from '../../lib/api'
import type { ClinicalIntake, ClinicalIntakeData } from '../../types/database'

/** `null` (el backend responde 204 sin cuerpo) cuando el paciente todavía no tiene historia clínica. */
export const getClinicalIntake = async (clientId: string) =>
  apiRequest<ClinicalIntake | null>('GET', `/clients/${clientId}/clinical-intake`)

export const saveClinicalIntake = async (clientId: string, data: ClinicalIntakeData) =>
  apiRequest<ClinicalIntake>('PUT', `/clients/${clientId}/clinical-intake`, { data })
