import { apiRequest } from '../../lib/api'
import type { ClinicalAuditAction, ClinicalAuditPage, ClinicalReportKind } from '../../types/database'

export interface AuditFilters {
  /** YYYY-MM-DD. El backend acota a 180 días como máximo (30 por defecto). */
  from?: string
  to?: string
  action?: ClinicalAuditAction | ''
  page?: number
}

const toQuery = (filters: AuditFilters): string => {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.action) params.set('action', filters.action)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const listClinicalAudit = async (filters: AuditFilters) =>
  apiRequest<ClinicalAuditPage>('GET', `/clinical/audit${toQuery(filters)}`)

/** Avisa al servidor que se imprimió un informe (la impresión ocurre en el navegador). */
export const logReportPrinted = async (clientId: string, kind: ClinicalReportKind) =>
  apiRequest<{ ok: boolean }>('POST', `/clients/${clientId}/clinical-reports/audit`, { kind })
