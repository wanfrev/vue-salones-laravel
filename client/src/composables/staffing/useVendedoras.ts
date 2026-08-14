import { computed, type Ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { listVendedoras, vendedoraKeys } from '../../services/leadsService'

/** The admin CRM sidebar roster — empty for a non-admin caller, enforced server-side. */
export function useVendedoras(businessId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const queryKey = computed(() => vendedoraKeys.all(businessId.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listVendedoras(),
    enabled: computed(() => !!businessId.value),
  })

  return {
    vendedoras: computed(() => data.value ?? []),
    isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKey.value, exact: false }),
  }
}
