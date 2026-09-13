import { apiRequest } from '../../lib/api'
import type { DentalChart, DentalTeeth, DentalTeethCodes } from '../../types/database'

export const getDentalChart = async (clientId: string) =>
  apiRequest<DentalChart>('GET', `/clients/${clientId}/dental-chart`)

export const saveDentalChart = async (clientId: string, teeth: DentalTeeth, codes?: DentalTeethCodes) =>
  apiRequest<DentalChart>('PUT', `/clients/${clientId}/dental-chart`, codes ? { teeth, codes } : { teeth })
