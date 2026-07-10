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

export function getISOWeek(d: Date): number {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

export function currentWeekKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, '0')}`
}

export function parseWeekKey(key?: string): { year: number; week: number } | null {
  if (!key) return null
  const match = key.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (Number.isNaN(year) || Number.isNaN(week) || week < 1 || week > 53) return null
  return { year, week }
}

export function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const mondayOfFirstWeek = new Date(jan4)
  mondayOfFirstWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  mondayOfFirstWeek.setDate(mondayOfFirstWeek.getDate() + (week - 1) * 7)
  return mondayOfFirstWeek
}

export function weekLabel(year: number, week: number): string {
  const monday = getMondayOfISOWeek(year, week)
  const end = new Date(monday)
  end.setDate(monday.getDate() + 6)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const m1 = months[monday.getMonth()]
  const m2 = months[end.getMonth()]
  const d1 = monday.getDate()
  const d2 = end.getDate()
  return `Sem ${week} · ${d1} ${m1} - ${d2} ${m2 === m1 ? '' : m2}`
}

export function quarterLabel(year: number, quarter: number): string {
  const startMonth = (quarter - 1) * 3
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const from = months[startMonth]
  const to = months[startMonth + 2]
  return `Q${quarter} ${year} · ${from} - ${to}`
}

export function currentQuarterKey(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${q}`
}

export function parseQuarterKey(key?: string): { year: number; quarter: number } | null {
  if (!key) return null
  const match = key.match(/^(\d{4})-Q([1-4])$/)
  if (!match) return null
  return { year: Number(match[1]), quarter: Number(match[2]) }
}

export function currentYearKey(): string {
  return `${new Date().getFullYear()}`
}

export type PeriodBucket = 'day' | 'week' | 'month'

export interface PeriodConfig {
  bucket: PeriodBucket
  start: Date
  end: Date
}

export function resolvePeriod(value: 'week' | 'month' | 'quarter' | 'year', key?: string): PeriodConfig {
  const today = new Date()
  if (value === 'week') {
    const parsed = parseWeekKey(key) ?? { year: today.getFullYear(), week: getISOWeek(today) }
    const monday = getMondayOfISOWeek(parsed.year, parsed.week)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const isCurrentWeek = getISOWeek(today) === parsed.week && today.getFullYear() === parsed.year
    return { bucket: 'day', start: monday, end: isCurrentWeek ? today : sunday }
  }
  if (value === 'month') {
    const parsed = parseMonthKey(key)
    const monthDate = parsed ? new Date(parsed.year, parsed.month, 1) : today
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth()
    return { bucket: 'day', start: monthStart, end: isCurrentMonth ? today : monthEnd }
  }
  if (value === 'quarter') {
    const parsed = parseQuarterKey(key)
    const q = parsed?.quarter ?? (Math.floor(today.getMonth() / 3) + 1)
    const y = parsed?.year ?? today.getFullYear()
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 3
    const isCurrentQuarter = y === today.getFullYear() && q === Math.floor(today.getMonth() / 3) + 1
    return { bucket: 'week', start: new Date(y, startMonth, 1), end: isCurrentQuarter ? today : new Date(y, endMonth, 0) }
  }
  // year
  const parsed = parseYearKey(key)
  const y = parsed ?? today.getFullYear()
  const isCurrentYear = y === today.getFullYear()
  return { bucket: 'month', start: new Date(y, 0, 1), end: isCurrentYear ? today : new Date(y, 11, 31) }
}

function parseYearKey(key?: string): number | null {
  if (!key) return null
  const match = key.match(/^(\d{4})$/)
  return match ? Number(match[1]) : null
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

export function resolvePeriodDates(value: 'week' | 'month' | 'quarter' | 'year', key?: string): { start: string; end: string } {
  const today = new Date()
  if (value === 'week') {
    const parsed = parseWeekKey(key) ?? { year: today.getFullYear(), week: getISOWeek(today) }
    const monday = getMondayOfISOWeek(parsed.year, parsed.week)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: toYmd(monday), end: toYmd(sunday) }
  }
  if (value === 'month') {
    const parsed = parseMonthKey(key)
    const monthDate = parsed ? new Date(parsed.year, parsed.month, 1) : today
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth()
    return { start: toYmd(monthStart), end: toYmd(isCurrentMonth ? today : monthEnd) }
  }
  if (value === 'quarter') {
    const parsed = parseQuarterKey(key)
    const q = parsed?.quarter ?? (Math.floor(today.getMonth() / 3) + 1)
    const y = parsed?.year ?? today.getFullYear()
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 3
    const isCurrentQuarter = y === today.getFullYear() && q === Math.floor(today.getMonth() / 3) + 1
    return { start: toYmd(new Date(y, startMonth, 1)), end: toYmd(isCurrentQuarter ? today : new Date(y, endMonth, 0)) }
  }
  // year
  const parsed = parseYearKey(key)
  const y = parsed ?? today.getFullYear()
  const isCurrentYear = y === today.getFullYear()
  return { start: toYmd(new Date(y, 0, 1)), end: toYmd(isCurrentYear ? today : new Date(y, 11, 31)) }
}
