import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { translateError } from '../../lib/errors'
import { useNotification } from '../common/useNotification'
import type { BillingPlan, BusinessBillingData } from '../../lib/billing'

export interface RecordBillingPaymentInput {
  amount?: number | null
  paid_on?: string | null
  notes?: string | null
}

/** Plan de cobro, historial y vista previa del aviso de un negocio (pantalla del superadmin). */
export function useBusinessBilling(businessId: Ref<string>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const key = computed(() => ['superadmin', 'business-billing', businessId.value] as const)

  const query = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<BusinessBillingData>('GET', `/admin/businesses/${businessId.value}/billing`),
    enabled: computed(() => !!businessId.value),
    staleTime: 0,
  })

  const setData = (data: BusinessBillingData) => {
    queryClient.setQueryData(key.value, data)
    // Si el superadmin está suplantando a ese negocio en otra pestaña, su banner se refresca.
    queryClient.invalidateQueries({ queryKey: ['billing-notice'], exact: false })
  }

  const saveMutation = useMutation({
    mutationFn: (plan: BillingPlan) =>
      apiRequest<BusinessBillingData>('PUT', `/admin/businesses/${businessId.value}/billing`, plan),
    onSuccess: (data) => { setData(data); success('Plan de cobro guardado') },
    onError: (err) => showError(translateError(err, 'No se pudo guardar el plan de cobro')),
  })

  const paymentMutation = useMutation({
    mutationFn: (input: RecordBillingPaymentInput) =>
      apiRequest<BusinessBillingData>('POST', `/admin/businesses/${businessId.value}/billing/payments`, input),
    onSuccess: (data) => { setData(data); success('Pago registrado: la próxima fecha avanzó un ciclo') },
    onError: (err) => showError(translateError(err, 'No se pudo registrar el pago')),
  })

  const undoMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest<BusinessBillingData>('DELETE', `/admin/businesses/${businessId.value}/billing/payments/${paymentId}`),
    onSuccess: (data) => { setData(data); success('Pago deshecho') },
    onError: (err) => showError(translateError(err, 'No se pudo deshacer el pago')),
  })

  return {
    data: computed(() => query.data.value ?? null),
    isLoading: query.isLoading,
    savePlan: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    recordPayment: paymentMutation.mutateAsync,
    isRecording: paymentMutation.isPending,
    undoPayment: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
  }
}
