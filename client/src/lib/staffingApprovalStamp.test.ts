import { describe, expect, it } from 'vitest'
import { formatApprovalStamp } from './staffingApprovalStamp'

describe('formatApprovalStamp', () => {
  it('returns null when the week has no stamp (feature off or never stamped)', () => {
    expect(formatApprovalStamp(null)).toBeNull()
    expect(formatApprovalStamp({})).toBeNull()
    expect(formatApprovalStamp({ approval_code: null, approver_name: 'Ana' })).toBeNull()
  })

  it('formats approver, local date/time and code', () => {
    const iso = new Date(2026, 9, 8, 14, 32).toISOString()
    expect(formatApprovalStamp({ approval_code: 'NOM-7F3K-92QA', approved_at: iso, approver_name: 'Ana Pérez' }))
      .toBe('Aprobada por Ana Pérez · 08/10/2026 14:32 · Código NOM-7F3K-92QA')
  })

  it('still shows the code when the approver or date is missing', () => {
    expect(formatApprovalStamp({ approval_code: 'NOM-AAAA-BBBB' })).toBe('Aprobada por — · Código NOM-AAAA-BBBB')
  })
})
