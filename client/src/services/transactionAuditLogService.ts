import { apiRequest } from '../lib/api'

export interface TransactionAuditLogEntry {
  id: string
  transaction_id: string
  action: 'updated' | 'deleted'
  performed_by: string
  reason: string | null
  client_name: string | null
  before: { method: string | null; total_amount: number | null; notes: string | null }
  after: { method: string | null; total_amount: number | null; notes: string | null } | null
  created_at: string
}

export const transactionAuditLogKeys = {
  all: (businessId?: string | null, branchId?: string | null, start?: string, end?: string) =>
    ['transaction-audit-logs', businessId, branchId, start, end] as const,
}

/**
 * Solo admin/superadmin -- el backend devuelve 403 para cualquier otro rol (ver
 * TransactionController::auditLogs()).
 */
export const listTransactionAuditLogs = async (
  businessId: string,
  start: string,
  end: string,
  branchId?: string | null,
) => {
  const params = new URLSearchParams({ business_id: businessId, start, end })
  if (branchId) params.set('branch_id', branchId)
  return await apiRequest<TransactionAuditLogEntry[]>('GET', `/transaction-audit-logs?${params.toString()}`)
}
