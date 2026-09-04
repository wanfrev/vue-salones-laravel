import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listEndoAnnexes, createEndoAnnex, updateEndoAnnex, type EndoAnnexSections, type EndoAnnexCreatePayload } from '../../services/dental/endoAnnexService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useEndoAnnexes(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const annexesQuery = useQuery({
    queryKey: computed(() => ['dental-endo-annexes', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listEndoAnnexes(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const annexes = computed(() => annexesQuery.data.value ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-endo-annexes', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: EndoAnnexCreatePayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createEndoAnnex(id, data)
    },
    onSuccess: () => { invalidate(); success('Anexo de endodoncia creado') },
    onError: (err) => showError(translateError(err, 'Error al crear el anexo de endodoncia')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<EndoAnnexSections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateEndoAnnex(id, payload.id, payload.data)
    },
    onSuccess: () => { invalidate(); success('Anexo de endodoncia actualizado') },
    onError: (err) => showError(translateError(err, 'Error al guardar el anexo de endodoncia')),
  })

  return { annexesQuery, annexes, isLoading: annexesQuery.isLoading, createMutation, updateMutation }
}
