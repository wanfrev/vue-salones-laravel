import { apiRequest } from '../../lib/api'

export interface ProfitabilityRow {
  id?: string
  label: string
  hours: number
  revenue: number
  cost: number
  margin: number
  marginPct: number | null
  marginPerHour: number | null
}

export interface ProfitabilityReport {
  totals: { hours: number; revenue: number; cost: number; margin: number; marginPct: number | null } | null
  byCompany: ProfitabilityRow[]
  byRole: ProfitabilityRow[]
}

export const profitabilityKeys = {
  period: (businessId: string | null | undefined, start: string, end: string) =>
    ['staffing-profitability', businessId, start, end] as const,
}

export const getProfitability = (periodStart: string, periodEnd: string): Promise<ProfitabilityReport> =>
  apiRequest<ProfitabilityReport>('GET', `/staffing-reports/profitability?period_start=${periodStart}&period_end=${periodEnd}`)
