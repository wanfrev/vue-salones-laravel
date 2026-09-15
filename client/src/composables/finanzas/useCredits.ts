import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { Credit, CreditPayment } from '../../types/database'

export function useCredits(periodDates?: import('vue').Ref<{ start: string; end: string } | null | undefined>) {
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
    staleTime: 15000,
  })

  const credits = computed(() => creditsQuery.data.value ?? [])
  const inRange = (dateStr: string | null): boolean => {
    const range = periodDates?.value
    if (!range) return true
    if (!dateStr) return false
    // dateStr is a full timestamp (created_at/paid_at); range is a plain YYYY-MM-DD pair —
    // compare on the date portion only, or a same-day timestamp after 00:00 would sort past
    // range.end and get dropped from its own last day.
    const day = dateStr.slice(0, 10)
    return day >= range.start && day <= range.end
  }
  // "Pendientes" agrupa pending + partial: ambos todavía tienen saldo por cobrar y necesitan
  // la misma acción (registrar abono) — separarlos en tabs distintos no aporta, solo divide
  // la misma cola de trabajo en dos. Se filtra por fecha de la venta (created_at): el rango
  // seleccionado en Finanzas responde "qué créditos se generaron en este período y siguen
  // pendientes", igual que cualquier otra pestaña.
  const pendingCredits = computed(() => credits.value.filter(c => c.status !== 'paid' && inRange(c.created_at)))
  // "Pagados" se filtra por fecha de pago (paid_at) — es el ingreso que entró en el período.
  const paidCredits = computed(() => credits.value.filter(c => c.status === 'paid' && inRange(c.paid_at)))
  const pendingTotal = computed(() => pendingCredits.value.reduce((sum, c) => sum + Number(c.remaining ?? c.amount ?? 0), 0))

  const payMutation = useMutation({
    mutationFn: async (payload: { id: string; amount: number; method: string; currency?: 'USD' | 'VES'; exchangeRate?: number }) => {
      getBusinessId()
      return await apiRequest<{ credit: Credit; payment: CreditPayment }>('POST', `/credits/${payload.id}/pay`, {
        amount: payload.amount,
        method: payload.method,
        currency: payload.currency,
        exchange_rate: payload.exchangeRate,
      })
    },
    onSuccess: (result) => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['credits'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['credit-payments', result.credit.id], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false }),
      ])
      success(result.credit.status === 'paid' ? 'Crédito pagado por completo' : 'Abono registrado')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al registrar el abono'))
    },
  })

  const usePaymentsForCredit = (creditId: () => string | null) => useQuery({
    queryKey: computed(() => ['credit-payments', creditId()]),
    queryFn: async () => {
      const id = creditId()
      if (!id) return []
      return await apiRequest<CreditPayment[]>('GET', `/credits/${id}/payments`)
    },
    enabled: computed(() => !!creditId()),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      getBusinessId()
      await apiRequest('DELETE', `/credits/${id}`)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['credits'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false }),
      ])
      success('Crédito eliminado')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al eliminar el crédito'))
    },
  })

  return {
    creditsQuery,
    credits,
    pendingCredits,
    paidCredits,
    pendingTotal,
    isLoading: creditsQuery.isLoading,
    payMutation,
    usePaymentsForCredit,
    deleteMutation,
  }
}
