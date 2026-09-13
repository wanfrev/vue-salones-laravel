import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listBiofilmRecords, createBiofilmRecord, updateBiofilmRecord, type BiofilmRecordSections } from '../../services/dental/biofilmService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useBiofilmRecords(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const recordsQuery = useQuery({
    queryKey: computed(() => ['dental-biofilm-records', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listBiofilmRecords(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const records = computed(() => recordsQuery.data.value ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-biofilm-records', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BiofilmRecordSections>) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createBiofilmRecord(id, data)
    },
    onSuccess: () => { invalidate(); success('Registro de biopelícula creado') },
    onError: (err) => showError(translateError(err, 'Error al crear el registro de biopelícula')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<BiofilmRecordSections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateBiofilmRecord(id, payload.id, payload.data)
    },
    onSuccess: () => { invalidate(); success('Registro de biopelícula actualizado') },
    onError: (err) => showError(translateError(err, 'Error al guardar el registro de biopelícula')),
  })

  return { recordsQuery, records, isLoading: recordsQuery.isLoading, createMutation, updateMutation }
}
