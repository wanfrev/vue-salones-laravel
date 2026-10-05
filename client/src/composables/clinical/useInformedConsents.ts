import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listInformedConsents, createInformedConsent, type InformedConsentPayload } from '../../services/clinical/informedConsentService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useInformedConsents(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const consentsQuery = useQuery({
    queryKey: computed(() => ['clinical-consents', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listInformedConsents(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const consents = computed(() => consentsQuery.data.value ?? [])

  const createMutation = useMutation({
    mutationFn: async (data: InformedConsentPayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createInformedConsent(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-consents', clientId()], exact: false })
      success('Consentimiento firmado y guardado')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar el consentimiento')),
  })

  return { consentsQuery, consents, isLoading: consentsQuery.isLoading, createMutation }
}
