import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listConsents, createConsent, type ConsentCreatePayload } from '../../services/dental/consentService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useConsents(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const consentsQuery = useQuery({
    queryKey: computed(() => ['dental-consents', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listConsents(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const consents = computed(() => consentsQuery.data.value ?? [])

  const createMutation = useMutation({
    mutationFn: async (data: ConsentCreatePayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createConsent(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dental-consents', clientId()], exact: false })
      success('Consentimiento firmado y guardado')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar el consentimiento')),
  })

  return { consentsQuery, consents, isLoading: consentsQuery.isLoading, createMutation }
}
