import { apiDownloadFile, apiRequest, apiUpload } from '../../lib/api'

export const staffingIncidentKeys = {
  all: (businessId?: string | null, companyId?: string | null, status?: string | null) =>
    ['staffing-incidents', businessId, companyId, status] as const,
}

export type StaffingIncidentStatus = 'activo' | 'light_duty' | 'suspendido' | 'despedido'
export type DrugTestResult = 'positivo' | 'negativo' | 'pendiente'
export type IncidentFileType = 'factura' | 'paperwork' | 'drug_test' | 'foto'

export const INCIDENT_STATUS_OPTIONS: { value: StaffingIncidentStatus; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'light_duty', label: 'Light Duty' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'despedido', label: 'Despedido' },
]

export const DRUG_TEST_OPTIONS: { value: DrugTestResult; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'negativo', label: 'Negativo' },
  { value: 'positivo', label: 'Positivo' },
]

export interface StaffingIncidentFileRow {
  id: string
  fileType: IncidentFileType
  fileOriginalName: string
}

export interface StaffingIncidentRow {
  id: string
  employeeId: string
  employeeName: string
  companyId: string | null
  companyName: string | null
  comments: string | null
  incidentDate: string
  followUpDate: string | null
  wantsUrgentCare: boolean | null
  status: StaffingIncidentStatus
  drugTestResult: DrugTestResult | null
  reporteFileName: string | null
  reliefFormFileName: string | null
  files: StaffingIncidentFileRow[]
  createdAt: string
}

interface StaffingIncidentApiRow {
  id: string
  employee_id: string
  employee?: { full_name: string } | null
  company_id: string | null
  company?: { name: string } | null
  comments: string | null
  incident_date: string
  follow_up_date: string | null
  wants_urgent_care: boolean | null
  status: StaffingIncidentStatus
  drug_test_result: DrugTestResult | null
  reporte_file_original_name: string | null
  relief_form_file_original_name: string | null
  files: { id: string; file_type: IncidentFileType; file_original_name: string }[]
  created_at: string
}

const toIncidentRow = (row: StaffingIncidentApiRow): StaffingIncidentRow => ({
  id: row.id,
  employeeId: row.employee_id,
  employeeName: row.employee?.full_name ?? '',
  companyId: row.company_id,
  companyName: row.company?.name ?? null,
  comments: row.comments,
  incidentDate: row.incident_date.slice(0, 10),
  followUpDate: row.follow_up_date ? row.follow_up_date.slice(0, 10) : null,
  wantsUrgentCare: row.wants_urgent_care,
  status: row.status,
  drugTestResult: row.drug_test_result,
  reporteFileName: row.reporte_file_original_name,
  reliefFormFileName: row.relief_form_file_original_name,
  files: (row.files ?? []).map(f => ({ id: f.id, fileType: f.file_type, fileOriginalName: f.file_original_name })),
  createdAt: row.created_at,
})

export interface StaffingIncidentFormData {
  employeeId: string
  companyId?: string | null
  comments?: string | null
  incidentDate: string
  followUpDate?: string | null
  wantsUrgentCare?: boolean | null
  status?: StaffingIncidentStatus
  drugTestResult?: DrugTestResult | null
}

const toPayload = (data: Partial<StaffingIncidentFormData>) => ({
  ...(data.employeeId !== undefined ? { employee_id: data.employeeId } : {}),
  ...(data.companyId !== undefined ? { company_id: data.companyId || null } : {}),
  ...(data.comments !== undefined ? { comments: data.comments || null } : {}),
  ...(data.incidentDate !== undefined ? { incident_date: data.incidentDate } : {}),
  ...(data.followUpDate !== undefined ? { follow_up_date: data.followUpDate || null } : {}),
  ...(data.wantsUrgentCare !== undefined ? { wants_urgent_care: data.wantsUrgentCare } : {}),
  ...(data.status !== undefined ? { status: data.status } : {}),
  ...(data.drugTestResult !== undefined ? { drug_test_result: data.drugTestResult || null } : {}),
})

export const listStaffingIncidents = async (companyId?: string | null, status?: string | null): Promise<StaffingIncidentRow[]> => {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  if (status) params.set('status', status)
  const qs = params.toString()
  const rows = await apiRequest<StaffingIncidentApiRow[]>('GET', `/staffing-incidents${qs ? `?${qs}` : ''}`)
  return rows.map(toIncidentRow)
}

export const createStaffingIncident = async (data: StaffingIncidentFormData): Promise<StaffingIncidentRow> => {
  const row = await apiRequest<StaffingIncidentApiRow>('POST', '/staffing-incidents', toPayload(data))
  return toIncidentRow(row)
}

export const updateStaffingIncident = async (id: string, data: Partial<StaffingIncidentFormData>): Promise<StaffingIncidentRow> => {
  const row = await apiRequest<StaffingIncidentApiRow>('PUT', `/staffing-incidents/${id}`, toPayload(data))
  return toIncidentRow(row)
}

export const deleteStaffingIncident = (id: string): Promise<void> =>
  apiRequest<void>('DELETE', `/staffing-incidents/${id}`)

/** Reporte or Relief Form — single file per field, replaced on re-upload. */
export const uploadIncidentSingleFile = async (
  incidentId: string, field: 'reporte' | 'relief_form', file: File,
): Promise<StaffingIncidentRow> => {
  const form = new FormData()
  form.set('file', file)
  const row = await apiUpload<StaffingIncidentApiRow>('POST', `/staffing-incidents/${incidentId}/files/${field}`, form)
  return toIncidentRow(row)
}

export const downloadIncidentSingleFile = (incidentId: string, field: 'reporte' | 'relief_form', fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/staffing-incidents/${incidentId}/files/${field}/download`, fallbackFilename)

/** Facturas, Paperwork, Drug Test, Fotos — adds one more file, never replaces. */
export const addIncidentFile = async (incidentId: string, fileType: IncidentFileType, file: File): Promise<StaffingIncidentFileRow> => {
  const form = new FormData()
  form.set('file_type', fileType)
  form.set('file', file)
  const row = await apiUpload<{ id: string; file_type: IncidentFileType; file_original_name: string }>(
    'POST', `/staffing-incidents/${incidentId}/attachments`, form,
  )
  return { id: row.id, fileType: row.file_type, fileOriginalName: row.file_original_name }
}

export const deleteIncidentFile = (fileId: string): Promise<void> =>
  apiRequest<void>('DELETE', `/staffing-incident-files/${fileId}`)

export const downloadIncidentFile = (fileId: string, fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/staffing-incident-files/${fileId}/download`, fallbackFilename)
