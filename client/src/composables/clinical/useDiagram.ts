import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getDiagram, saveDiagram, type DiagramScope } from '../../services/clinical/diagramService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { DiagramType, GenogramData, LifeLineData } from '../../types/database'

/** Genograma o línea de vida de un paciente o de un caso. `diagram` es null mientras no exista. */
export function useDiagram<T extends GenogramData | LifeLineData>(scope: () => DiagramScope | null, type: DiagramType) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const diagramQuery = useQuery({
    queryKey: computed(() => ['clinical-diagram', type, scope()?.kind ?? null, scope()?.id ?? null]),
    queryFn: async () => {
      const s = scope()
      return s ? await getDiagram<T>(s, type) : null
    },
    enabled: computed(() => !!scope()),
    staleTime: 0,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: T) => {
      const s = scope()
      if (!s) throw new Error('No scope')
      return await saveDiagram<T>(s, type, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-diagram', type], exact: false })
      success(type === 'genogram' ? 'Genograma guardado' : 'Línea de vida guardada')
    },
    onError: err => showError(translateError(err, 'No se pudo guardar')),
  })

  return { diagramQuery, diagram: computed(() => diagramQuery.data.value ?? null), isLoading: diagramQuery.isLoading, saveMutation }
}
