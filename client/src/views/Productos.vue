<template>
  <FeatureGate feature="productos">
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span class="font-medium uppercase tracking-wider">Inventario</span>
        </div>
        <h1 class="text-2xl font-bold text-text lg:text-3xl">Productos</h1>
      </div>
      <button
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
    <div class="relative flex-1 max-w-md">
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

  <div class="lg:hidden space-y-3 mb-4">
    <div
      v-for="producto in filteredProductos"
      :key="producto.id"
      class="group rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-105">
            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="font-medium text-text truncate">{{ producto.name }}</div>
            <div class="text-xs text-slate-500 font-mono truncate">{{ producto.sku || '—' }}</div>
          </div>
        </div>
        <span
          :class="[
            'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            producto.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-muted'
          ]"
        >
          <span :class="[
            'h-1.5 w-1.5 rounded-full',
            producto.status === 'Activo' ? 'bg-success' : 'bg-text-muted'
          ]" />
          {{ producto.status }}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Categoría</div>
          <div class="text-text text-xs">{{ producto.categoryName || '—' }}</div>
        </div>
        <div class="text-right">
          <div class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Stock</div>
          <div class="flex items-center justify-end gap-1.5">
            <span
              :class="[
                'font-medium tabular-nums',
                producto.stockTotal <= producto.reorderPoint ? 'text-danger' : 'text-text'
              ]"
            >{{ producto.stockTotal }}</span>
            <span class="text-xs text-slate-400"> {{ producto.unit }}</span>
            <button
              type="button"
              class="rounded p-0.5 text-text-muted transition-all hover:bg-bg-secondary hover:text-primary"
              title="Ajustar stock en inventario"
              @click.stop="goToInventory"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <div class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Costo</div>
          <div class="text-text tabular-nums">${{ producto.unitCost.toFixed(2) }}</div>
          <div class="text-xs text-slate-400 tabular-nums">{{ formatVESInline(producto.unitCost) }} Bs</div>
        </div>
        <div class="text-right">
          <div class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Precio</div>
          <div class="text-text font-medium tabular-nums">${{ producto.unitPrice.toFixed(2) }}</div>
          <div class="text-xs text-slate-400 tabular-nums">{{ formatVESInline(producto.unitPrice) }} Bs</div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle">
        <button
          @click.stop="productoModalRef?.open(producto)"
          class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-primary"
          title="Editar producto"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          @click.stop="openDeleteModal(producto)"
          class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-warning"
          title="Desactivar producto"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </button>
        <button
          @click.stop="openPermanentDeleteModal(producto)"
          class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-danger"
          title="Eliminar permanentemente"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <div class="hidden lg:block rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-bg-secondary/50">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Producto</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">SKU</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Categoría</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Costo</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Precio</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Stock</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Estado</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <tr v-for="producto in filteredProductos" :key="producto.id" class="text-sm transition-all duration-200 hover:bg-bg-secondary/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-105">
                  <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span class="font-medium text-text">{{ producto.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{{ producto.sku || '—' }}</td>
            <td class="px-4 py-3 text-xs text-slate-500">{{ producto.categoryName || '—' }}</td>
            <td class="px-4 py-3 text-right tabular-nums">
              <span class="text-text">${{ producto.unitCost.toFixed(2) }}</span>
              <span class="block whitespace-nowrap text-xs text-slate-400">{{ formatVESInline(producto.unitCost) }} Bs</span>
            </td>
            <td class="px-4 py-3 text-right font-medium tabular-nums">
              <span class="text-text">${{ producto.unitPrice.toFixed(2) }}</span>
              <span class="block whitespace-nowrap text-xs text-slate-400">{{ formatVESInline(producto.unitPrice) }} Bs</span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">
              <div class="flex items-center justify-end gap-1.5">
                <span :class="[
                  'font-medium',
                  producto.stockTotal <= producto.reorderPoint ? 'text-danger' : 'text-text'
                ]">{{ producto.stockTotal }}</span>
                <span class="text-xs text-slate-400"> {{ producto.unit }}</span>
                <button
                  type="button"
                  class="rounded p-0.5 text-text-muted transition-all hover:bg-bg-secondary hover:text-primary"
                  title="Ajustar stock en inventario"
                  @click.stop="goToInventory"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span :class="[
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                producto.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-muted'
              ]">
                <span :class="[
                  'h-1.5 w-1.5 rounded-full',
                  producto.status === 'Activo' ? 'bg-success' : 'bg-text-muted'
                ]" />
                {{ producto.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button
                  @click="productoModalRef?.open(producto)"
                  class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-primary"
                  title="Editar producto"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="openDeleteModal(producto)"
                  class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-warning"
                  title="Desactivar producto"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
                <button
                  @click="openPermanentDeleteModal(producto)"
                  class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-danger"
                  title="Eliminar permanentemente"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="filteredProductos.length === 0" class="hidden lg:block py-16 text-center">
      <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 class="mt-4 text-lg font-medium text-text">No hay productos</h3>
      <p class="mt-1 text-sm text-text-muted">Agrega tu primer producto al inventario.</p>
    </div>
  </div>

  <ProductoFormModal
    ref="productoModalRef"
    :is-saving="saveProductoMutation.isPending.value"
    @save="handleSaveProducto"
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
import { useRouter } from 'vue-router'
import { useProductCRUD } from '../composables/useProductCRUD'
import ProductStats from '../components/productos/ProductStats.vue'
import ProductoFormModal from '../components/modals/ProductoFormModal.vue'
import { ModalBase, FeatureGate } from '../components/common'

const router = useRouter()

function goToInventory() {
  router.push({ name: 'admin-inventario' })
}

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
  formatVESInline,
} = useProductCRUD()

const tabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activos' },
  { label: 'Inactivos', value: 'inactivos' },
]
</script>
