import { apiRequest } from '../lib/api'
import type { Pet } from '../types/database'

export const petsKeys = {
  byClient: (clientId?: string) => ['pets', clientId] as const,
}

export const listPetsByClient = async (clientId: string): Promise<Pet[]> => {
  return apiRequest<Pet[]>('GET', `/clients/${clientId}/pets`)
}
