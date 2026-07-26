import { apiRequest } from '../lib/api'
import type { Pet } from '../types/database'

export const petsKeys = {
  all: () => ['pets', 'all'] as const,
  byClient: (clientId?: string) => ['pets', clientId] as const,
}

export const listPetsByClient = async (clientId: string): Promise<Pet[]> => {
  return apiRequest<Pet[]>('GET', `/clients/${clientId}/pets`)
}

export const listAllPets = async (query?: string): Promise<Pet[]> => {
  const params = new URLSearchParams()
  if (query) params.append('q', query)
  return apiRequest<Pet[]>('GET', `/pets?${params.toString()}`)
}
