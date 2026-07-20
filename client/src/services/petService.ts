import { db } from '../lib/api'
import type { Pet } from '../types/database'

export const petsKeys = {
  byClient: (clientId?: string) => ['pets', clientId] as const,
}

export const listPetsByClient = async (clientId: string): Promise<Pet[]> => {
  const { data, error } = await db
    .from('pets')
    .select('*')
    .eq('client_id', clientId)
    .order('name')

  if (error) throw error
  return data as Pet[]
}

export const getPetById = async (petId: string): Promise<Pet> => {
  const { data, error } = await db
    .from('pets')
    .select('*')
    .eq('id', petId)
    .single()

  if (error) throw error
  return data as Pet
}
