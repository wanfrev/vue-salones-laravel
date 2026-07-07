<template>
  <FeatureGate feature="inventario">
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="font-medium uppercase tracking-wider">Stock</span>
        </div>
        <h1 class="text-2xl font-bold text-text lg:text-3xl">Inventario</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handleNewProducto"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="hidden sm:inline">Nuevo producto</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Sub-tabs: Stock / Movimientos -->
  <div class="mb-4 flex gap-2">
    <button
      @click="activeTab = 'stock'"
      :class="[
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-theme',
        activeTab === 'stock'
          ? 'bg-primary text-text-inverse shadow-sm shadow-primary/20'
          : 'border border-border bg-surface text-text-secondary hover:bg-bg-secondary hover:text-text'
      ]"
    >
      Stock
    </button>
    <button
      @click="activeTab = 'movements'"
      :class="[
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-theme',
        activeTab === 'movements'
          ? 'bg-primary text-text-inverse shadow-sm shadow-primary/20'
          : 'border border-border bg-surface text-text-secondary hover:bg-bg-secondary hover:text-text'
      ]"
    >
      Movimientos
    </button>
  </div>

  <!-- Tab: Stock -->
  <div v-if="activeTab === 'stock'" class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar en inventario..."
          class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="lg:hidden space-y-3 mb-4">
      <div v-for="item in filteredInventario" :key="item.id" class="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:shadow-md">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="font-medium text-text">{{ item.productName }}</p>
            <p class="text-xs text-text-muted font-mono">{{ item.productSku || '—' }}</p>
          </div>
          <span class="text-sm text-text-secondary">{{ item.variantName || '—' }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3 text-sm">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Stock</p>
            <p class="font-medium tabular-nums" :class="item.quantity <= item.reorderPoint ? 'text-danger' : 'text-text'">{{ item.quantity }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Reservado</p>
            <p class="tabular-nums text-text-muted">{{ item.reservedQty }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Disponible</p>
            <p class="font-medium tabular-nums" :class="item.availableQty > 0 ? 'text-success' : 'text-danger'">{{ item.availableQty }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-sm text-text tabular-nums">${{ (item.quantity * item.unitCost).toFixed(2) }}</p>
          <button @click.stop="openAdjustModal(item)" class="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-border-subtle hover:shadow-sm">Ajustar</button>
        </div>
      </div>
      <div v-if="filteredInventario.length === 0" class="py-16 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text">Sin existencias</h3>
        <p class="mt-1 text-sm text-text-muted">No hay productos registrados en el inventario.</p>
      </div>
    </div>

    <div class="hidden lg:block rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-bg-secondary/50">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Producto</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Variante</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Stock</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Reservado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Disponible</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Valor</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="item in filteredInventario" :key="item.id" class="text-sm transition-all duration-200 hover:bg-bg-secondary/50">
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium text-text">{{ item.productName }}</p>
                  <p class="text-xs text-text-muted font-mono">{{ item.productSku || '—' }}</p>
                </div>
              </td>
              <td class="px-4 py-3 text-text-secondary">{{ item.variantName || '—' }}</td>
              <td class="px-4 py-3 text-right">
                <span :class="['font-medium tabular-nums', item.quantity <= item.reorderPoint ? 'text-danger' : 'text-text']">
                  {{ item.quantity }}
                </span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-text-muted">{{ item.reservedQty }}</td>
              <td class="px-4 py-3 text-right font-medium tabular-nums" :class="item.availableQty > 0 ? 'text-success' : 'text-danger'">
                {{ item.availableQty }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-text">${{ (item.quantity * item.unitCost).toFixed(2) }}</td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    @click="openAdjustModal(item)"
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-bg-secondary hover:shadow-sm"
                  >
                    Ajustar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredInventario.length === 0" class="py-16 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text">Sin existencias</h3>
        <p class="mt-1 text-sm text-text-muted">No hay productos registrados en el inventario.</p>
      </div>
    </div>
  </div>

  <!-- Tab: Movimientos -->
  <div v-if="activeTab === 'movements'" class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
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
    </div>

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
            <span :class="[
              'h-1.5 w-1.5 rounded-full',
              mov.movementType === 'purchase' ? 'bg-success' :
              mov.movementType === 'sale' ? 'bg-primary' :
              mov.movementType === 'adjustment' ? 'bg-warning' :
              'bg-info'
            ]" />
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
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
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
                  <span :class="[
                    'h-1.5 w-1.5 rounded-full',
                    mov.movementType === 'purchase' ? 'bg-success' :
                    mov.movementType === 'sale' ? 'bg-primary' :
                    mov.movementType === 'adjustment' ? 'bg-warning' :
                    'bg-info'
                  ]" />
                  {{ formatMovementType(mov.movementType) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-medium tabular-nums" :class="mov.quantity < 0 ? 'text-danger' : 'text-success'">
                {{ mov.quantity > 0 ? '+' : '' }}{{ mov.quantity }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-text">${{ mov.unitCost.toFixed(2) }}</td>
              <td class="px-4 py-3 text-text-muted max-w-40 truncate">{{ mov.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredMovements.length === 0" class="py-16 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium text-text">Sin movimientos</h3>
        <p class="mt-1 text-sm text-text-muted">No hay movimientos registrados.</p>
      </div>
    </div>
  </div>


  <StockAdjustModal
    :is-open="adjustModalOpen"
    :item="adjustItem"
    :is-loading="adjustMutation.isPending.value"
    v-model:quantity="adjustQuantity"
    v-model:notes="adjustNotes"
    @close="closeAdjustModal"
    @confirm="confirmAdjust"
  />

  <ProductoFormModal
    ref="productoModalRef"
    :is-saving="saveProductoMutation.isPending.value"
    @save="handleSaveProducto"
  />
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { formatDateTime, formatMovementType } from '../lib/formatters'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { FeatureGate } from '../components/common'
import { useInventoryAdjustment } from '../composables/inventario/useInventoryAdjustment'
import { inventarioKeys, listInventario, listInventoryMovements } from '../services/inventarioService'
import { productosKeys, saveProducto } from '../services/productosService'
import { posKeys } from '../services/posService'
import StockAdjustModal from '../components/inventario/StockAdjustModal.vue'
import ProductoFormModal from '../components/modals/ProductoFormModal.vue'

import type { ProductoFormData } from '../types/producto'

const { authStore } = useAuth()
const { success, error: showError } = useNotification()
const queryClient = useQueryClient()

const {
  adjustModalOpen,
  adjustItem,
  adjustQuantity,
  adjustNotes,
  adjustMutation,
  openAdjustModal,
  closeAdjustModal,
  confirmAdjust,
} = useInventoryAdjustment()

const activeTab = ref<'stock' | 'movements'>('stock')
const searchQuery = ref('')
const movementSearch = ref('')
const businessId = computed(() => authStore.businessId)
const businessStore = useBusinessStore()
const branchId = computed(() => businessStore.currentBranchId)
const productoModalRef = ref<InstanceType<typeof ProductoFormModal> | null>(null)

// --- Stock ---
const { data: inventarioData } = useQuery({
  queryKey: computed(() => inventarioKeys.all(businessId.value, branchId.value)),
  queryFn: () => listInventario(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const inventario = computed(() => inventarioData.value ?? [])

const filteredInventario = computed(() => {
  if (!searchQuery.value) return inventario.value
  const q = searchQuery.value.toLowerCase()
  return inventario.value.filter(i => i.productName.toLowerCase().includes(q) || i.productSku.toLowerCase().includes(q))
})

// --- Movimientos ---
const { data: movementsData } = useQuery({
  queryKey: computed(() => inventarioKeys.movements(businessId.value, branchId.value)),
  queryFn: () => listInventoryMovements(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const movements = computed(() => movementsData.value ?? [])

const filteredMovements = computed(() => {
  if (!movementSearch.value) return movements.value
  const q = movementSearch.value.toLowerCase()
  return movements.value.filter(m =>
    m.productName.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q)
  )
})

// --- Producto form modal ---
const saveProductoMutation = useMutation({
  mutationFn: (data: ProductoFormData & { id?: string }) => saveProducto(businessId.value!, data, branchId.value),
  onSuccess: () => {
    Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: productosKeys.all(businessId.value) }),
      queryClient.invalidateQueries({ queryKey: inventarioKeys.all(businessId.value) }),
      queryClient.invalidateQueries({ queryKey: posKeys.products(businessId.value) }),
    ])
    productoModalRef.value?.close()
    success('Producto guardado correctamente')
  },
  onError: (err) => {
    showError(err instanceof Error ? err.message : 'Error al guardar el producto')
  },
})

const handleNewProducto = () => {
  productoModalRef.value?.open(undefined, { defaultSellable: false })
}

const handleSaveProducto = async (data: ProductoFormData & { id?: string }) => {
  try {
    await saveProductoMutation.mutateAsync(data)
  } catch { /* handled by mutation onError */ }
}

</script>
