<template>
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <StarIcon class="h-3.5 w-3.5" />
        <span>{{ businessStore.terminology.service || 'Servicio' }}s</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <button
            @click="showCatMenu = !showCatMenu"
            class="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition-theme hover:bg-bg-secondary hover:text-text"
            title="Gestionar categorías"
          >
            <PenIcon class="h-4 w-4" />
          </button>
          <div v-if="showCatMenu" class="absolute left-0 top-full mt-1 w-56 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden" style="overflow: clip;">
            <div class="px-3 py-2 border-b border-border-subtle">
              <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Gestionar categorías</p>
            </div>
            <div class="max-h-60 overflow-y-auto py-1 touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
              <button
                v-for="cat in categories.filter(c => c.id !== 'all')"
                :key="cat.id"
                class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-secondary"
                @click="activeCategory = cat.id"
              >
                <span class="truncate font-medium text-text">{{ cat.name }}</span>
                <span class="flex items-center gap-1 shrink-0 ml-2">
                  <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 cursor-pointer hover:bg-primary/20" @click.stop="openRenameCategoryModal(cat.id); showCatMenu = false">Editar</span>
                  <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold text-danger bg-danger/10 cursor-pointer hover:bg-danger/20" @click.stop="openDeleteCategoryModal(cat.id); showCatMenu = false">Eliminar</span>
                </span>
              </button>
              <div v-if="addingCategory" class="flex items-center gap-1.5 px-3 py-2 border-t border-border-subtle">
                <input v-model="newCatName" type="text" placeholder="Nombre de categoría..."
                  class="flex-1 rounded border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-primary"
                  @keyup.enter="addCategory" />
                <button @click="addCategory" class="rounded bg-primary px-2 py-1 text-xs font-semibold text-white">Agregar</button>
                <button @click="addingCategory = false; newCatName = ''" class="rounded px-1.5 py-1 text-xs text-text-muted hover:text-text">✕</button>
              </div>
              <button v-else
                @click="addingCategory = true"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-primary font-medium transition-colors hover:bg-primary/5 border-t border-border-subtle">
                <AddCircleIcon class="h-4 w-4" />
                Agregar categoría
              </button>
            </div>
          </div>
          <div v-if="showCatMenu" class="fixed inset-0 z-40" @click="showCatMenu = false" />
        </div>
        <button
          @click="handleNewServicio"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Nuevo {{ businessStore.terminology.service || 'Servicio' }}</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Stats -->
  <div class="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border pb-4 lg:mb-8">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ businessStore.terminology.service || 'Servicio' }}s activos</p>
      <p class="mt-1 text-4xl font-extrabold leading-none tabular-nums text-text sm:text-5xl">{{ totalServicios }}</p>
    </div>
    <div class="flex flex-1 flex-wrap justify-between gap-x-6 gap-y-3 sm:justify-end sm:gap-x-10">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Categorías</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ totalCategorias }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Citas del mes</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ totalCitasMes }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Precio promedio</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-text">{{ formatUSD(precioPromedioNumerico) }}</p>
        <p class="text-[11px] text-text-muted">{{ formatVESInline(precioPromedioNumerico) }} Bs</p>
      </div>
    </div>
  </div>

  <!-- Category Tabs -->
  <div class="mb-5 flex overflow-x-auto rounded-xl border border-border bg-surface shadow-sm scrollbar-hide">
    <button
      v-for="(cat, index) in categories"
      :key="cat.id"
      :class="[
        'flex-1 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-center transition-all relative',
        index > 0 ? 'border-l border-border' : '',
        activeCategory === cat.id
          ? 'bg-primary text-text-inverse shadow-sm'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
      ]"
      @click="activeCategory = cat.id"
    >
      <span class="relative z-10">{{ cat.name }}</span>
      <div v-if="activeCategory === cat.id" class="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
    </button>
  </div>

  <!-- Search -->
  <div class="mb-4">
    <div class="relative">
      <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nombre o categoría..."
        class="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-muted outline-none transition-theme focus:border-primary"
      />
    </div>
  </div>

  <!-- Services Grid -->
  <div class="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <ServiceCard
      v-for="service in paginatedServices"
      :key="service.id"
      :service="service"
      :appointment-label="(businessStore.terminology.appointment || 'cita').toLowerCase()"
      @edit="handleEditServicio"
      @delete="handleDeleteServicio"
    />
  </div>

  <!-- Empty State -->
  <EmptyState
    v-if="filteredServices.length === 0"
    icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    title="No hay servicios"
    :subtitle="searchQuery ? 'No se encontraron servicios con ese criterio de búsqueda.' : 'No se encontraron servicios en esta categoría.'"
  />

  <!-- Pagination -->
  <div v-if="filteredServices.length > 0" class="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-3 sm:px-4 py-2.5">
    <div class="text-xs sm:text-sm text-text-muted">
      {{ paginationStart }}-{{ paginationEnd }} de {{ filteredServices.length }}
    </div>
    <div class="hidden sm:flex gap-1">
      <button
        @click="previousPage"
        :disabled="!hasPreviousPage"
        class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
        :class="hasPreviousPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
      >
        Anterior
      </button>
      <button
        v-for="page in pageNumbers"
        :key="page"
        @click="page === '...' ? null : goToPage(page as number)"
        :disabled="page === '...'"
        class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
        :class="page === currentPage ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-bg-secondary disabled:cursor-default'"
      >
        {{ page }}
      </button>
      <button
        @click="nextPage"
        :disabled="!hasNextPage"
        class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
        :class="hasNextPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
      >
        Siguiente
      </button>
    </div>
    <div class="flex sm:hidden items-center gap-1">
      <button
        @click="previousPage"
        :disabled="!hasPreviousPage"
        class="rounded-md p-1.5 transition-theme"
        :class="hasPreviousPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
      >
        <ArrowLeftIcon class="h-4 w-4" />
      </button>
      <span class="text-xs font-medium text-text px-1">{{ currentPage }} / {{ totalPages }}</span>
      <button
        @click="nextPage"
        :disabled="!hasNextPage"
        class="rounded-md p-1.5 transition-theme"
        :class="hasNextPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
      >
        <ArrowRightIcon class="h-4 w-4" />
      </button>
    </div>
  </div>

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
      Este servicio será eliminado permanentemente del catálogo.
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
import ServiceCard from '../components/servicios/ServiceCard.vue'
import { deleteServicio, listServicios, saveServicio, serviciosKeys } from '../services/serviciosService'
import { addBusinessCategory } from '../services/equipoService'
import { addBranchCategory } from '../services/equipoService'
import type { Servicio, ServicioFormData } from '../types/servicio'
import { StarIcon, PenIcon, AddCircleIcon, MagnifierIcon, ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const { formatVESInline, formatUSD } = useCurrency()
const { success, error: showError, warning } = useNotification()

const servicioModalRef = ref<InstanceType<typeof ServicioFormModal> | null>(null)
const isDeleteModalOpen = ref(false)
const servicioToDelete = ref<Servicio | null>(null)
const showCatMenu = ref(false)
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
