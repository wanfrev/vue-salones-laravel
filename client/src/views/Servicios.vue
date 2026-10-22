<template>
  <header class="mb-4 flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <StarIcon class="h-4 w-4 shrink-0 text-primary" />
      <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ businessStore.terminology.servicePlural || 'Servicios' }}</h1>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <ServiceCategoryMenu
        v-model:adding="addingCategory"
        v-model:name="newCatName"
        :categories="categories.filter(c => c.id !== 'all')"
        @select="activeCategory = $event"
        @rename="openRenameCategoryModal"
        @remove="openDeleteCategoryModal"
        @add="addCategory"
      />
      <button
        @click="handleNewServicio"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Nuevo {{ businessStore.terminology.service?.toLowerCase() || 'servicio' }}</span>
      </button>
    </div>
  </header>

  <section class="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <ServiceSummary
      :plural="businessStore.terminology.servicePlural || 'Servicios'"
      :activos="totalServicios"
      :categorias="totalCategorias"
      :citas-mes="totalCitasMes"
      :precio-promedio="precioPromedioNumerico"
    />

    <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
      <div class="relative">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre o categoría..."
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
        />
      </div>
    </div>

    <ServiceCategoryTabs v-model="activeCategory" :categories="categories" />

    <!-- Cuadrícula: celdas separadas por líneas finas, sin una tarjeta por servicio -->
    <div v-if="paginatedServices.length > 0" class="overflow-hidden">
      <div class="-mb-px -mr-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ServiceCard
          v-for="service in paginatedServices"
          :key="service.id"
          :service="service"
          :appointment-label="businessStore.terminology.appointmentPlural || 'Citas'"
          @edit="handleEditServicio"
          @delete="handleDeleteServicio"
        />
      </div>
    </div>

    <EmptyState
      v-if="filteredServices.length === 0"
      icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      :title="`No hay ${(businessStore.terminology.servicePlural || 'Servicios').toLowerCase()}`"
      :subtitle="searchQuery ? `No se encontraron ${(businessStore.terminology.servicePlural || 'Servicios').toLowerCase()} con ese criterio de búsqueda.` : `No se encontraron ${(businessStore.terminology.servicePlural || 'Servicios').toLowerCase()} en esta categoría.`"
    />

    <ListPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-numbers="pageNumbers"
      :has-next="hasNextPage"
      :has-previous="hasPreviousPage"
      :start="paginationStart"
      :end="paginationEnd"
      :total="filteredServices.length"
      @goto="goToPage"
      @next="nextPage"
      @previous="previousPage"
    />
  </section>

  <!-- Modals -->
  <ServicioFormModal
    ref="servicioModalRef"
    :is-saving="saveServicioMutation.isPending.value"
    @save="handleSaveServicio"
  />

  <ModalBase
    :is-open="isDeleteModalOpen"
    :title="`Eliminar ${businessStore.terminology.service || 'Servicio'}`"
    subtitle="Esta acción no se puede deshacer"
    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    variant="danger"
    size="sm"
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    :loading="deleteServicioMutation?.isPending.value ?? false"
    @close="isDeleteModalOpen = false"
    @confirm="confirmDelete"
    @cancel="isDeleteModalOpen = false"
  >
    <p class="text-sm text-text-secondary">
      ¿Estás seguro de que deseas eliminar <strong>{{ servicioToDelete?.name }}</strong>?
       Este {{ businessStore.terminology.service?.toLowerCase() || 'servicio' }} será eliminado permanentemente del catálogo.
    </p>
  </ModalBase>

  <ModalBase
    :is-open="isRenameCategoryOpen"
    title="Editar categoría"
    subtitle="Actualiza el nombre de la categoría"
    icon="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    size="sm"
    confirm-text="Guardar"
    cancel-text="Cancelar"
    :loading="isUpdatingCategory"
    @close="closeRenameCategoryModal"
    @confirm="confirmRenameCategory"
    @cancel="closeRenameCategoryModal"
  >
    <label class="mb-2 block text-sm font-medium text-text" for="new-category-name">Nombre</label>
    <input
      id="new-category-name"
      v-model="newCategoryName"
      type="text"
      class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
      placeholder="Nombre de la categoría"
    />
  </ModalBase>

  <ModalBase
    :is-open="isDeleteCategoryOpen"
    title="Eliminar categoría"
    subtitle="Los servicios quedarán sin categoría o se moverán a otra"
    icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    variant="danger"
    size="sm"
    confirm-text="Eliminar"
    cancel-text="Cancelar"
    :loading="isUpdatingCategory"
    @close="closeDeleteCategoryModal"
    @confirm="confirmDeleteCategory"
    @cancel="closeDeleteCategoryModal"
  >
    <p class="mb-3 text-sm text-text-secondary">
      La categoría <strong>{{ categoryToDelete }}</strong> será eliminada.
      Los servicios se mostrarán en <strong>Todos</strong>.
    </p>
    <label class="mb-2 block text-sm font-medium text-text" for="replacement-category">Mover a otra categoría (opcional)</label>
    <select
      id="replacement-category"
      v-model="replacementCategory"
      class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
    >
      <option value="">Sin categoría</option>
      <option
        v-for="cat in deleteCategoryOptions"
        :key="cat.id"
        :value="cat.id"
      >
        {{ cat.name }}
      </option>
    </select>
  </ModalBase>
</template>

