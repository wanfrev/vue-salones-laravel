import { apiDownloadFile, apiRequest, apiUpload } from '../lib/api'

export const employeeDocumentKeys = {
  all: (employeeId?: string | null) => ['employee-documents', employeeId] as const,
}

export interface EmployeeDocument {
  id: string
  employeeId: string
  label: string | null
  fileOriginalName: string
  createdAt: string
}

interface EmployeeDocumentRow {
  id: string
  employee_id: string
  label: string | null
  file_original_name: string
  created_at: string
}

const toEmployeeDocument = (row: EmployeeDocumentRow): EmployeeDocument => ({
  id: row.id,
  employeeId: row.employee_id,
  label: row.label,
  fileOriginalName: row.file_original_name,
  createdAt: row.created_at,
})

/** Scanned documents (ID, work letters, contracts, etc.) attached to one employee's profile. */
export const listEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocument[]> => {
  const rows = await apiRequest<EmployeeDocumentRow[]>('GET', `/employee-documents?employee_id=${employeeId}`)
  return rows.map(toEmployeeDocument)
}

export const uploadEmployeeDocument = async (employeeId: string, file: File, label?: string): Promise<EmployeeDocument> => {
  const form = new FormData()
  form.set('employee_id', employeeId)
  if (label) form.set('label', label)
  form.set('file', file)

  const row = await apiUpload<EmployeeDocumentRow>('POST', '/employee-documents', form)
  return toEmployeeDocument(row)
}

export const deleteEmployeeDocument = (id: string): Promise<void> =>
  apiRequest<void>('DELETE', `/employee-documents/${id}`)

export const downloadEmployeeDocument = (id: string, fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/employee-documents/${id}/download`, fallbackFilename)
