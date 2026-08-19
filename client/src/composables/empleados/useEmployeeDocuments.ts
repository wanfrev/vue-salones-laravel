import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  deleteEmployeeDocument,
  downloadEmployeeDocument,
  employeeDocumentKeys,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from '../../services/employeeDocumentsService'

export function useEmployeeDocuments(employeeId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const queryKey = computed(() => employeeDocumentKeys.all(employeeId.value))
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listEmployeeDocuments(employeeId.value as string),
    enabled: computed(() => !!employeeId.value),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey.value, exact: false })

  const uploadMutation = useMutation({
    mutationFn: ({ file, label }: { file: File; label?: string }) =>
      uploadEmployeeDocument(employeeId.value as string, file, label),
    onSuccess: async () => {
      await invalidate()
      success('Documento adjuntado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeeDocument(id),
    onSuccess: async () => {
      await invalidate()
      success('Documento eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const download = async (id: string, fallbackFilename: string) => {
    try {
      await downloadEmployeeDocument(id, fallbackFilename)
    } catch (err) {
      showError(translateError(err))
    }
  }

  return {
    documents: computed(() => data.value ?? []),
    isLoading,
    uploadMutation,
    deleteMutation,
    download,
  }
}
