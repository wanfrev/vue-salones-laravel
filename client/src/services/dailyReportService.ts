import { apiRequest } from '../lib/api'

export interface DailyReport {
  id: string
  business_id: string
  branch_id?: string | null
  user_id?: string | null
  date: string
  exchange_rate: number
  z_report_bs: number
  z_report_usd: number
  pos_bs: number
  pago_movil_bs: number
  cash_bs: number
  transfer_bs: number
  cash_usd: number
  zelle_usd: number
  binance_usd: number
  cashea_usd: number
  total_bs: number
  total_usd: number
  created_at?: string
  updated_at?: string
  user?: { id: string; name: string }
}

export const listDailyReports = async (businessId: string, branchId?: string | null, month?: string) => {
  const params = new URLSearchParams({ business_id: businessId })
  if (branchId) params.set('branch_id', branchId)
  if (month) params.set('month', month)
  params.set('_t', Date.now().toString())
  return await apiRequest<DailyReport[]>('GET', `/daily-reports?${params.toString()}`)
}

export const saveDailyReport = async (data: Partial<DailyReport>) => {
  if (data.id) {
    return await apiRequest<DailyReport>('PUT', `/daily-reports/${data.id}`, data)
  }
  return await apiRequest<DailyReport>('POST', `/daily-reports`, data)
}

export const deleteDailyReport = async (id: string) => {
  return await apiRequest('DELETE', `/daily-reports/${id}`)
}
