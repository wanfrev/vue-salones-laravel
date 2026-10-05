import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getClinicalIntake, saveClinicalIntake } from '../../services/clinical/intakeService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { ClinicalIntakeData } from '../../types/database'

export function useClinicalIntake(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const intakeQuery = useQuery({
    queryKey: computed(() => ['clinical-intake', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return null
      return await getClinicalIntake(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const intake = computed(() => intakeQuery.data.value ?? null)

  const saveMutation = useMutation({
    mutationFn: async (data: ClinicalIntakeData) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await saveClinicalIntake(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-intake', clientId()], exact: false })
      success('Historia clínica guardada')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar la historia clínica')),
  })

  return { intakeQuery, intake, isLoading: intakeQuery.isLoading, saveMutation }
}
