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

export const dailyReportsKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['daily-reports', businessId, branchId] as const,
}


export const listDailyReports = async (businessId: string, branchId?: string | null, month?: string) => {
  const params = new URLSearchParams({ business_id: businessId })
  if (branchId) params.set('branch_id', branchId)
  if (month) params.set('month', month)
  params.set('_t', Date.now().toString())
  return await apiRequest<DailyReport[]>('GET', `/daily-reports?${params.toString()}`)
}

export const saveDailyReport = async (data: Partial<DailyReport>) => {
  console.log('[saveDailyReport] START', data.id ? 'UPDATE' : 'CREATE', data.date)
  try {
    if (data.id) {
      const result = await apiRequest<DailyReport>('PUT', `/daily-reports/${data.id}`, data)
      console.log('[saveDailyReport] UPDATE OK', result)
      return result
    }
    const result = await apiRequest<DailyReport>('POST', `/daily-reports`, data)
    console.log('[saveDailyReport] CREATE OK', result)
    return result
  } catch (err) {
    console.error('[saveDailyReport] ERROR', err)
    throw err
  }
}

export const deleteDailyReport = async (id: string) => {
  return await apiRequest('DELETE', `/daily-reports/${id}`)
}
