import { apiRequest } from '../../lib/api'
import { isSignatureDataUrl } from '../../lib/staffingApprovalStamp'

export const signatureKeys = {
  mine: (businessId?: string | null) => ['staffing-my-signature', businessId] as const,
}

export const getMySignature = async (): Promise<string | null> =>
  (await apiRequest<{ image: string | null }>('GET', '/staffing-signature')).image

export const saveMySignature = (image: string): Promise<{ image: string }> =>
  apiRequest<{ image: string }>('PUT', '/staffing-signature', { image })

export const deleteMySignature = (): Promise<void> =>
  apiRequest<void>('DELETE', '/staffing-signature')

/** The signature frozen on an approved week, fetched only when printing. Never throws: no signature = no image. */
export const getApprovalSignature = async (timesheetId: string): Promise<string | null> => {
  try {
    const { image } = await apiRequest<{ image: string | null }>('GET', `/staffing-timesheets/${timesheetId}/approval-signature`)
    return isSignatureDataUrl(image) ? image : null
  } catch {
    return null
  }
}
