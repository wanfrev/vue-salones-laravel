<template>
  <div v-if="products.length === 0" class="px-4 py-14 text-center">
    <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
      <BoxIcon class="h-7 w-7 text-text-muted" />
    </div>
    <h3 class="mt-3 text-base font-medium text-text">No hay productos</h3>
    <p class="mt-1 text-sm text-text-muted">Agrega tu primer producto al inventario.</p>
  </div>

  <div v-else :style="{ '--actions-w': `${actionCount * 1.75}rem` }">
    <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
      <span :class="headClass">Producto</span>
      <span :class="[headClass, 'text-right']">Costo</span>
      <span :class="[headClass, 'text-right']">Precio</span>
      <span :class="[headClass, 'text-right']">Stock</span>
      <span />
    </div>

    <ul class="divide-y divide-border-subtle">
      <li
        v-for="producto in products"
        :key="producto.id"
        data-testid="product-row"
        :class="[gridClass, 'relative px-4 py-3 transition-colors hover:bg-bg-secondary/40', producto.status === 'Inactivo' ? 'opacity-60' : '']"
      >
        <!-- Producto (en móvil deja sitio a la derecha para las acciones) -->
        <div class="min-w-0 pr-[calc(var(--actions-w)+0.25rem)] lg:pr-0">
          <div class="flex items-center gap-2">
            <p class="truncate text-sm font-semibold text-text">{{ producto.name }}</p>
            <span v-if="producto.status === 'Inactivo'" class="shrink-0 text-[11px] font-semibold text-text-muted">· Inactivo</span>
          </div>
          <p class="truncate text-xs text-text-muted">
            <template v-if="producto.sku || producto.categoryName">
              <span v-if="producto.sku" class="font-mono">{{ producto.sku }}</span>
              <span v-if="producto.sku && producto.categoryName"> · </span>
              <span v-if="producto.categoryName">{{ producto.categoryName }}</span>
            </template>
            <template v-else>—</template>
          </p>
        </div>

        <div class="mt-2 grid grid-cols-3 gap-3 lg:contents">
          <div class="lg:text-right">
            <p :class="labelClass">Costo</p>
            <p class="text-sm tabular-nums text-text">${{ producto.unitCost.toFixed(2) }}</p>
            <p class="whitespace-nowrap text-xs tabular-nums text-text-muted">{{ formatVESInline(producto.unitCost) }} Bs</p>
          </div>

          <div class="lg:text-right">
            <p :class="labelClass">Precio</p>
            <p class="whitespace-nowrap text-sm font-medium tabular-nums text-text">
              ${{ producto.unitPrice.toFixed(2) }}<template v-if="producto.unitPrice2"> | ${{ producto.unitPrice2.toFixed(2) }}</template>
            </p>
            <p class="whitespace-nowrap text-xs tabular-nums text-text-muted">{{ formatVESInline(producto.unitPrice) }} Bs</p>
          </div>

          <div class="lg:text-right">
            <p :class="labelClass">Stock</p>
            <div class="flex items-center gap-1 lg:justify-end">
              <span :class="['text-sm font-semibold tabular-nums', producto.stockTotal <= producto.reorderPoint ? 'text-danger' : 'text-text']">{{ producto.stockTotal }}</span>
              <span class="truncate text-xs text-text-muted">{{ producto.unit }}</span>
              <button v-if="!readonly" type="button" class="rounded p-0.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary" title="Ajustar stock" aria-label="Ajustar stock" @click.stop="$emit('adjust', producto)">
                <AddCircleIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Acciones: las mismas de siempre -->
        <div v-if="!readonly" class="absolute right-2 top-2 flex items-center lg:static lg:justify-end">
          <button v-if="showTransfer" type="button" :class="iconButton" title="Transferir stock a otra sucursal" aria-label="Transferir stock" @click.stop="$emit('transfer', producto)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </button>
          <button type="button" :class="iconButton" title="Variantes (talla, color...)" aria-label="Variantes" @click.stop="$emit('variants', producto)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </button>
          <button type="button" :class="iconButton" title="Editar producto" aria-label="Editar producto" @click.stop="$emit('edit', producto)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button type="button" :class="[iconButton, 'hover:!text-warning']" title="Desactivar producto" aria-label="Desactivar producto" @click.stop="$emit('deactivate', producto)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </button>
          <button type="button" :class="[iconButton, 'hover:!text-danger']" title="Eliminar permanentemente" aria-label="Eliminar permanentemente" @click.stop="$emit('delete', producto)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AddCircleIcon, BoxIcon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{ products: any[]; readonly?: boolean; showTransfer?: boolean }>()
defineEmits<{ edit: [p: any]; adjust: [p: any]; deactivate: [p: any]; delete: [p: any]; variants: [p: any]; transfer: [p: any] }>()

const { formatVESInline } = useCurrency()

// Cada botón mide 1.75rem; la última columna es de ancho fijo para que las filas queden alineadas.
const actionCount = computed(() => (props.readonly ? 0 : 4 + (props.showTransfer ? 1 : 0)))

const gridClass = 'lg:grid lg:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_5.5rem_var(--actions-w)] lg:items-center lg:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const labelClass = 'mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted lg:hidden'
const iconButton = 'rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary'
</script>
