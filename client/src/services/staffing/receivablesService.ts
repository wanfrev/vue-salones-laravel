import { apiRequest } from '../../lib/api'

export type AgingBucket = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus'

export const AGING_BUCKETS: { key: AgingBucket; label: string }[] = [
  { key: 'current', label: 'Al día' },
  { key: 'd1_30', label: '1–30 días' },
  { key: 'd31_60', label: '31–60 días' },
  { key: 'd61_90', label: '61–90 días' },
  { key: 'd90_plus', label: 'Más de 90' },
]

export interface AgingInvoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  days_overdue: number
  total: number
  outstanding: number
  bucket: AgingBucket
}

export type AgingTotals = Record<AgingBucket | 'total', number>

export interface AgingCompany extends AgingTotals {
  company_id: string
  company_name: string
  invoices: AgingInvoice[]
}

export interface ReceivablesAgingReport {
  as_of: string
  totals: AgingTotals
  companies: AgingCompany[]
}

export const receivablesKeys = {
  aging: (businessId?: string | null) => ['staffing-receivables-aging', businessId] as const,
}

export const getReceivablesAging = (): Promise<ReceivablesAgingReport> =>
  apiRequest<ReceivablesAgingReport>('GET', '/staffing-receivables/aging')

/** Total overdue money (everything past due date) — what the "alerta" badge shows. */
export const overdueTotal = (totals: AgingTotals): number =>
  totals.d1_30 + totals.d31_60 + totals.d61_90 + totals.d90_plus
