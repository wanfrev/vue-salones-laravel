import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listClinicalHistories, createClinicalHistory, updateClinicalHistory, type ClinicalHistorySections } from '../../services/dental/clinicalHistoryService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useClinicalHistories(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const historiesQuery = useQuery({
    queryKey: computed(() => ['dental-clinical-histories', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listClinicalHistories(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const histories = computed(() => historiesQuery.data.value ?? [])
  // Ordenados desc por folio_number desde el backend — el primero es el vigente.
  const currentHistory = computed(() => histories.value[0] ?? null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-clinical-histories', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ClinicalHistorySections>) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createClinicalHistory(id, data)
    },
    onSuccess: () => {
      invalidate()
      success('Nueva historia clínica creada')
    },
    onError: (err) => showError(translateError(err, 'Error al crear la historia clínica')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<ClinicalHistorySections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateClinicalHistory(id, payload.id, payload.data)
    },
    onSuccess: () => {
      invalidate()
      success('Historia clínica actualizada')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar la historia clínica')),
  })

  return {
    historiesQuery,
    histories,
    currentHistory,
    isLoading: historiesQuery.isLoading,
    createMutation,
    updateMutation,
  }
}
