import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getReceivablesAging, receivablesKeys } from '../../services/staffing/receivablesService'

/** Accounts-receivable aging — opt-in (`staffing_receivables`), so `enabled` also carries the flag. */
export function useReceivablesAging(businessId: Ref<string | null>, enabled: Ref<boolean>) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: computed(() => receivablesKeys.aging(businessId.value)),
    queryFn: getReceivablesAging,
    enabled: computed(() => !!businessId.value && enabled.value),
    staleTime: 0,
  })

  return { report: data, isLoading, isError, refetch }
}
