import { ref, computed, watch, type Ref } from 'vue'
import { usePagination } from '../common/usePagination'
import type { Cliente } from '../../types/cliente'
import type { FilterState } from '../components/filters'

export function useClientFilters(clients: Ref<Cliente[]>) {
  const searchQuery = ref('')
  const activeFilters = ref<Partial<FilterState>>({})
  const daysSinceVisitFilter = ref(0)

  watch(() => activeFilters.value.daysSinceVisit, (val) => {
    daysSinceVisitFilter.value = val !== undefined && val !== '' ? Number(val) || 0 : 0
  }, { immediate: true })

  const filteredClients = computed(() => {
    let result = clients.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }

    if (daysSinceVisitFilter.value > 0) {
      const threshold = new Date()
      threshold.setDate(threshold.getDate() - daysSinceVisitFilter.value)
      result = result.filter(c => {
        if (!c.lastVisit || c.lastVisit === 'Sin visitas') return true
        return new Date(c.lastVisit) < threshold
      })
    }

    const sortBy = activeFilters.value.sortBy
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.joinDate!).getTime() - new Date(b.joinDate!).getTime())
    } else {
      result = [...result].sort((a, b) => new Date(b.joinDate!).getTime() - new Date(a.joinDate!).getTime())
    }

    return result
  })

  const totalClientes = computed(() => clients.value.length)
  const clientesRecientes = computed(() => {
    if (daysSinceVisitFilter.value <= 0) return 0
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysSinceVisitFilter.value)
    return clients.value.filter(c =>
      c.lastVisit && c.lastVisit !== 'Sin visitas' && new Date(c.lastVisit) >= threshold
    ).length
  })
  const clientesSinVisitar = computed(() => {
    if (daysSinceVisitFilter.value <= 0) return 0
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysSinceVisitFilter.value)
    return clients.value.filter(c =>
      !c.lastVisit || c.lastVisit === 'Sin visitas' || new Date(c.lastVisit) < threshold
    ).length
  })
  const clientesConHistorial = computed(() =>
    clients.value.filter(c => c.lastVisit && c.lastVisit !== 'Sin visitas').length
  )

  const pagination = usePagination({
    data: filteredClients,
    pageSize: 5,
  })

  const handleApplyFilters = (filters: FilterState) => {
    activeFilters.value = filters
    pagination.goToPage(1)
  }

  const handleClearFilters = () => {
    activeFilters.value = {}
    daysSinceVisitFilter.value = 0
    pagination.goToPage(1)
  }

  const getFilterDrawerDefaults = () => ({
    daysSinceVisit: String(daysSinceVisitFilter.value),
  })

  return {
    searchQuery,
    activeFilters,
    daysSinceVisitFilter,
    filteredClients,
    totalClientes,
    clientesRecientes,
    clientesSinVisitar,
    clientesConHistorial,
    handleApplyFilters,
    handleClearFilters,
    getFilterDrawerDefaults,
    ...pagination,
  }
}
