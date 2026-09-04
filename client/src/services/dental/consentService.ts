import { apiRequest } from '../../lib/api'
import type { Consent } from '../../types/database'

export interface ConsentCreatePayload {
  procedure_description: string
  risks_text: string
  signature_data: string
}

export const listConsents = async (clientId: string) =>
  apiRequest<Consent[]>('GET', `/clients/${clientId}/consents`)

export const createConsent = async (clientId: string, data: ConsentCreatePayload) =>
  apiRequest<Consent>('POST', `/clients/${clientId}/consents`, data)
