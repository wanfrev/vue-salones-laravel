import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listTreatmentPlans, createTreatmentPlan, updateTreatmentPlan, type TreatmentPlanPayload,
} from '../../services/clinical/treatmentPlanService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useTreatmentPlans(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const plansQuery = useQuery({
    queryKey: computed(() => ['clinical-treatment-plans', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listTreatmentPlans(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const plans = computed(() => plansQuery.data.value ?? [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clinical-treatment-plans', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: TreatmentPlanPayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createTreatmentPlan(id, data)
    },
    onSuccess: () => {
      invalidate()
      success('Plan terapéutico creado')
    },
    onError: (err) => showError(translateError(err, 'Error al crear el plan terapéutico')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: TreatmentPlanPayload }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateTreatmentPlan(id, payload.id, payload.data)
    },
    onSuccess: () => {
      invalidate()
      success('Plan terapéutico actualizado')
    },
    onError: (err) => showError(translateError(err, 'Error al actualizar el plan terapéutico')),
  })

  return { plansQuery, plans, isLoading: plansQuery.isLoading, createMutation, updateMutation }
}
