import { apiRequest } from '../../lib/api'

export interface ApprovalVerification {
  found: boolean
  code: string
  /** True when today's numbers still produce the printed code — false means edited after approval. */
  intact?: boolean
  company?: string | null
  project?: string | null
  week_start?: string
  week_end?: string
  status?: 'draft' | 'approved' | 'paid'
  approved_by_name?: string | null
  approved_at?: string | null
}

export const verifyApprovalCode = (code: string): Promise<ApprovalVerification> =>
  apiRequest<ApprovalVerification>('POST', '/staffing-timesheets/verify-approval', { code: code.trim() })
