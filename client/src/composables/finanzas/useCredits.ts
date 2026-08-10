import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { Credit } from '../../types/database'

export function useCredits() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const { success, error: showError } = useNotification()

  const getBusinessId = () => {
    const id = authStore.businessId
    if (!id) throw new Error('No business selected')
    return id
  }

  const creditsQuery = useQuery({
    queryKey: computed(() => ['credits', authStore.businessId]),
    queryFn: async () => {
      getBusinessId()
      return await apiRequest<Credit[]>('GET', '/credits')
    },
    enabled: computed(() => !!authStore.businessId),
    staleTime: 0,
  })

  const credits = computed(() => creditsQuery.data.value ?? [])
  const pendingCredits = computed(() => credits.value.filter(c => c.status === 'pending'))
  const paidCredits = computed(() => credits.value.filter(c => c.status === 'paid'))
  const pendingTotal = computed(() => pendingCredits.value.reduce((sum, c) => sum + Number(c.amount ?? 0), 0))

  const markPaidMutation = useMutation({
    mutationFn: async (payload: { id: string; method: string; currency?: 'USD' | 'VES'; exchangeRate?: number }) => {
      getBusinessId()
      return await apiRequest<Credit>('POST', `/credits/${payload.id}/mark-paid`, {
        method: payload.method,
        currency: payload.currency,
        exchange_rate: payload.exchangeRate,
      })
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['credits'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false }),
      ])
      success('Crédito marcado como pagado')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al marcar el crédito como pagado'))
    },
  })

  return {
    creditsQuery,
    credits,
    pendingCredits,
    paidCredits,
    pendingTotal,
    isLoading: creditsQuery.isLoading,
    markPaidMutation,
  }
}
