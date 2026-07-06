export function toYmd(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(key?: string): { year: number; month: number } | null {
  if (!key) return null
  const match = key.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) return null
  return { year, month }
}

export type PeriodBucket = 'day' | 'week' | 'month'

export interface PeriodConfig {
  bucket: PeriodBucket
  start: Date
  end: Date
}

export function resolvePeriod(value: 'month' | 'quarter' | 'year', monthKey?: string): PeriodConfig {
  const today = new Date()
  if (value === 'month') {
    const parsed = parseMonthKey(monthKey)
    const monthDate = parsed ? new Date(parsed.year, parsed.month, 1) : today
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth()
    return { bucket: 'day', start: monthStart, end: isCurrentMonth ? today : monthEnd }
  }
  if (value === 'quarter') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    return { bucket: 'week', start: new Date(today.getFullYear(), quarterStartMonth, 1), end: today }
  }
  return { bucket: 'month', start: new Date(today.getFullYear(), 0, 1), end: today }
}

export function normalizeBucketKey(date: Date, bucket: PeriodBucket): string {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  if (bucket === 'day') return toYmd(normalized)
  if (bucket === 'month') return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-01`
  const day = (normalized.getDay() + 6) % 7
  normalized.setDate(normalized.getDate() - day)
  return toYmd(normalized)
}

export function formatBucketLabel(date: Date, bucket: PeriodBucket): string {
  if (bucket === 'month') {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}`
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function resolvePeriodDates(value: 'month' | 'quarter' | 'year', monthKey?: string): { start: string; end: string } {
  const today = new Date()
  if (value === 'month') {
    const parsed = parseMonthKey(monthKey)
    const monthDate = parsed ? new Date(parsed.year, parsed.month, 1) : today
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth()
    return { start: toYmd(monthStart), end: toYmd(isCurrentMonth ? today : monthEnd) }
  }
  if (value === 'quarter') {
    const quarterStart = Math.floor(today.getMonth() / 3) * 3
    return { start: toYmd(new Date(today.getFullYear(), quarterStart, 1)), end: toYmd(today) }
  }
  return { start: toYmd(new Date(today.getFullYear(), 0, 1)), end: toYmd(today) }
}
