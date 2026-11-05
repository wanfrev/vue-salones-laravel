<template>
  <div data-testid="inventory-movements">
    <!-- Período y filtros -->
    <div class="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2.5 sm:px-4">
      <label class="sr-only" for="mv-period">Período</label>
      <select id="mv-period" v-model="preset" data-testid="period-select" :class="selectClass">
        <option v-for="p in PERIOD_OPTIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <template v-if="preset === 'custom'">
        <label class="sr-only" for="mv-from">Desde</label>
        <input id="mv-from" v-model="customStart" type="date" data-testid="custom-start" :class="selectClass" />
        <span class="text-xs text-text-muted">a</span>
        <label class="sr-only" for="mv-to">Hasta</label>
        <input id="mv-to" v-model="customEnd" type="date" data-testid="custom-end" :class="selectClass" />
      </template>

      <label class="sr-only" for="mv-direction">Entradas o salidas</label>
      <select id="mv-direction" v-model="direction" data-testid="direction-select" :class="selectClass">
        <option v-for="o in DIRECTION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>

      <label class="sr-only" for="mv-user">Registrado por</label>
      <select id="mv-user" v-model="userId" data-testid="user-select" :class="selectClass">
        <option :value="null">Registrado por: todos</option>
        <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.movements }})</option>
      </select>

      <template v-if="categories.length || categoryId">
        <label class="sr-only" for="mv-category">Categoría</label>
        <select id="mv-category" v-model="categoryId" data-testid="category-select" :class="selectClass">
          <option :value="null">Todas las categorías</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }} ({{ c.movements }})</option>
        </select>
      </template>

      <label class="sr-only" for="mv-sort">Ordenar por</label>
      <select id="mv-sort" v-model="sort" data-testid="sort-select" :class="selectClass">
        <option v-for="o in SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>

      <button v-if="activeFilters" type="button" data-testid="clear-filters"
        class="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20" @click="clearFilters()">
        Limpiar filtros ({{ activeFilters }})
      </button>
      <span v-if="isFetching && !isLoading" class="text-xs text-text-muted" role="status">Actualizando…</span>
    </div>

    <p v-if="dateError" class="border-b border-border-subtle px-4 py-2 text-xs font-medium text-danger" role="alert" data-testid="date-error">{{ dateError }}</p>

    <!-- Tipos (con cuántos hay de cada uno) y, si se eligió, el producto -->
    <div class="scroll-thin flex items-center gap-1.5 overflow-x-auto border-b border-border-subtle px-3 py-2 sm:px-4" data-testid="type-chips">
      <button type="button" :class="chipClass(!types.length)" data-testid="type-chip-all" @click="types = []">Todos</button>
      <button v-for="t in typeChips" :key="t.value" type="button" data-testid="type-chip" :class="chipClass(types.includes(t.value))" @click="toggleType(t.value)">
        {{ t.label }} <span class="text-text-muted">· {{ t.count }}</span>
      </button>
      <button v-if="productId" type="button" data-testid="product-chip"
        class="shrink-0 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary" @click="productId = null">
        Producto: {{ productName || 'elegido' }} ✕
      </button>
    </div>

    <div v-if="isLoading" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-3 w-24 animate-pulse rounded bg-bg-secondary" /><div class="h-3 w-40 animate-pulse rounded bg-bg-secondary" /><div class="h-3 w-12 animate-pulse rounded bg-bg-secondary" />
      </div>
    </div>

    <div v-else-if="error" class="px-4 py-10 text-center" role="alert">
      <p class="text-sm font-medium text-danger">No se pudieron cargar los movimientos.</p>
      <button type="button" class="mt-2 text-xs font-semibold text-primary hover:text-primary-hover" @click="refetch()">Reintentar</button>
    </div>

    <div v-else-if="!movements.length" class="px-4 py-14 text-center" data-testid="movements-empty">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary"><BoxIcon class="h-7 w-7 text-text-muted" /></div>
      <h3 class="mt-3 text-base font-medium text-text">Sin movimientos</h3>
      <p class="mt-1 text-sm text-text-muted">{{ filters.q ? `No hay movimientos de «${filters.q}» con estos filtros.` : 'No hay movimientos con estos filtros.' }}</p>
      <p class="mt-1 text-xs text-text-muted">Prueba con otro período (hasta 12 meses) o quita algún filtro.</p>
    </div>

    <template v-else>
      <p class="px-4 py-2.5 text-xs text-text-secondary" data-testid="movements-summary">
        <b class="text-text">{{ summary!.movements }}</b> {{ summary!.movements === 1 ? 'movimiento' : 'movimientos' }} ·
        entraron <b class="text-success">{{ unitsText(summary!.units_in) }}</b> · salieron <b class="text-danger">{{ unitsText(summary!.units_out) }}</b> unidades
        · costo de lo que salió <b class="text-text">${{ summary!.cost_out.toFixed(2) }}</b>
        <template v-if="summary!.cost_in"> · de lo que entró <b class="text-text">${{ summary!.cost_in.toFixed(2) }}</b></template>
        <span class="text-text-muted"> · del {{ formatDate(data!.range.start) }} al {{ formatDate(data!.range.end) }}</span>
      </p>

      <div :class="[gridClass, 'hidden border-y border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
        <span :class="headClass">Fecha</span>
        <span :class="headClass">Producto</span>
        <span :class="headClass">Tipo</span>
        <span :class="[headClass, 'text-right']">Cantidad</span>
        <span :class="[headClass, 'text-right']">Costo</span>
        <span :class="headClass">Quién</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="m in movements" :key="m.id">
          <button type="button" data-testid="movement-row" :class="[gridClass, 'w-full px-4 py-3 text-left text-sm transition-colors hover:bg-bg-secondary/40 focus-visible:bg-bg-secondary/40 focus-visible:outline-none']" @click="selected = m">
            <span class="text-xs text-text-muted lg:whitespace-nowrap">{{ formatDateTime(m.date) }}</span>

            <span class="mt-0.5 block min-w-0 lg:mt-0">
              <span class="block truncate font-medium text-text">{{ m.product_name }}<span v-if="m.variant_name" class="ml-1 text-xs font-normal text-text-muted">({{ m.variant_name }})</span></span>
              <span v-if="m.notes" class="block truncate text-xs text-text-muted">{{ m.notes }}</span>
            </span>

            <span class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium lg:mt-0" :class="typeTone(m.type).text">
              <span class="h-1.5 w-1.5 rounded-full" :class="typeTone(m.type).dot" />{{ formatMovementType(m.type) }}
            </span>

            <span class="mt-1 flex items-center justify-between gap-3 lg:contents">
              <span class="font-semibold tabular-nums lg:text-right" :class="m.quantity < 0 ? 'text-danger' : 'text-success'">{{ signedQty(m.quantity) }}</span>
              <span class="tabular-nums text-text lg:text-right"><span class="text-text-muted lg:hidden">Costo: </span>${{ m.total_cost.toFixed(2) }}</span>
            </span>

            <span class="mt-1 block min-w-0 text-xs text-text-secondary lg:mt-0">
              <span v-if="m.person_name" class="block truncate"><span class="text-text-muted">{{ personLabel(m.person_role) }}:</span> {{ m.person_name }}</span>
              <span class="block truncate text-text-muted">Registró: {{ m.user_name ?? '—' }}</span>
            </span>
          </button>
        </li>
      </ul>

      <div v-if="page > 1 || hasMore" class="flex items-center justify-between border-t border-border-subtle px-4 py-2.5 text-xs">
        <button type="button" data-testid="page-prev" :disabled="page <= 1"
          class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary hover:bg-bg-secondary disabled:opacity-40" @click="page = Math.max(1, page - 1)">Anterior</button>
        <span class="text-text-muted">Página {{ page }}</span>
        <button type="button" data-testid="page-next" :disabled="!hasMore"
          class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary hover:bg-bg-secondary disabled:opacity-40" @click="page = page + 1">Siguiente</button>
      </div>
    </template>

    <MovementDetailModal v-if="selected" :movement="selected" @close="selected = null" @filter-product="onFilterProduct" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { BoxIcon } from '@solar-icons/vue/linear'
