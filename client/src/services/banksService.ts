import { apiRequest } from '../lib/api'

export interface Bank {
  id: string
  business_id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export const banksKeys = {
  all: (businessId?: string | null) => ['banks', businessId] as const,
}

export const listBanks = async (): Promise<Bank[]> => {
  return await apiRequest<Bank[]>('GET', '/banks')
}

export const createBank = async (name: string): Promise<Bank> => {
  return await apiRequest<Bank>('POST', '/banks', { name })
}

export const updateBank = async (id: string, data: { name?: string; active?: boolean }): Promise<Bank> => {
  return await apiRequest<Bank>('PUT', `/banks/${id}`, data)
}

export const deleteBank = async (id: string): Promise<void> => {
  await apiRequest('DELETE', `/banks/${id}`)
}
