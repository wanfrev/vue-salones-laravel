import { apiRequest } from '../../lib/api'
import type { EndoAnnex } from '../../types/database'

export type EndoAnnexSections = Pick<EndoAnnex, 'examen' | 'diagnostico' | 'tratamiento'>
export type EndoAnnexCreatePayload = Partial<EndoAnnexSections> & { tooth_number: number }

export const listEndoAnnexes = async (clientId: string) =>
  apiRequest<EndoAnnex[]>('GET', `/clients/${clientId}/endo-annexes`)

export const createEndoAnnex = async (clientId: string, data: EndoAnnexCreatePayload) =>
  apiRequest<EndoAnnex>('POST', `/clients/${clientId}/endo-annexes`, data)

export const updateEndoAnnex = async (clientId: string, id: string, data: Partial<EndoAnnexSections>) =>
  apiRequest<EndoAnnex>('PUT', `/clients/${clientId}/endo-annexes/${id}`, data)