<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ref, computed, watch } from 'vue'
import { useCrud } from '../composables/empleados/useCrud'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { useCategoryCRUD } from '../composables/common/useCategoryCRUD'
import { usePagination } from '../composables/common/usePagination'
import { useBusinessStore } from '../store/business'
import { ServicioFormModal } from '../components/modals'
import { ModalBase, EmptyState } from '../components/common'
import ListPagination from '../components/common/ListPagination.vue'
import ServiceCard from '../components/servicios/ServiceCard.vue'
import ServiceCategoryMenu from '../components/servicios/ServiceCategoryMenu.vue'
import ServiceCategoryTabs from '../components/servicios/ServiceCategoryTabs.vue'
import ServiceSummary from '../components/servicios/ServiceSummary.vue'
import { deleteServicio, listServicios, saveServicio, serviciosKeys } from '../services/serviciosService'
import { addBusinessCategory } from '../services/equipoService'
import { addBranchCategory } from '../services/equipoService'
import type { Servicio, ServicioFormData } from '../types/servicio'
import { StarIcon, MagnifierIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const { formatVESInline, formatUSD } = useCurrency()
const { success, error: showError, warning } = useNotification()

const servicioModalRef = ref<InstanceType<typeof ServicioFormModal> | null>(null)
const isDeleteModalOpen = ref(false)
const servicioToDelete = ref<Servicio | null>(null)
const addingCategory = ref(false)
const newCatName = ref('')
const searchQuery = ref('')
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const {
  items: servicios,
  saveMutation: saveServicioMutation,
  handleSave: handleSaveServicio,
  deleteMutation: deleteServicioMutation,
} = useCrud<Servicio, ServicioFormData>({
  businessId,
  branchId,
  queryKey: (id, brId) => serviciosKeys.all(id, brId),
  queryFn: (id, brId) => listServicios(id, brId),
  saveFn: (id, data, brId) => saveServicio(id, data, brId),
  deleteFn: (id) => deleteServicio(id),
  entityName: 'Servicio',
  modalRef: servicioModalRef,
  extraInvalidations: [
    () => ['appointments'],
    () => ['pos-pending'],
  ],
})

const {
  isUpdatingCategory,
  activeCategory,
  newCategoryName,
  isRenameCategoryOpen,
  categoryToDelete,
  replacementCategory,
  isDeleteCategoryOpen,
  categories,
  deleteCategoryOptions,
  filteredByCategory,
  openRenameCategoryModal,
  closeRenameCategoryModal,
  confirmRenameCategory,
  openDeleteCategoryModal,
  closeDeleteCategoryModal,
  confirmDeleteCategory,
} = useCategoryCRUD({
  businessId,
  branchId,
  services: servicios,
  businessStore: {
    updateBusiness: (data) => businessStore.updateBusiness(data),
    serviceCategories: businessStore.serviceCategories,
    branchServiceCategories: businessStore.branchServiceCategories,
    updateBranch: (data) => businessStore.updateBranch(data as any),
  },
  success,
  error: showError,
  warning,
})

const addCategory = async () => {
  const name = newCatName.value.trim()
  if (!name || !businessId.value) return
  const exists = categories.value.some(c => c.name.toLowerCase() === name.toLowerCase())
  if (exists) { showError('Esa categoría ya existe'); return }
  try {
    if (branchId.value) {
      const updated = await addBranchCategory(branchId.value, name)
      businessStore.updateBranch({ service_categories: updated } as any)
    } else {
      const updated = await addBusinessCategory(businessId.value, name)
      businessStore.updateBusiness({ service_categories: updated })
    }
    newCatName.value = ''
    addingCategory.value = false
    success('Categoría agregada')
    await Promise.allSettled([
      queryClient.invalidateQueries({ exact: false, queryKey: ['business', businessId.value] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['branches', businessId.value] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['servicios', businessId.value] }),
    ])
    await Promise.allSettled([
      queryClient.refetchQueries({ exact: false, queryKey: ['servicios', businessId.value] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['business', businessId.value] }),
      ...(branchId.value ? [queryClient.refetchQueries({ exact: false, queryKey: ['branches', businessId.value] })] : []),
    ])
  } catch (err) {
    showError('Error al agregar categoría')
  }
}

const filteredServices = computed(() => {
  let result = filteredByCategory.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  }
  return result
})

const {
  currentPage,
  totalPages,
  paginatedData: paginatedServices,
  paginationStart,
  paginationEnd,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  nextPage,
  previousPage,
  pageNumbers,
} = usePagination({ data: filteredServices, pageSize: 24 })

watch([searchQuery, activeCategory], () => goToPage(1))

const totalServicios = computed(() => servicios.value.filter(s => s.status === 'Activo').length)
const totalCategorias = computed(() => categories.value.length - 1)
const totalCitasMes = computed(() => servicios.value.reduce((sum, s) => sum + s.citasMes, 0))
const precioPromedioNumerico = computed(() => {
  if (servicios.value.length === 0) return 0
  const total = servicios.value.reduce((sum, s) => sum + s.price, 0)
  return Math.round(total / servicios.value.length)
})

const handleNewServicio = () => {
  servicioModalRef.value?.open(undefined, branchId.value ?? undefined)
}

const handleEditServicio = (servicio: Servicio) => {
  servicioModalRef.value?.open(servicio, branchId.value ?? undefined)
}

const handleDeleteServicio = (servicio: Servicio) => {
  servicioToDelete.value = servicio
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (servicioToDelete.value && deleteServicioMutation) {
    try {
      await deleteServicioMutation.mutateAsync(servicioToDelete.value.id)
    } catch {
      // Error handled by useCrud onError
    } finally {
      isDeleteModalOpen.value = false
      servicioToDelete.value = null
    }
  }
}
</script>
