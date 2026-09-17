import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { listTransactionAuditLogs, transactionAuditLogKeys } from '../../services/transactionAuditLogService'

/**
 * Solo se llama cuando isStrictAdmin es true (ver CuadreDelDiaSection.vue) -- para cualquier
 * otro rol el backend devuelve 403, así que ni vale la pena disparar la consulta.
 */
export function useTransactionAuditLogs(
  businessId: import('vue').Ref<string | null>,
  periodDates: import('vue').Ref<{ start: string; end: string }>,
  branchId: import('vue').Ref<string | null>,
  enabled: import('vue').Ref<boolean>,
) {
  const queryKey = computed(() => transactionAuditLogKeys.all(
    businessId.value,
    branchId.value,
    periodDates.value.start,
    periodDates.value.end,
  ))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTransactionAuditLogs(
      businessId.value!,
      periodDates.value.start,
      periodDates.value.end,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value && enabled.value),
    staleTime: 15_000,
  })

  return {
    logs: computed(() => data.value ?? []),
    isLoading,
  }
}
