import { apiRequest } from '../../lib/api'

/** A boss who can sign off payroll. The PIN is never returned — only ever sent. */
export interface StaffingApprover {
  id: string
  name: string
}

export const approverKeys = {
  all: (businessId?: string | null) => ['staffing-approvers', businessId] as const,
}

export const listApprovers = (): Promise<StaffingApprover[]> =>
  apiRequest<StaffingApprover[]>('GET', '/staffing-approvers')

export const createApprover = (input: { name: string; pin: string }): Promise<StaffingApprover> =>
  apiRequest<StaffingApprover>('POST', '/staffing-approvers', input)

/** Changing anything needs the approver's CURRENT PIN (everyone shares one login). */
export const updateApprover = (id: string, input: { pin: string; name?: string; new_pin?: string }): Promise<StaffingApprover> =>
  apiRequest<StaffingApprover>('PUT', `/staffing-approvers/${id}`, input)

export const deleteApprover = (id: string, pin: string): Promise<void> =>
  apiRequest<void>('DELETE', `/staffing-approvers/${id}`, { pin })

/** PINs are 4 to 8 digits — mirror of the backend rule in StaffingApproverController. */
export const isValidPin = (pin: string): boolean => /^\d{4,8}$/.test(pin)
