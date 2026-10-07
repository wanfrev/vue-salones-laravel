import { toISODate } from './formatters'

/** The Sunday-start week before `weekStart` (ISO yyyy-mm-dd), using local calendar math so it
 *  never drifts a day for anyone west of UTC (same convention as StaffingHoursPanel). */
export const previousWeekStart = (weekStart: string): string => {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return toISODate(d)
}

interface CopyableEntry {
  total_hours: number
  pre_tax_deduction: number
  fixed_fees: number
  hours_manual_override: boolean
  regular_hours: number
  overtime_hours: number
}

export interface CopiedWeekFields {
  totalHours: number
  preTaxDeduction: number
  fixedFees: number
  hoursManualOverride: boolean
  manualRegularHours: number
  manualOvertimeHours: number
}

/**
 * What carries over from a previous week's saved entry: hours (including a manual regular/OT
 * split), pre-tax deduction and fixed fee. Adjustments, perdiem and travel are deliberately NOT
 * copied — they're one-off amounts that would otherwise get paid twice by accident.
 */
export const copyableFieldsFrom = (entry: CopyableEntry): CopiedWeekFields => ({
  totalHours: entry.total_hours,
  preTaxDeduction: entry.pre_tax_deduction,
  fixedFees: entry.fixed_fees,
  hoursManualOverride: entry.hours_manual_override,
  manualRegularHours: entry.hours_manual_override ? entry.regular_hours : 0,
  manualOvertimeHours: entry.hours_manual_override ? entry.overtime_hours : 0,
})
