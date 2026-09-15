import { apiRequest } from '../../lib/api'
import type { BiofilmRecord } from '../../types/database'

export type BiofilmRecordSections = Pick<BiofilmRecord, 'teeth' | 'observaciones_generales'>

export const listBiofilmRecords = async (clientId: string) =>
  apiRequest<BiofilmRecord[]>('GET', `/clients/${clientId}/biofilm-records`)

export const createBiofilmRecord = async (clientId: string, data: Partial<BiofilmRecordSections>) =>
  apiRequest<BiofilmRecord>('POST', `/clients/${clientId}/biofilm-records`, data)

export const updateBiofilmRecord = async (clientId: string, id: string, data: Partial<BiofilmRecordSections>) =>
  apiRequest<BiofilmRecord>('PUT', `/clients/${clientId}/biofilm-records/${id}`, data)
