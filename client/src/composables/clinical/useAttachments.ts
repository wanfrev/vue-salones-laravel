import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { deleteAttachment, downloadAttachment, listAttachments, uploadAttachment } from '../../services/clinical/attachmentService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { AttachmentCategory, ClinicalAttachment } from '../../types/database'

export function useAttachments(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const attachmentsQuery = useQuery({
    queryKey: computed(() => ['clinical-attachments', clientId()]),
    queryFn: async () => (clientId() ? await listAttachments(clientId()!) : []),
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clinical-attachments', clientId()], exact: false })

  const uploadMutation = useMutation({
    mutationFn: async (data: { category: AttachmentCategory; title: string; file: File; document_date?: string | null }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await uploadAttachment(id, data)
    },
    onSuccess: () => { invalidate(); success('Archivo guardado (cifrado)') },
    onError: err => showError(translateError(err, 'No se pudo subir el archivo')),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = clientId()
      if (!client) throw new Error('No client selected')
      return await deleteAttachment(client, id)
    },
    onSuccess: () => { invalidate(); success('Archivo eliminado') },
    onError: err => showError(translateError(err, 'No se pudo eliminar el archivo')),
  })

  /** Devuelve true si la descarga se inició; en error avisa y devuelve false (sin lanzar). */
  async function download(attachment: Pick<ClinicalAttachment, 'id' | 'original_name'>): Promise<boolean> {
    const id = clientId()
    if (!id) return false
    try {
      await downloadAttachment(id, attachment)
      return true
    } catch (err) {
      showError(translateError(err, 'No se pudo descargar el archivo'))
      return false
    }
  }

  return {
    attachmentsQuery,
    attachments: computed(() => attachmentsQuery.data.value ?? []),
    isLoading: attachmentsQuery.isLoading,
    uploadMutation,
    deleteMutation,
    download,
  }
}
