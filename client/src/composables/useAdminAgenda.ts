import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { toISODate } from '../lib/formatters'
import { listCitas, agendaKeys } from '../services/agendaService'
import { listServicios, serviciosKeys } from '../services/serviciosService'
import { listEquipo, equipoKeys } from '../services/equipoService'
import { useBusinessStore } from '../store/business'
import type { Cita } from '../types/cita'

export function useAdminAgenda(businessId: () => string | null) {
  const selectedDate = ref<Date>(new Date())
  const filterDate = ref<string | null>(null)
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
    const filtered = filterDate.value ? all.filter(c => c.date === filterDate.value) : all
    // Deduplicate grouped appointments — only show one per group
    const seen = new Set<string>()
    return filtered.filter(c => {
      if (c.groupId) {
        if (seen.has(c.groupId)) return false
        seen.add(c.groupId)
      }
      return true
    })
  })

  const goToToday = () => {
    selectedDate.value = new Date()
    filterDate.value = todayIso.value
  }

  const showAll = () => {
    filterDate.value = null
  }

  const setFilterDate = (date: Date | string | null) => {
    if (!date) {
      filterDate.value = null
      return
    }
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
    filterDate.value = toISODate(d)
    selectedDate.value = d
  }

  const todayLabel = computed(() => {
    if (!filterDate.value) return 'Todas'
    const d = new Date(filterDate.value + 'T12:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}-${mm}-${yy}`
  })

  const isToday = computed(() => filterDate.value === todayIso.value)

  const stats = computed(() => {
    const filterIso = filterDate.value ?? todayIso.value
    const citasDelDia = (citasData.value ?? []).filter(c => c.date === filterIso)

    return {
      citasHoy: citasDelDia.length,
      pendientes: citasDelDia.filter(c => c.status === 'pending').length,
      confirmadas: citasDelDia.filter(c => c.status === 'confirmed').length,
      estimadoHoy: citasDelDia
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
  })))

  return {
    selectedDate,
    filterDate,
    citas,
    isLoading,
    stats,
    serviciosList,
    empleadosList,
    todayLabel,
    isToday,
    goToToday,
    showAll,
    setFilterDate,
    todayIso,
  }
}
