import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listAssessments, createAssessment, type AssessmentPayload } from '../../services/clinical/assessmentService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useAssessments(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const assessmentsQuery = useQuery({
    queryKey: computed(() => ['clinical-assessments', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listAssessments(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const assessments = computed(() => assessmentsQuery.data.value ?? [])

  const createMutation = useMutation({
    mutationFn: async (data: AssessmentPayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createAssessment(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-assessments', clientId()], exact: false })
      success('Cuestionario guardado')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar el cuestionario')),
  })

  return { assessmentsQuery, assessments, isLoading: assessmentsQuery.isLoading, createMutation }
}
