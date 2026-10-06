import { apiRequest } from '../../lib/api'
import type { ClinicalFollowUp } from '../../types/database'

export const getClinicalFollowUp = async (weeks: number) =>
  apiRequest<ClinicalFollowUp>('GET', `/clinical/follow-up?weeks=${weeks}`)
