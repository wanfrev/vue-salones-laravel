import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { listClinicalAudit, type AuditFilters } from '../../services/clinical/auditService'

/** Bitácora de accesos al expediente. Siempre acotada por fechas y paginada en el servidor. */
export function useClinicalAudit(filters: () => AuditFilters, enabled: () => boolean = () => true) {
  const auditQuery = useQuery({
    queryKey: computed(() => ['clinical-audit', filters()]),
    queryFn: () => listClinicalAudit(filters()),
    enabled: computed(enabled),
    staleTime: 0,
  })

  const rows = computed(() => auditQuery.data.value?.rows ?? [])
  const hasMore = computed(() => auditQuery.data.value?.has_more ?? false)

  return { auditQuery, rows, hasMore, isLoading: auditQuery.isLoading, isFetching: auditQuery.isFetching }
}
