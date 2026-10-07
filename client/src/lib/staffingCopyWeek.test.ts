import { describe, expect, it } from 'vitest'
import { copyableFieldsFrom, previousWeekStart } from './staffingCopyWeek'

describe('previousWeekStart', () => {
  it('goes back exactly 7 days', () => {
    expect(previousWeekStart('2026-10-04')).toBe('2026-09-27')
  })
  it('crosses month and year boundaries', () => {
    expect(previousWeekStart('2026-01-04')).toBe('2025-12-28')
    expect(previousWeekStart('2026-03-01')).toBe('2026-02-22')
  })
})

describe('copyableFieldsFrom', () => {
  const base = { total_hours: 42, pre_tax_deduction: 10, fixed_fees: 5, hours_manual_override: false, regular_hours: 40, overtime_hours: 2 }

  it('copies hours, deduction and fee, ignoring the computed split when not manual', () => {
    expect(copyableFieldsFrom(base)).toEqual({
      totalHours: 42, preTaxDeduction: 10, fixedFees: 5,
      hoursManualOverride: false, manualRegularHours: 0, manualOvertimeHours: 0,
    })
  })

  it('keeps the manual regular/OT split when the entry used it', () => {
    expect(copyableFieldsFrom({ ...base, hours_manual_override: true })).toMatchObject({
      hoursManualOverride: true, manualRegularHours: 40, manualOvertimeHours: 2,
    })
  })
})
