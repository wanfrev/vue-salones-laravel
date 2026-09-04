import { apiRequest } from '../../lib/api'
import type { Periodontogram } from '../../types/database'

export type PeriodontogramSections = Pick<Periodontogram, 'teeth' | 'observaciones_generales'>

export const listPeriodontograms = async (clientId: string) =>
  apiRequest<Periodontogram[]>('GET', `/clients/${clientId}/periodontograms`)

export const createPeriodontogram = async (clientId: string, data: Partial<PeriodontogramSections>) =>
  apiRequest<Periodontogram>('POST', `/clients/${clientId}/periodontograms`, data)

export const updatePeriodontogram = async (clientId: string, id: string, data: Partial<PeriodontogramSections>) =>
  apiRequest<Periodontogram>('PUT', `/clients/${clientId}/periodontograms/${id}`, data)
