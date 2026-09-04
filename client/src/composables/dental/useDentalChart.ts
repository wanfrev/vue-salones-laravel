import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getDentalChart, saveDentalChart } from '../../services/dental/dentalChartService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { DentalTeeth } from '../../types/database'

export function useDentalChart(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const chartQuery = useQuery({
    queryKey: computed(() => ['dental-chart', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await getDentalChart(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const saveMutation = useMutation({
    mutationFn: async (teeth: DentalTeeth) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await saveDentalChart(id, teeth)
    },
    onSuccess: (chart) => {
      queryClient.setQueryData(['dental-chart', clientId()], chart)
      success('Odontograma actualizado')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al guardar el odontograma'))
    },
  })

  return {
    chartQuery,
    chart: computed(() => chartQuery.data.value ?? null),
    isLoading: chartQuery.isLoading,
    saveMutation,
  }
}
