import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { toISODate, parseLocalDate } from '../../lib/formatters'
import { listCitas, agendaKeys, searchCitasGlobal } from '../../services/agendaService'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import { useBusinessStore } from '../../store/business'
import type { Cita } from '../../types/cita'

// Una cita de grupo (varios servicios reservados en la misma visita) llega como
// varias filas de Cita compartiendo groupId — se juntan en una sola, guardando los
// nombres de servicio de las demás en `groupServiceNames` para mostrar "+N servicios"
// en la lista (mismo criterio que ya se usa en el buscador global de Calendario).
function dedupeByGroup(all: Cita[]): Cita[] {
  const rows: Cita[] = []
  const indexByGroup = new Map<string, number>()
  for (const c of all) {
    if (c.groupId && indexByGroup.has(c.groupId)) {
      const idx = indexByGroup.get(c.groupId)!
      rows[idx].groupServiceNames!.push(c.service)
      continue
    }
    const row = c.groupId ? { ...c, groupServiceNames: [c.service] } : c
    rows.push(row)
    if (c.groupId) indexByGroup.set(c.groupId, rows.length - 1)
  }
  return rows
}

export type DateFilterMode = 'day' | 'week' | 'all' | 'range'

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export function useAdminAgenda(businessId: () => string | null) {
  const selectedDate = ref<Date>(new Date())
  const filterDate = ref<string | null>(toISODate(new Date()))
  const dateFilterMode = ref<DateFilterMode>('day')
  const rangeStart = ref<string | null>(null)
  const rangeEnd = ref<string | null>(null)
  const businessStore = useBusinessStore()

  const currentBranchId = computed(() => businessStore.currentBranchId)

  const dateRange = computed(() => {
    if (dateFilterMode.value === 'day') {
      const d = filterDate.value ? parseLocalDate(filterDate.value, 12, 0, 0) : new Date()
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end = new Date(d); end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    if (dateFilterMode.value === 'week') {
      return getWeekRange(selectedDate.value)
    }
    if (dateFilterMode.value === 'range' && rangeStart.value && rangeEnd.value) {
      const start = parseLocalDate(rangeStart.value, 0, 0, 0)
      const end = parseLocalDate(rangeEnd.value, 23, 59, 59)
      return { start, end }
    }
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth() - 3, 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 3, 1)
    return { start, end }
  })

  const { data: citasData, isLoading: isDateLoading } = useQuery({
    queryKey: computed(() => [
      ...agendaKeys.appointments(businessId(), currentBranchId.value),
      dateFilterMode.value,
      dateFilterMode.value === 'day' ? filterDate.value : null,
      dateFilterMode.value === 'week' ? toISODate(getWeekRange(selectedDate.value).start) : null,
      dateFilterMode.value === 'range' ? rangeStart.value : null,
      dateFilterMode.value === 'range' ? rangeEnd.value : null,
    ]),
    queryFn: () => listCitas(businessId()!, dateRange.value, undefined, currentBranchId.value),
    enabled: computed(() => !!businessId() && (dateFilterMode.value !== 'range' || !!(rangeStart.value && rangeEnd.value))),
    staleTime: 15000,
  })

  // ── Global search (client/servicio/empleado, cualquier fecha) ──
  // No hay ningún otro filtro de texto en esta vista: sin esto, encontrar una cita
  // específica con el filtro "Todas" (~6 meses) implica pasar páginas a mano.
  const searchQuery = ref('')
  const debouncedSearchQuery = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  const setSearchQuery = (val: string) => {
    searchQuery.value = val
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => { debouncedSearchQuery.value = val.trim() }, 250)
  }
  const isSearching = computed(() => debouncedSearchQuery.value.length >= 2)

  const { data: searchResultsData, isFetching: isSearchLoading } = useQuery({
    queryKey: computed(() => ['agenda-admin-search', businessId(), currentBranchId.value, debouncedSearchQuery.value]),
    queryFn: () => searchCitasGlobal(businessId()!, debouncedSearchQuery.value, currentBranchId.value),
    enabled: computed(() => !!businessId() && isSearching.value),
    staleTime: 15000,
  })

  const isLoading = computed(() => isSearching.value ? isSearchLoading.value : isDateLoading.value)

  const { data: serviciosData } = useQuery({
    queryKey: computed(() => serviciosKeys.all(businessId(), currentBranchId.value)),
    queryFn: () => listServicios(businessId()!, currentBranchId.value),
    enabled: computed(() => !!businessId()),
  })

  const { data: empleadosData } = useQuery({
    queryKey: computed(() => equipoKeys.all(businessId(), currentBranchId.value)),
    queryFn: () => listEquipo(businessId()!, currentBranchId.value),
    enabled: computed(() => !!businessId()),
  })

  const todayIso = computed(() => toISODate(new Date()))

  // Citas del filtro de fecha activo (día/semana/todas) — esto es lo que alimentan
  // las stats de abajo, para que no cambien mientras se busca.
  const dateFilteredCitas = computed<Cita[]>(() => dedupeByGroup(citasData.value ?? []))

  const citas = computed<Cita[]>(() =>
    isSearching.value ? dedupeByGroup(searchResultsData.value ?? []) : dateFilteredCitas.value
  )

  // Mientras se busca, se ignora el toggle Activas/Historial: el objetivo es encontrar
  // ESA cita puntual sin importar su estado (ej. saber si ya se pagó o se canceló).
  const activeCitas = computed(() =>
    isSearching.value ? citas.value : citas.value.filter(c => c.status !== 'cancelled')
  )

  const historialCitas = computed(() =>
    isSearching.value ? citas.value : citas.value.filter(c => c.status === 'paid' || c.status === 'cancelled')
  )

  const goToToday = () => {
    selectedDate.value = new Date()
    filterDate.value = todayIso.value
    dateFilterMode.value = 'day'
  }

  const showAll = () => {
    filterDate.value = null
    dateFilterMode.value = 'all'
  }

  const setWeekMode = () => {
    selectedDate.value = new Date()
    filterDate.value = null
    dateFilterMode.value = 'week'
  }

  const setFilterDate = (date: Date | string | null) => {
    if (!date) {
      filterDate.value = null
      dateFilterMode.value = 'all'
      return
    }
    const d = typeof date === 'string' ? parseLocalDate(date, 12, 0, 0) : date
    filterDate.value = toISODate(d)
    selectedDate.value = d
    dateFilterMode.value = 'day'
  }

  // Activa el modo de rango personalizado. Si todavía no hay fechas elegidas,
  // arranca con los últimos 30 días como punto de partida razonable.
  const openRangeMode = () => {
    if (!rangeStart.value || !rangeEnd.value) {
      const end = new Date()
      const start = new Date(); start.setDate(start.getDate() - 30)
      rangeStart.value = toISODate(start)
      rangeEnd.value = toISODate(end)
    }
    dateFilterMode.value = 'range'
  }

  const setCustomRange = (start: string | null, end: string | null) => {
    if (!start || !end) return
    // Si el usuario invierte los campos (hasta < desde), se intercambian solos
    // en vez de devolver un rango vacío que confundiría más que ayudar.
    rangeStart.value = start <= end ? start : end
    rangeEnd.value = start <= end ? end : start
    dateFilterMode.value = 'range'
  }

  const todayLabel = computed(() => {
    if (dateFilterMode.value === 'all') return 'Todas (6 meses)'
    if (dateFilterMode.value === 'week') {
      const { start, end } = getWeekRange(selectedDate.value)
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        return `${dd}-${mm}`
      }
      return `Semana ${fmt(start)} — ${fmt(end)}`
    }
    if (dateFilterMode.value === 'range' && rangeStart.value && rangeEnd.value) {
      const fmt = (iso: string) => {
        const d = parseLocalDate(iso, 12, 0, 0)
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`
      }
      return `${fmt(rangeStart.value)} — ${fmt(rangeEnd.value)}`
    }
    const d = parseLocalDate((filterDate.value || todayIso.value), 12, 0, 0)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}-${mm}-${yy}`
  })

  const isToday = computed(() => {
    if (dateFilterMode.value !== 'day') return false
    return filterDate.value === todayIso.value
  })

  const isThisWeek = computed(() => {
    if (dateFilterMode.value !== 'week') return false
    const now = new Date()
    const { start } = getWeekRange(now)
    const { start: selStart } = getWeekRange(selectedDate.value)
    return start.getTime() === selStart.getTime()
  })

  const periodLabel = computed(() => {
    if (dateFilterMode.value === 'all') return 'del período'
    if (dateFilterMode.value === 'week') return 'esta semana'
    if (dateFilterMode.value === 'range') return 'en el rango'
    return 'hoy'
  })

  const stats = computed(() => {
    // Siempre del filtro de fecha (día/semana/todas), nunca de la búsqueda — así las
    // tarjetas no cambian mientras el admin está buscando una cita puntual.
    // citasHoy/pendientes/confirmadas cuentan citas (deduplicadas por group_id, como en la tabla),
    // no filas de servicio — así el número coincide con lo que se ve listado abajo.
    const citasDelPeriodo = dateFilteredCitas.value
    // estimadoHoy sí necesita cada fila cruda: una cita agrupada con varios servicios
    // solo conserva el precio de un miembro tras deduplicar, así que sumar desde `citas`
    // subestimaría el ingreso total del día.
    const filasDelPeriodo = citasData.value ?? []

    return {
      citasHoy: citasDelPeriodo.length,
      pendientes: citasDelPeriodo.filter(c => c.status === 'pending').length,
      confirmadas: citasDelPeriodo.filter(c => c.status === 'confirmed').length,
      estimadoHoy: filasDelPeriodo
        .filter(c => c.status !== 'cancelled')
        .reduce((sum, c) => sum + c.price, 0)
        .toLocaleString(),
    }
  })

  const serviciosList = computed(() => (serviciosData.value ?? []).map(service => ({
    id: service.id,
    name: service.name,
    price: service.price,
    duration: service.duration,
    is_fixed_commission: service.is_fixed_commission,
    fixed_commission_amount: service.fixed_commission_amount,
    fixed_commission_assistant_amount: service.fixed_commission_assistant_amount,
  })))

  const empleadosList = computed(() => (empleadosData.value ?? []).map(employee => ({
    id: employee.id,
    name: employee.name,
    payType: employee.payType,
    payPercentage: employee.payPercentage,
    disableAgenda: employee.disableAgenda,
    showInPublicBooking: employee.showInPublicBooking,
  })))

  return {
    selectedDate,
    filterDate,
    dateFilterMode,
    rangeStart,
    rangeEnd,
    citasData,
    citas,
    activeCitas,
    historialCitas,
    isLoading,
    stats,
    serviciosList,
    empleadosList,
    todayLabel,
    isToday,
    isThisWeek,
    periodLabel,
    goToToday,
    showAll,
    setWeekMode,
    setFilterDate,
    openRangeMode,
    setCustomRange,
    todayIso,
    searchQuery,
    setSearchQuery,
    isSearching,
  }
}
