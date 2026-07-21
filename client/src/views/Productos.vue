<template>
  <FeatureGate feature="inventario">
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span class="font-medium uppercase tracking-wider">Inventario</span>
        </div>
        <h1 class="text-2xl font-bold text-text lg:text-3xl">Inventario</h1>
      </div>
      <button
        v-if="!disableInventoryEdit"
        @click="productoModalRef?.open()"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="hidden sm:inline">Nuevo producto</span>
      </button>
    </div>
  </header>

  <ProductStats
    :total-productos="totalProductos"
    :total-categorias="totalCategorias"
    :stock-bajo="stockBajo"
    :valor-u-s-d="valorUSD"
    :valor-v-e-s="valorVES"
  />

  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div v-if="activeTab !== 'movimientos'" class="relative flex-1 max-w-md">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar producto por nombre o SKU..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
    <div v-else class="relative flex-1 max-w-md">
      <input
        v-model="movementSearch"
        type="text"
        placeholder="Buscar en movimientos..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
    <div class="flex rounded-xl border border-border bg-surface p-1 shadow-sm">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
          activeTab === tab.value
            ? 'bg-primary text-text-inverse shadow-sm'
            : 'text-text-secondary hover:bg-bg-secondary'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>

  <!-- Product tabs -->
  <template v-if="activeTab !== 'movimientos'">
    <ProductGrid
      :products="filteredProductos"
      :readonly="disableInventoryEdit"
      @edit="producto => productoModalRef?.open(producto)"
      @adjust="openAdjustModal"
      @deactivate="openDeleteModal"
      @delete="openPermanentDeleteModal"
    />
  </template>

  <!-- Movimientos tab -->
  <div v-else class="space-y-4">
    <div class="lg:hidden space-y-3 mb-4">
      <div v-for="mov in filteredMovements" :key="mov.id" class="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md">
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-xs text-text-muted">{{ formatDateTime(mov.createdAt) }}</p>
            <p class="font-medium text-text">{{ mov.productName }} <span v-if="mov.variantName" class="text-xs text-text-muted">({{ mov.variantName }})</span></p>
          </div>
          <span :class="[
            'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            mov.movementType === 'purchase' ? 'bg-success/10 text-success' :
            mov.movementType === 'sale' ? 'bg-primary/10 text-primary' :
            mov.movementType === 'adjustment' ? 'bg-warning/10 text-warning' :
            'bg-info/10 text-info'
          ]">
            <span :class="['h-1.5 w-1.5 rounded-full', mov.movementType === 'purchase' ? 'bg-success' : mov.movementType === 'sale' ? 'bg-primary' : mov.movementType === 'adjustment' ? 'bg-warning' : 'bg-info']" />
            {{ formatMovementType(mov.movementType) }}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-4">
            <span class="font-medium tabular-nums" :class="mov.quantity < 0 ? 'text-danger' : 'text-success'">{{ mov.quantity > 0 ? '+' : '' }}{{ mov.quantity }}</span>
            <span class="text-text-muted">Costo: <span class="text-text tabular-nums">${{ mov.unitCost.toFixed(2) }}</span></span>
          </div>
          <span class="text-xs text-text-muted truncate max-w-28 text-right">{{ mov.notes || '—' }}</span>
        </div>
      </div>
      <div v-if="filteredMovements.length === 0" class="py-16 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text">Sin movimientos</h3>
        <p class="mt-1 text-sm text-text-muted">No hay movimientos registrados.</p>
      </div>
    </div>

    <div class="hidden lg:block rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-bg-secondary/50">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Producto</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Tipo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Cantidad</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Costo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Notas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="mov in filteredMovements" :key="mov.id" class="text-sm transition-all duration-200 hover:bg-bg-secondary/50">
              <td class="px-4 py-3 text-text-muted whitespace-nowrap">{{ formatDateTime(mov.createdAt) }}</td>
              <td class="px-4 py-3">
                <span class="font-medium text-text">{{ mov.productName }}</span>
                <span v-if="mov.variantName" class="text-xs text-text-muted ml-1">({{ mov.variantName }})</span>
              </td>
              <td class="px-4 py-3">
                <span :class="[
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  mov.movementType === 'purchase' ? 'bg-success/10 text-success' :
                  mov.movementType === 'sale' ? 'bg-primary/10 text-primary' :
                  mov.movementType === 'adjustment' ? 'bg-warning/10 text-warning' :
                  'bg-info/10 text-info'
                ]">
                  <span :class="['h-1.5 w-1.5 rounded-full', mov.movementType === 'purchase' ? 'bg-success' : mov.movementType === 'sale' ? 'bg-primary' : mov.movementType === 'adjustment' ? 'bg-warning' : 'bg-info']" />
                  {{ formatMovementType(mov.movementType) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-medium tabular-nums" :class="mov.quantity < 0 ? 'text-danger' : 'text-success'">{{ mov.quantity > 0 ? '+' : '' }}{{ mov.quantity }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-text">${{ mov.unitCost.toFixed(2) }}</td>
              <td class="px-4 py-3 text-text-muted max-w-40 truncate">{{ mov.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredMovements.length === 0" class="py-16 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text">Sin movimientos</h3>
        <p class="mt-1 text-sm text-text-muted">No hay movimientos registrados.</p>
      </div>
    </div>
  </div>

  <ProductoFormModal
    ref="productoModalRef"
    :is-saving="saveProductoMutation.isPending.value"
    @save="handleSaveProducto"
  />

  <ProductStockAdjustModal
    :is-open="adjustModalOpen"
    :producto="adjustProduct"
    :is-loading="adjustMutation.isPending.value"
    v-model:quantity="adjustQuantity"
    v-model:notes="adjustNotes"
    @close="closeAdjustModal"
    @confirm="confirmAdjust"
  />

  <ModalBase
    :is-open="isDeleteModalOpen"
    title="Desactivar producto"
    subtitle="Esta acción no se puede deshacer"
    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    variant="danger"
    size="sm"
    confirm-text="Desactivar"
    :is-loading="deleteMutation?.isPending.value"
    @close="closeDeleteModal"
    @confirm="confirmDelete"
    @cancel="closeDeleteModal"
  >
    <p class="text-sm text-text-secondary">
      ¿Estás seguro de que deseas desactivar <strong>{{ productoToDelete?.name }}</strong>?
      El producto dejará de estar disponible en el inventario.
    </p>
  </ModalBase>

  <ModalBase
    :is-open="isPermanentDeleteModalOpen"
    title="Eliminar producto"
    subtitle="Esta acción es irreversible"
    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    variant="danger"
    size="sm"
    confirm-text="Eliminar"
    :is-loading="isPermanentDeleting"
    @close="closePermanentDeleteModal"
    @confirm="confirmPermanentDelete"
    @cancel="closePermanentDeleteModal"
  >
    <div class="space-y-3 text-sm">
      <p class="text-text-secondary">
        ¿Estás seguro de que deseas eliminar permanentemente <strong>{{ productoToDeletePermanently?.name }}</strong>?
      </p>
      <div class="rounded-lg border border-danger/30 bg-danger/5 p-3 text-danger">
        <p class="font-medium">⚠️ Esta acción eliminará el producto junto con:</p>
        <ul class="mt-1 list-inside list-disc space-y-0.5 text-xs">
          <li>Stock y movimientos de inventario</li>
          <li>Referencias en citas y ventas pasadas</li>
        </ul>
      </div>
    </div>
  </ModalBase>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { formatDateTime, formatMovementType } from '../lib/formatters'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { useProductCRUD } from '../composables/inventario/useProductCRUD'
import { useProductStockAdjust } from '../composables/inventario/useProductStockAdjust'
import { inventarioKeys, listInventoryMovements } from '../services/inventarioService'
import ProductStats from '../components/productos/ProductStats.vue'
import ProductoFormModal from '../components/modals/ProductoFormModal.vue'
import ProductStockAdjustModal from '../components/productos/ProductStockAdjustModal.vue'
import ProductGrid from '../components/productos/ProductGrid.vue'
import { ModalBase, FeatureGate } from '../components/common'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const branchId = computed(() => businessStore.currentBranchId)
const businessId = computed(() => authStore.businessId)
const disableInventoryEdit = computed(() => authStore.profile?.disable_inventory_edit ?? false)

const {
  productoModalRef,
  saveProductoMutation,
  deleteMutation,
  handleSaveProducto,
  totalProductos,
  totalCategorias,
  stockBajo,
  valorUSD,
  valorVES,
  searchQuery,
  activeTab,
  filteredProductos,
  isDeleteModalOpen,
  productoToDelete,
  openDeleteModal,
  closeDeleteModal,
  confirmDelete,
  isPermanentDeleteModalOpen,
  productoToDeletePermanently,
  isPermanentDeleting,
  openPermanentDeleteModal,
  closePermanentDeleteModal,
  confirmPermanentDelete,
} = useProductCRUD()

const {
  adjustModalOpen,
  adjustProduct,
  adjustQuantity,
  adjustNotes,
  adjustMutation,
  openAdjustModal,
  closeAdjustModal,
  confirmAdjust,
} = useProductStockAdjust()

const movementSearch = ref('')

const { data: movementsData } = useQuery({
  queryKey: computed(() => inventarioKeys.movements(businessId.value, branchId.value)),
  queryFn: () => listInventoryMovements(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const movements = computed(() => movementsData.value ?? [])

const filteredMovements = computed(() => {
  if (!movementSearch.value) return movements.value
  const q = movementSearch.value.toLowerCase()
  return movements.value.filter((m: any) =>
    m.productName.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q),
  )
})

const tabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activos' },
  { label: 'Inactivos', value: 'inactivos' },
  { label: 'Movimientos', value: 'movimientos' },
]
</script>