import { formatDate, formatDateTime, formatMovementType } from '../../lib/formatters'
import { useInventoryMovements, type MovementRow } from '../../composables/inventory/useInventoryMovements'
import MovementDetailModal from './MovementDetailModal.vue'
import {
  DIRECTION_OPTIONS, PERIOD_OPTIONS, SORT_OPTIONS, TYPE_OPTIONS, personLabel, signedQty, typeTone, unitsText,
} from './inventoryMovements'

const props = withDefaults(defineProps<{
  /** Lo que se escribe en el buscador de la pantalla (producto, nota, persona…). */
  search: string
  /** Solo pide datos mientras la pestaña está a la vista. */
  active?: boolean
}>(), { active: true })

const {
  preset, customStart, customEnd, types, direction, userId, categoryId, productId, sort, page,
  filters, dateError, activeFilters, clearFilters, data, isLoading, isFetching, error, refetch,
} = useInventoryMovements(toRef(props, 'search'), toRef(props, 'active'))

const summary = computed(() => data.value?.summary)
const movements = computed(() => data.value?.movements ?? [])
const users = computed(() => data.value?.users ?? [])
const categories = computed(() => data.value?.categories ?? [])
const hasMore = computed(() => !!data.value?.has_more)

// Chips de los tipos que hay en el período (con su cantidad) más los elegidos aunque ahora no tengan ninguno.
const typeChips = computed(() => {
  const counts = new Map((data.value?.types ?? []).map(t => [t.type, t.movements]))
  return TYPE_OPTIONS
    .filter(t => counts.has(t.value) || types.value.includes(t.value))
    .map(t => ({ ...t, count: counts.get(t.value) ?? 0 }))
})
const toggleType = (value: string) => {
  types.value = types.value.includes(value) ? types.value.filter(t => t !== value) : [...types.value, value]
}

const selected = ref<MovementRow | null>(null)
const productName = ref('')
const onFilterProduct = (id: string, name: string) => {
  productId.value = id
  productName.value = name
  selected.value = null
}

const selectClass = 'rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text outline-none focus:border-primary'
const chipClass = (on: boolean) =>
  ['shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-bg-secondary']

// Fecha · Producto · Tipo · Cantidad · Costo · Quién (el producto toma el sobrante).
const gridClass = 'lg:grid lg:grid-cols-[8.5rem_minmax(0,1.6fr)_6.5rem_4.5rem_5rem_minmax(0,1.2fr)] lg:items-center lg:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
</script>
