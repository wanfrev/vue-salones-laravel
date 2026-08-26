import { apiRequest } from '../lib/api'
import type { ApiUser } from '../lib/api'
import type { Business } from '../types/database'

/** Otro negocio del mismo dueño (Business independiente, con su propio User+Profile) al que se
 *  puede cambiar sin volver a pedir contraseña — ver useBusinessSwitch.ts. */
export type LinkedBusiness = {
  user_id: string
  business_id: string
  business_name: string
  niche_type: string | null
  full_name: string
  active: boolean
}

export type SwitchBusinessResult = {
  access_token: string
  token_type: string
  user: ApiUser
  business: Business | null
}

/** Vacío en el caso normal (el usuario nunca fue vinculado a otro negocio). */
export const listLinkedBusinesses = async (): Promise<LinkedBusiness[]> => {
  return apiRequest<LinkedBusiness[]>('GET', '/auth/linked-businesses')
}

export const switchBusiness = async (userId: string): Promise<SwitchBusinessResult> => {
  return apiRequest<SwitchBusinessResult>('POST', '/auth/switch-business', { user_id: userId })
}
