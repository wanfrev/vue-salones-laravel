<template>
  <DrawerBase
    :is-open="isOpen"
    title="Filtros"
    subtitle="Refina los resultados mostrados"
    position="right"
    confirm-text="Aplicar Filtros"
    cancel-text="Limpiar Todo"
    @close="close"
    @confirm="applyFilters"
    @cancel="clearFilters"
  >
    <div class="space-y-6">
      <!-- Búsqueda -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-text-secondary">Búsqueda</label>
        <FormInput
          v-model="localFilters.search"
          placeholder="Buscar..."
          size="sm"
          prefix-icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </div>

      <!-- Días sin visitar -->
      <div v-if="showDaysSinceFilter" class="space-y-2">
        <label class="text-sm font-medium text-text-secondary">Ventana de inactividad</label>
        <FormInput
          v-model="localFilters.daysSinceVisit"
          type="number"
          min="1"
          placeholder="30"
          size="sm"
          hint="Mostrar clientes que no han visitado en los últimos N días"
        />
      </div>

      <!-- Fecha -->
      <div v-if="showDateFilter" class="space-y-3">
        <label class="text-sm font-medium text-text-secondary">Rango de Fechas</label>
        <FormInput
          v-model="localFilters.dateFrom"
          type="date"
          label="Desde"
          size="sm"
        />
        <FormInput
          v-model="localFilters.dateTo"
          type="date"
          label="Hasta"
          size="sm"
        />
      </div>

      <!-- Ordenar por -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-text-secondary">Ordenar por</label>
        <FormSelect
          v-model="localFilters.sortBy"
          :options="sortOptions"
          size="sm"
        />
      </div>

      <!-- Filtros activos -->
      <div v-if="activeFiltersCount > 0" class="rounded-xl bg-primary-light p-3">
        <p class="text-sm font-medium text-primary">
          {{ activeFiltersCount }} filtro(s) activo(s)
        </p>
      </div>
    </div>
  </DrawerBase>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDrawer } from '../../composables/common/useDrawer'
import DrawerBase from '../common/DrawerBase.vue'
import { FormInput, FormSelect } from '../forms'

const DRAWER_ID = 'filter-drawer'

export interface FilterState {
  search: string
  dateFrom: string
  dateTo: string
  sortBy: string
  daysSinceVisit: string
}

interface Props {
  showDateFilter?: boolean
  sortOptions?: { value: string; label: string }[]
  showDaysSinceFilter?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDateFilter: true,
  showDaysSinceFilter: false,
  sortOptions: () => [
    { value: 'newest', label: 'Más reciente' },
    { value: 'oldest', label: 'Más antiguo' },
    { value: 'name', label: 'Nombre' },
  ],
})

const emit = defineEmits<{
  apply: [filters: FilterState]
  clear: []
}>()

const { isOpen, close } = useDrawer(DRAWER_ID)

const defaultFilters: FilterState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'newest',
  daysSinceVisit: '30',
}

const localFilters = ref<FilterState>({ ...defaultFilters })

const activeFiltersCount = computed(() => {
  let count = 0
  if (localFilters.value.search) count++
  if (localFilters.value.dateFrom) count++
  if (localFilters.value.dateTo) count++
  if (localFilters.value.daysSinceVisit && localFilters.value.daysSinceVisit !== '30') count++
  if (localFilters.value.sortBy !== 'newest') count++
  return count
})

const applyFilters = () => {
  emit('apply', { ...localFilters.value })
  close()
}

const clearFilters = () => {
  localFilters.value = { ...defaultFilters }
  emit('clear')
}

const open = () => {
  useDrawer(DRAWER_ID).open()
}

const setFilters = (filters: Partial<FilterState>) => {
  localFilters.value = { ...localFilters.value, ...filters }
}

defineExpose({
  open,
  close,
  isOpen,
  setFilters,
  clearFilters,
})
</script>
