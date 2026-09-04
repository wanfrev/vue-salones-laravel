import { apiRequest } from '../../lib/api'
import type { PerioAnnex } from '../../types/database'

export type PerioAnnexSections = Pick<
  PerioAnnex, 'condiciones_clinicas' | 'factores_riesgo' | 'diagnostico' | 'observaciones_generales'
>

export const listPerioAnnexes = async (clientId: string) =>
  apiRequest<PerioAnnex[]>('GET', `/clients/${clientId}/perio-annexes`)

export const createPerioAnnex = async (clientId: string, data: Partial<PerioAnnexSections>) =>
  apiRequest<PerioAnnex>('POST', `/clients/${clientId}/perio-annexes`, data)

export const updatePerioAnnex = async (clientId: string, id: string, data: Partial<PerioAnnexSections>) =>
  apiRequest<PerioAnnex>('PUT', `/clients/${clientId}/perio-annexes/${id}`, data)
