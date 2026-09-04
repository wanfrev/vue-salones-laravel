import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listPeriodontograms, createPeriodontogram, updatePeriodontogram, type PeriodontogramSections } from '../../services/dental/periodontogramService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function usePeriodontograms(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const periodontogramsQuery = useQuery({
    queryKey: computed(() => ['dental-periodontograms', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listPeriodontograms(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const periodontograms = computed(() => periodontogramsQuery.data.value ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-periodontograms', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PeriodontogramSections>) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createPeriodontogram(id, data)
    },
    onSuccess: () => { invalidate(); success('Periodontograma creado') },
    onError: (err) => showError(translateError(err, 'Error al crear el periodontograma')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<PeriodontogramSections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updatePeriodontogram(id, payload.id, payload.data)
    },
    onSuccess: () => { invalidate(); success('Periodontograma actualizado') },
    onError: (err) => showError(translateError(err, 'Error al guardar el periodontograma')),
  })

  return { periodontogramsQuery, periodontograms, isLoading: periodontogramsQuery.isLoading, createMutation, updateMutation }
}
