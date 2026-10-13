import { apiRequest } from '../../lib/api'
import { isSignatureDataUrl } from '../../lib/staffingApprovalStamp'

/** The signature frozen on an approved week, fetched only when printing. Never throws: no signature = no image. */
export const getApprovalSignature = async (timesheetId: string): Promise<string | null> => {
  try {
    const { image } = await apiRequest<{ image: string | null }>('GET', `/staffing-timesheets/${timesheetId}/approval-signature`)
    return isSignatureDataUrl(image) ? image : null
  } catch {
    return null
  }
}
