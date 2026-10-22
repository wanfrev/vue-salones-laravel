import { computed, ref, type Ref } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import type { ClientVisit, ClientVisitsPage, ClientVisitsSummary } from '../../types/clientVisits'

/**
 * Historial de visitas de un cliente, paginado en el servidor (20 por página, "Ver más") con filtro
 * opcional por rango de fechas. Datos transaccionales: staleTime 0. El resumen (totales, saldo,
 * última visita) viene en la primera página y no depende del filtro.
 */
export function useClientVisits(clientId: Ref<string>) {
  const authStore = useAuthStore()
  const businessId = computed(() => authStore.businessId ?? '')

  const from = ref('')
  const to = ref('')
  const rangeInvalid = computed(() => !!from.value && !!to.value && from.value > to.value)

  const query = useInfiniteQuery({
    queryKey: computed(() => ['client-visits', businessId.value, clientId.value, from.value, to.value] as const),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) })
      if (from.value) params.set('from', from.value)
      if (to.value) params.set('to', to.value)
      return apiRequest<ClientVisitsPage>('GET', `/clients/${clientId.value}/visits?${params.toString()}`)
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.page + 1 : undefined),
    enabled: computed(() => !!businessId.value && !!clientId.value && !rangeInvalid.value),
    staleTime: 0,
  })

  const visits = computed<ClientVisit[]>(() => query.data.value?.pages.flatMap(p => p.data) ?? [])
  const summary = computed<ClientVisitsSummary | null>(() => query.data.value?.pages[0]?.summary ?? null)

  function setRange(nextFrom: string, nextTo: string) {
    from.value = nextFrom
    to.value = nextTo
  }

  return {
    visits,
    summary,
    from,
    to,
    rangeInvalid,
    setRange,
    // Primera carga o cambio de filtro (no "Ver más").
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    hasMore: computed(() => !!query.hasNextPage.value),
    isLoadingMore: computed(() => query.isFetchingNextPage.value),
    loadMore: () => { void query.fetchNextPage() },
    retry: () => { void query.refetch() },
  }
}
