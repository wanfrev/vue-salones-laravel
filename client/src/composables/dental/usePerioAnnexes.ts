import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listPerioAnnexes, createPerioAnnex, updatePerioAnnex, type PerioAnnexSections } from '../../services/dental/perioAnnexService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function usePerioAnnexes(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const annexesQuery = useQuery({
    queryKey: computed(() => ['dental-perio-annexes', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listPerioAnnexes(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const annexes = computed(() => annexesQuery.data.value ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-perio-annexes', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PerioAnnexSections>) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createPerioAnnex(id, data)
    },
    onSuccess: () => { invalidate(); success('Anexo de periodoncia creado') },
    onError: (err) => showError(translateError(err, 'Error al crear el anexo de periodoncia')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<PerioAnnexSections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updatePerioAnnex(id, payload.id, payload.data)
    },
    onSuccess: () => { invalidate(); success('Anexo de periodoncia actualizado') },
    onError: (err) => showError(translateError(err, 'Error al guardar el anexo de periodoncia')),
  })

  return { annexesQuery, annexes, isLoading: annexesQuery.isLoading, createMutation, updateMutation }
}
