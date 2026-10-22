<template>
  <div v-if="movements.length === 0" class="px-4 py-14 text-center">
    <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
      <BoxIcon class="h-7 w-7 text-text-muted" />
    </div>
    <h3 class="mt-3 text-base font-medium text-text">Sin movimientos</h3>
    <p class="mt-1 text-sm text-text-muted">No hay movimientos registrados.</p>
  </div>

  <div v-else>
    <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
      <span :class="headClass">Fecha</span>
      <span :class="headClass">Producto</span>
      <span :class="headClass">Tipo</span>
      <span :class="[headClass, 'text-right']">Cantidad</span>
      <span :class="[headClass, 'text-right']">Costo</span>
      <span :class="headClass">Notas</span>
    </div>

    <ul class="divide-y divide-border-subtle">
      <li v-for="mov in movements" :key="mov.id" data-testid="movement-row" :class="[gridClass, 'px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
        <!-- Móvil: fecha y tipo arriba, producto debajo -->
        <p class="text-xs text-text-muted lg:whitespace-nowrap">{{ formatDateTime(mov.createdAt) }}</p>

        <p class="mt-0.5 min-w-0 truncate lg:mt-0">
          <span class="font-medium text-text">{{ mov.productName }}</span>
          <span v-if="mov.variantName" class="ml-1 text-xs text-text-muted">({{ mov.variantName }})</span>
        </p>

        <span class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium lg:mt-0" :class="typeStyle(mov.movementType).text">
          <span class="h-1.5 w-1.5 rounded-full" :class="typeStyle(mov.movementType).dot" />
          {{ formatMovementType(mov.movementType) }}
        </span>

        <div class="mt-1 flex items-center justify-between gap-3 lg:contents">
          <span class="font-medium tabular-nums lg:text-right" :class="mov.quantity < 0 ? 'text-danger' : 'text-success'">{{ mov.quantity > 0 ? '+' : '' }}{{ mov.quantity }}</span>
          <span class="tabular-nums text-text lg:text-right"><span class="text-text-muted lg:hidden">Costo: </span>${{ mov.unitCost.toFixed(2) }}</span>
          <span class="min-w-0 max-w-28 truncate text-right text-xs text-text-muted lg:max-w-none lg:text-left lg:text-sm">{{ mov.notes || '—' }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { BoxIcon } from '@solar-icons/vue/linear'
import { formatDateTime, formatMovementType } from '../../lib/formatters'

defineProps<{ movements: any[] }>()

// Fecha · Producto · Tipo · Cantidad · Costo · Notas (la última toma el sobrante).
const gridClass = 'lg:grid lg:grid-cols-[8.5rem_minmax(0,1.8fr)_5.5rem_4rem_4.5rem_minmax(0,0.9fr)] lg:items-center lg:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

// Mismos colores de siempre por tipo de movimiento.
const typeStyle = (type: string) =>
  type === 'purchase' ? { text: 'text-success', dot: 'bg-success' }
    : type === 'sale' ? { text: 'text-primary', dot: 'bg-primary' }
      : type === 'adjustment' ? { text: 'text-warning', dot: 'bg-warning' }
        : { text: 'text-info', dot: 'bg-info' }
</script>
