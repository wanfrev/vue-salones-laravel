import { apiRequest } from '../../lib/api'
import type { DentalChart, DentalTeeth } from '../../types/database'

export const getDentalChart = async (clientId: string) =>
  apiRequest<DentalChart>('GET', `/clients/${clientId}/dental-chart`)

export const saveDentalChart = async (clientId: string, teeth: DentalTeeth) =>
  apiRequest<DentalChart>('PUT', `/clients/${clientId}/dental-chart`, { teeth })
