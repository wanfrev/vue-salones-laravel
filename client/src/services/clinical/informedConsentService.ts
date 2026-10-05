import { apiRequest } from '../../lib/api'
import type { InformedConsent } from '../../types/database'

export interface InformedConsentPayload {
  title: string
  content: string
  signature_data: string
  signer_name: string | null
  signer_relationship: string | null
}

export const listInformedConsents = async (clientId: string) =>
  apiRequest<InformedConsent[]>('GET', `/clients/${clientId}/informed-consents`)

export const createInformedConsent = async (clientId: string, data: InformedConsentPayload) =>
  apiRequest<InformedConsent>('POST', `/clients/${clientId}/informed-consents`, data)
