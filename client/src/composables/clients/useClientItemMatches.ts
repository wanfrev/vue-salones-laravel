import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { ITEM_MIN_CHARS, type ClientItemMatch } from '../../components/clients/clientFilters'

interface ClientItemMatches {
  clients: ClientItemMatch[]
  truncated: boolean
  range: { start: string; end: string }
}

const SEARCH_DELAY_MS = 300

/**
 * Qué clientas compraron o se hicieron lo que se busca (producto y servicio juntos, último año). Es la parte que sabe
 * el servidor; el directorio la cruza con su lista. Se espera a que la persona deje de escribir y no se muestran
 * resultados de otra búsqueda mientras llegan los nuevos (sin placeholderData): `matches` es null hasta tener los de
 * ESTE texto. Datos transaccionales: staleTime 0.
 */
export function useClientItemMatches(search: Ref<string>, enabled: Ref<boolean>) {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const term = ref(search.value.trim())
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(search, value => {
    if (timer) clearTimeout(timer)
    // Borrar (o dejar menos de las letras mínimas) quita el filtro al instante; la espera es solo para escribir.
    if (value.trim().length < ITEM_MIN_CHARS) { term.value = value.trim(); return }
    timer = setTimeout(() => { term.value = value.trim() }, SEARCH_DELAY_MS)
  })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  const active = computed(() => enabled.value && term.value.length >= ITEM_MIN_CHARS)

  const query = useQuery({
    queryKey: computed(() => ['client-item-matches', businessId.value, branchId.value, term.value] as const),
    queryFn: () => {
      const params = new URLSearchParams({ q: term.value })
      if (branchId.value) params.set('branch_id', branchId.value)
      return apiRequest<ClientItemMatches>('GET', `/clients/by-item?${params.toString()}`)
    },
    enabled: computed(() => active.value && !!businessId.value),
    staleTime: 0,
    shallow: true,
  })

  // Una sola pasada: id → coincidencia, para consultar a cada clienta en O(1).
  const matches = computed<Map<string, ClientItemMatch> | null>(() => {
    const data = query.data.value
    if (!active.value || !data) return null
    return new Map(data.clients.map(m => [m.client_id, m]))
  })

  return {
    /** Texto ya sin espera de escritura (el que se está consultando). */
    term,
    matches,
    truncated: computed(() => active.value && !!query.data.value?.truncated),
    /** Escribió algo (o cambió el texto) y todavía no llega la respuesta. */
    searching: computed(() => active.value && (query.isFetching.value || !query.data.value) && !query.error.value),
    error: computed(() => (active.value ? query.error.value : null)),
    refetch: query.refetch,
  }
}
