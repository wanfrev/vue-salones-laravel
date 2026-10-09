import { apiDownloadFile, apiRequest, apiUpload } from '../../lib/api'
import type { AttachmentCategory, ClinicalAttachment } from '../../types/database'

export const listAttachments = async (clientId: string) =>
  apiRequest<ClinicalAttachment[]>('GET', `/clients/${clientId}/attachments`)

export const uploadAttachment = async (clientId: string, data: { category: AttachmentCategory; title: string; file: File; document_date?: string | null }) => {
  const form = new FormData()
  form.append('category', data.category)
  form.append('title', data.title)
  if (data.document_date) form.append('document_date', data.document_date)
  form.append('file', data.file)
  return apiUpload<ClinicalAttachment>('POST', `/clients/${clientId}/attachments`, form)
}

/** Descarga autenticada (el navegador no puede mandar el token en un <a href>); queda en la auditoría. */
export const downloadAttachment = async (clientId: string, attachment: Pick<ClinicalAttachment, 'id' | 'original_name'>) =>
  apiDownloadFile(`/clients/${clientId}/attachments/${attachment.id}/download`, attachment.original_name)

export const deleteAttachment = async (clientId: string, id: string) =>
  apiRequest<{ ok: boolean }>('DELETE', `/clients/${clientId}/attachments/${id}`)
