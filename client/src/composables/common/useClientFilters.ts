import { ref, computed, watch, type Ref } from 'vue'
import { usePagination } from './usePagination'
import { useClientItemMatches } from '../clients/useClientItemMatches'
import {
  DEFAULT_FILTERS, filterAndSortClients, isFiltered, segmentCounts,
  type ClientFilterState, type ClientSegment, type ClientSort, type ItemMode,
} from '../../components/clients/clientFilters'
import type { Cliente } from '../../types/cliente'

/**
 * Estado del directorio de clientes: búsqueda, segmento (activos / inactivos / sin visitas / nuevos),
 * ventana de días, orden y paginación. La lógica vive en clientFilters.ts (TypeScript puro).
 * Cualquier cambio de filtro vuelve a la primera página.
 *
 * `itemFilter` (solo administración) habilita el filtro por producto o servicio: «lo compraron o se lo hicieron» y
 * «no han vuelto desde hace N días». Lo que sabe el servidor llega con useClientItemMatches y se cruza con la lista.
 * Sin esa opción el filtro no existe (y no se hace ninguna petición extra).
 */
export function useClientFilters(clients: Ref<Cliente[]>, options: { pageSize?: number, itemFilter?: Ref<boolean> } = {}) {
  const search = ref(DEFAULT_FILTERS.search)
  const segment = ref<ClientSegment>(DEFAULT_FILTERS.segment)
  const windowDays = ref(DEFAULT_FILTERS.windowDays)
  const sort = ref<ClientSort>(DEFAULT_FILTERS.sort)
  const item = ref(DEFAULT_FILTERS.item)
  const itemMode = ref<ItemMode>(DEFAULT_FILTERS.itemMode)
  const itemDays = ref(DEFAULT_FILTERS.itemDays)

  const itemEnabled = options.itemFilter ?? ref(false)
  // Sin la opción (vista de empleado) ni siquiera se registra la consulta.
  const itemQuery = options.itemFilter
    ? useClientItemMatches(item, options.itemFilter)
    : {
      term: ref(''),
      matches: computed(() => null),
      searching: computed(() => false),
      truncated: computed(() => false),
      error: computed(() => null),
    }

  const state = computed<ClientFilterState>(() => ({
    search: search.value,
    segment: segment.value,
    windowDays: windowDays.value,
    sort: sort.value,
    // El texto ya sin espera de escritura: el mismo para el que se pidieron las coincidencias.
    item: itemEnabled.value ? itemQuery.term.value : '',
    itemMode: itemMode.value,
    itemDays: itemDays.value,
  }))

  const filteredClients = computed(() => filterAndSortClients(clients.value, state.value, new Date(), itemQuery.matches.value))
  const counts = computed(() => segmentCounts(clients.value, windowDays.value))
  const filtered = computed(() => isFiltered(state.value))

  const pagination = usePagination({ data: filteredClients, pageSize: options.pageSize ?? 20 })

  // firstPage (y no goToPage(1)): con 0 resultados goToPage ignora el cambio y la página se quedaría atrás.
  watch([search, segment, windowDays, sort, itemQuery.term, itemMode, itemDays], () => pagination.firstPage())
  // Si al refrescar la lista quedan menos páginas que la actual, vuelve a la última que exista.
  watch(() => pagination.totalPages.value, (total) => {
    if (total > 0 && pagination.currentPage.value > total) pagination.goToPage(total)
  })

  const clearFilters = () => {
    search.value = DEFAULT_FILTERS.search
    segment.value = DEFAULT_FILTERS.segment
    item.value = DEFAULT_FILTERS.item
  }

  return {
    search,
    segment,
    windowDays,
    sort,
    item,
    itemMode,
    itemDays,
    /** Coincidencias del servidor para el texto buscado (null mientras llegan o sin filtro activo). */
    itemMatches: itemQuery.matches,
    itemSearching: itemQuery.searching,
    itemTruncated: itemQuery.truncated,
    itemError: itemQuery.error,
    filtered,
    filteredClients,
    counts,
    totalClientes: computed(() => clients.value.length),
    clearFilters,
    ...pagination,
  }
}
