import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { inventarioKeys } from '../../services/inventarioService'
import {
  rangeError, rangeForPreset, type MovementDirection, type MovementSort, type MovementType, type PeriodPreset,
} from '../../components/productos/inventoryMovements'

export interface MovementRow {
  id: string
  date: string
  type: MovementType | string
  quantity: number
  unit_cost: number
  total_cost: number
  notes: string | null
  reference_type: string | null
  product_id: string
  product_name: string
  product_sku: string | null
  variant_name: string | null
  category_name: string | null
  /** Quien registró el movimiento. */
  user_name: string | null
  /** A quién afecta: la clienta de la venta o el empleado que consumió. */
  person_name: string | null
  person_role: 'client' | 'employee' | null
  branch_name: string | null
  location_name: string | null
}

export interface MovementsSummary {
  movements: number
  units_in: number
  units_out: number
  cost_in: number
  cost_out: number
}

interface CountOption { id: string; name: string; movements: number }

export interface MovementsPage {
  summary: MovementsSummary
  types: { type: string; movements: number }[]
  users: CountOption[]
  categories: CountOption[]
  movements: MovementRow[]
  page: number
  has_more: boolean
  range: { start: string; end: string }
}

export type MovementSource = { kind: string; missing?: boolean } & Record<string, any>

export interface MovementDetail {
  movement: MovementRow & { exchange_rate: number | null }
  source: MovementSource | null
  related: { id: string; date: string; type: string; quantity: number; product_name: string; variant_name: string | null; branch_name: string | null }[]
}

const SEARCH_DELAY_MS = 300

/**
 * Movimientos de inventario (pestaña «Movimientos» de Productos): todo lo que entró y salió, con período, tipo,
 * dirección, persona y categoría. Todo se filtra y pagina en el servidor y los totales cubren TODO lo filtrado.
 * Son datos transaccionales: siempre frescos (staleTime 0); se conserva la lista anterior mientras llega la nueva.
 *
 * La clave de consulta cuelga de `inventarioKeys.movements`, la que ya invalidan los ajustes, las transferencias y las
 * facturas de compra: así esta lista se actualiza sola cuando alguno de ellos termina.
 */
export function useInventoryMovements(search: Ref<string>, enabled: Ref<boolean>) {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const preset = ref<PeriodPreset>('month')
  const customStart = ref('')
  const customEnd = ref('')
  const types = ref<string[]>([])
  const direction = ref<MovementDirection>('')
  const userId = ref<string | null>(null)
  const categoryId = ref<string | null>(null)
  const productId = ref<string | null>(null)
  const sort = ref<MovementSort>('recent')
  const page = ref(1)

  // Se espera a que la persona deje de escribir para no pedir al servidor en cada letra.
  const term = ref(search.value.trim())
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(search, value => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { term.value = value.trim() }, SEARCH_DELAY_MS)
  })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  const range = computed(() => rangeForPreset(preset.value, new Date(), { start: customStart.value, end: customEnd.value }))
  /** Por qué no se puede consultar el período elegido (fechas incompletas, al revés o de más de 12 meses). */
  const dateError = computed(() => rangeError(range.value))

  // Otro filtro = otra lista: se vuelve a la primera página.
  watch([term, preset, customStart, customEnd, types, direction, userId, categoryId, productId, sort, branchId], () => { page.value = 1 })

  const filters = computed(() => ({
    q: term.value,
    start: range.value.start,
    end: range.value.end,
    types: types.value.join(','),
    direction: direction.value,
    userId: userId.value,
    categoryId: categoryId.value,
    productId: productId.value,
    branchId: branchId.value,
  }))

  const query = useQuery({
    queryKey: computed(() => [...inventarioKeys.movements(businessId.value, branchId.value), 'history', filters.value, sort.value, page.value] as const),
    queryFn: () => {
      const f = filters.value
      const params = new URLSearchParams({ start: f.start, end: f.end, sort: sort.value, page: String(page.value) })
      if (f.q) params.set('q', f.q)
      if (f.types) params.set('types', f.types)
      if (f.direction) params.set('direction', f.direction)
      if (f.userId) params.set('user_id', f.userId)
      if (f.categoryId) params.set('category_id', f.categoryId)
      if (f.productId) params.set('product_id', f.productId)
      if (f.branchId) params.set('branch_id', f.branchId)
      return apiRequest<MovementsPage>('GET', `/inventory/movement-history?${params.toString()}`)
    },
    enabled: computed(() => enabled.value && !!businessId.value && !dateError.value),
    staleTime: 0,
    placeholderData: keepPreviousData,
    shallow: true,
  })

  const clearFilters = () => {
    types.value = []
    direction.value = ''
    userId.value = null
    categoryId.value = null
    productId.value = null
  }

  /** Cuántos filtros (además del período y la búsqueda) hay puestos. */
  const activeFilters = computed(() =>
    (types.value.length ? 1 : 0) + (direction.value ? 1 : 0) + (userId.value ? 1 : 0) + (categoryId.value ? 1 : 0) + (productId.value ? 1 : 0))

  return {
    preset, customStart, customEnd, types, direction, userId, categoryId, productId, sort, page,
    filters, range, dateError, activeFilters, clearFilters,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Un movimiento con su origen y los demás de la misma operación (al abrir su detalle). */
export function useMovementDetail(movementId: Ref<string | null>) {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  return useQuery({
    queryKey: computed(() => [...inventarioKeys.movements(businessId.value, branchId.value), 'detail', movementId.value] as const),
    queryFn: () => apiRequest<MovementDetail>('GET', `/inventory/movement-history/${movementId.value}`),
    enabled: computed(() => !!businessId.value && !!movementId.value),
    staleTime: 0,
    shallow: true,
  })
}
