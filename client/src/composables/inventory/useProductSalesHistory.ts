import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { rangeFromPreset, type RangePreset, type SalesSort } from '../../components/productos/productSalesHistory'

/** Una fila por cliente que compró (o «none»: las ventas sin cliente registrado). */
export interface BuyerRow {
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  purchases: number
  units: number
  first_at: string | null
  last_at: string | null
}

export interface SalesSummary {
  buyers: number
  purchases: number
  units: number
  anonymous_purchases: number
  first_at: string | null
  last_at: string | null
}

export interface MatchedProduct { product_id: string; name: string; units: number; buyers: number }

export interface ProductSalesHistory {
  summary: SalesSummary
  products: MatchedProduct[]
  clients: BuyerRow[]
  page: number
  has_more: boolean
  range: { start: string; end: string }
}

export interface ClientSale {
  id: string
  date: string
  product_name: string
  variant_name: string | null
  quantity: number
  payment_method: string
  is_credit: boolean
  is_courtesy: boolean
  notes: string | null
}

interface ClientSalesPage { sales: ClientSale[]; page: number; has_more: boolean }

const SEARCH_DELAY_MS = 300

/**
 * Historial de compras por producto (pestaña «Ventas» de Productos): quién compró lo que se busca y desde cuándo.
 * Los datos de ventas son transaccionales, así que siempre se piden frescos (staleTime 0); se conserva la lista
 * anterior mientras llega la nueva para que no parpadee al filtrar.
 */
export function useProductSalesHistory(search: Ref<string>, enabled: Ref<boolean>) {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const preset = ref<RangePreset>('90')
  const sort = ref<SalesSort>('recent')
  const productId = ref<string | null>(null)
  const page = ref(1)

  // Se espera a que la persona deje de escribir para no pedir al servidor en cada letra.
  const term = ref(search.value.trim())
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(search, value => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { term.value = value.trim() }, SEARCH_DELAY_MS)
  })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  // Otra búsqueda, rango u orden = otra lista: se vuelve a la primera página y se suelta el producto elegido
  // (que era de la búsqueda anterior).
  watch(term, () => { productId.value = null; page.value = 1 })
  watch([preset, sort, productId], () => { page.value = 1 })

  const range = computed(() => rangeFromPreset(preset.value))

  const filters = computed(() => ({
    q: term.value,
    productId: productId.value,
    start: range.value.start,
    end: range.value.end,
    branchId: branchId.value,
  }))

  const query = useQuery({
    queryKey: computed(() => ['product-sales-history', 'list', businessId.value, filters.value, sort.value, page.value] as const),
    queryFn: () => {
      const f = filters.value
      const params = new URLSearchParams({ start: f.start, end: f.end, sort: sort.value, page: String(page.value) })
      if (f.q) params.set('q', f.q)
      if (f.productId) params.set('product_id', f.productId)
      if (f.branchId) params.set('branch_id', f.branchId)
      return apiRequest<ProductSalesHistory>('GET', `/products/sales-history?${params.toString()}`)
    },
    enabled: computed(() => enabled.value && !!businessId.value),
    staleTime: 0,
    placeholderData: keepPreviousData,
    shallow: true,
  })

  return {
    preset, sort, productId, page, filters,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Las compras de una cliente (o `none`) con los mismos filtros; «Ver más» trae la página siguiente. */
export function useClientSales(
  clientKey: Ref<string | null>,
  filters: Ref<{ q: string; productId: string | null; start: string; end: string; branchId: string | null }>,
) {
  const authStore = useAuthStore()
  const businessId = computed(() => authStore.businessId)

  return useInfiniteQuery({
    queryKey: computed(() => ['product-sales-history', 'client', businessId.value, clientKey.value, filters.value] as const),
    queryFn: ({ pageParam }) => {
      const f = filters.value
      const params = new URLSearchParams({ start: f.start, end: f.end, page: String(pageParam) })
      if (f.q) params.set('q', f.q)
      if (f.productId) params.set('product_id', f.productId)
      if (f.branchId) params.set('branch_id', f.branchId)
      return apiRequest<ClientSalesPage>('GET', `/products/sales-history/client/${clientKey.value}?${params.toString()}`)
    },
    initialPageParam: 1,
    getNextPageParam: last => (last.has_more ? last.page + 1 : undefined),
    enabled: computed(() => !!businessId.value && !!clientKey.value),
    staleTime: 0,
  })
}
