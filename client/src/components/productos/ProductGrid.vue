<template>
  <div class="lg:hidden space-y-3 mb-4">
    <div v-for="producto in products" :key="producto.id"
      class="group rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm transition-all duration-200 hover:shadow-md">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-105">
            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div class="min-w-0">
            <div class="font-medium text-text truncate">{{ producto.name }}</div>
            <div class="text-xs text-slate-500 font-mono truncate">{{ producto.sku || '—' }}</div>
          </div>
        </div>
        <span :class="['shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', producto.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-muted']">
          <span :class="['h-1.5 w-1.5 rounded-full', producto.status === 'Activo' ? 'bg-success' : 'bg-text-muted']" />
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
            <span :class="['font-medium tabular-nums', producto.stockTotal <= producto.reorderPoint ? 'text-danger' : 'text-text']">{{ producto.stockTotal }}</span>
             <span class="text-xs text-slate-400"> {{ producto.unit }}</span>
            <button v-if="!readonly" type="button" class="rounded p-0.5 text-text-muted transition-all hover:bg-bg-secondary hover:text-primary" title="Ajustar stock" @click.stop="$emit('adjust', producto)">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
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

      <div v-if="!readonly" class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle">
        <button @click.stop="$emit('edit', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-primary" title="Editar producto">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
        <button @click.stop="$emit('deactivate', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-warning" title="Desactivar producto">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </button>
        <button @click.stop="$emit('delete', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-danger" title="Eliminar permanentemente">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
          <tr v-for="producto in products" :key="producto.id" class="text-sm transition-all duration-200 hover:bg-bg-secondary/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
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
                <span :class="['font-medium', producto.stockTotal <= producto.reorderPoint ? 'text-danger' : 'text-text']">{{ producto.stockTotal }}</span>
                <span class="text-xs text-slate-400"> {{ producto.unit }}</span>
            <button v-if="!readonly" type="button" class="rounded p-0.5 text-text-muted transition-all hover:bg-bg-secondary hover:text-primary" title="Ajustar stock" @click.stop="$emit('adjust', producto)">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', producto.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-muted']">
                <span :class="['h-1.5 w-1.5 rounded-full', producto.status === 'Activo' ? 'bg-success' : 'bg-text-muted']" />
                {{ producto.status }}
              </span>
            </td>
            <td v-if="!readonly" class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="$emit('edit', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-primary" title="Editar producto">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button @click="$emit('deactivate', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-warning" title="Desactivar producto">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </button>
                <button @click="$emit('delete', producto)" class="rounded-lg p-1.5 text-text-muted transition-all duration-200 hover:bg-bg-secondary hover:text-danger" title="Eliminar permanentemente">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="products.length === 0" class="py-16 text-center">
      <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
      </div>
      <h3 class="mt-4 text-lg font-medium text-text">No hay productos</h3>
      <p class="mt-1 text-sm text-text-muted">Agrega tu primer producto al inventario.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{ products: any[]; readonly?: boolean }>()
defineEmits<{ edit: [p: any]; adjust: [p: any]; deactivate: [p: any]; delete: [p: any] }>()

const { formatVESInline } = useCurrency()
</script>
