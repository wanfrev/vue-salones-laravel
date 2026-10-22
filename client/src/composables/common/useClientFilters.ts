import { ref, computed, watch, type Ref } from 'vue'
import { usePagination } from './usePagination'
import {
  DEFAULT_FILTERS, filterAndSortClients, isFiltered, segmentCounts,
  type ClientFilterState, type ClientSegment, type ClientSort,
} from '../../components/clients/clientFilters'
import type { Cliente } from '../../types/cliente'

/**
 * Estado del directorio de clientes: búsqueda, segmento (activos / inactivos / sin visitas / nuevos),
 * ventana de días, orden y paginación. La lógica vive en clientFilters.ts (TypeScript puro).
 * Cualquier cambio de filtro vuelve a la primera página.
 */
export function useClientFilters(clients: Ref<Cliente[]>, options: { pageSize?: number } = {}) {
  const search = ref(DEFAULT_FILTERS.search)
  const segment = ref<ClientSegment>(DEFAULT_FILTERS.segment)
  const windowDays = ref(DEFAULT_FILTERS.windowDays)
  const sort = ref<ClientSort>(DEFAULT_FILTERS.sort)

  const state = computed<ClientFilterState>(() => ({
    search: search.value,
    segment: segment.value,
    windowDays: windowDays.value,
    sort: sort.value,
  }))

  const filteredClients = computed(() => filterAndSortClients(clients.value, state.value))
  const counts = computed(() => segmentCounts(clients.value, windowDays.value))
  const filtered = computed(() => isFiltered(state.value))

  const pagination = usePagination({ data: filteredClients, pageSize: options.pageSize ?? 20 })

  // firstPage (y no goToPage(1)): con 0 resultados goToPage ignora el cambio y la página se quedaría atrás.
  watch([search, segment, windowDays, sort], () => pagination.firstPage())
  // Si al refrescar la lista quedan menos páginas que la actual, vuelve a la última que exista.
  watch(() => pagination.totalPages.value, (total) => {
    if (total > 0 && pagination.currentPage.value > total) pagination.goToPage(total)
  })

  const clearFilters = () => {
    search.value = DEFAULT_FILTERS.search
    segment.value = DEFAULT_FILTERS.segment
  }

  return {
    search,
    segment,
    windowDays,
    sort,
    filtered,
    filteredClients,
    counts,
    totalClientes: computed(() => clients.value.length),
    clearFilters,
    ...pagination,
  }
}
