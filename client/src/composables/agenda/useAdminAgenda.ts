import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { toISODate } from '../../lib/formatters'
import { listCitas, agendaKeys } from '../../services/agendaService'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import { useBusinessStore } from '../../store/business'
import type { Cita } from '../../types/cita'

export type DateFilterMode = 'day' | 'week' | 'all'

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
  const businessStore = useBusinessStore()

  const currentBranchId = computed(() => businessStore.currentBranchId)

  const { data: citasData, isLoading } = useQuery({
    queryKey: computed(() => agendaKeys.appointments(businessId(), currentBranchId.value)),
    queryFn: () => listCitas(businessId()!, undefined, undefined, currentBranchId.value),
    enabled: computed(() => !!businessId()),
  })

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

  const citas = computed<Cita[]>(() => {
    const all = citasData.value ?? []
    let filtered: Cita[]
    if (dateFilterMode.value === 'all') {
      filtered = all
    } else if (dateFilterMode.value === 'week') {
      const { start, end } = getWeekRange(selectedDate.value)
      filtered = all.filter(c => {
        if (!c.date) return false
        return c.date >= toISODate(start) && c.date <= toISODate(end)
      })
    } else {
      filtered = filterDate.value ? all.filter(c => c.date === filterDate.value) : all
    }
    const seen = new Set<string>()
    return filtered.filter(c => {
      if (c.groupId) {
        if (seen.has(c.groupId)) return false
        seen.add(c.groupId)
      }
      return true
    })
  })

  const activeCitas = computed(() =>
    citas.value.filter(c => c.status !== 'cancelled')
  )

  const historialCitas = computed(() =>
    citas.value.filter(c => c.status === 'paid' || c.status === 'cancelled')
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
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
    filterDate.value = toISODate(d)
    selectedDate.value = d
    dateFilterMode.value = 'day'
  }

  const todayLabel = computed(() => {
    if (dateFilterMode.value === 'all') return 'Todas'
    if (dateFilterMode.value === 'week') {
      const { start, end } = getWeekRange(selectedDate.value)
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        return `${dd}-${mm}`
      }
      return `Semana ${fmt(start)} — ${fmt(end)}`
    }
    const d = new Date((filterDate.value || todayIso.value) + 'T12:00:00')
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
    if (dateFilterMode.value === 'all') return 'total'
    if (dateFilterMode.value === 'week') return 'esta semana'
    return 'hoy'
  })

  const stats = computed(() => {
    let citasDelPeriodo: Cita[]
    if (dateFilterMode.value === 'all') {
      citasDelPeriodo = citasData.value ?? []
    } else if (dateFilterMode.value === 'week') {
      const { start, end } = getWeekRange(selectedDate.value)
      citasDelPeriodo = (citasData.value ?? []).filter(c =>
        c.date >= toISODate(start) && c.date <= toISODate(end)
      )
    } else {
      const filterIso = filterDate.value ?? todayIso.value
      citasDelPeriodo = (citasData.value ?? []).filter(c => c.date === filterIso)
    }

    return {
      citasHoy: citasDelPeriodo.length,
      pendientes: citasDelPeriodo.filter(c => c.status === 'pending').length,
      confirmadas: citasDelPeriodo.filter(c => c.status === 'confirmed').length,
      estimadoHoy: citasDelPeriodo
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
  })))

  const empleadosList = computed(() => (empleadosData.value ?? []).map(employee => ({
    id: employee.id,
    name: employee.name,
    payType: employee.payType,
    payPercentage: employee.payPercentage,
    disableAgenda: employee.disableAgenda,
  })))

  return {
    selectedDate,
    filterDate,
    dateFilterMode,
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
    todayIso,
  }
}
