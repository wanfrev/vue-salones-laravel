<template>
  <div class="space-y-3 border-b border-border-subtle px-3 py-3 sm:px-4">
    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          :value="search"
          type="search"
          :placeholder="placeholder"
          :aria-label="hint"
          :title="hint"
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-9 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="search"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text"
          aria-label="Borrar búsqueda"
          @click="emit('update:search', '')"
        >
          <CloseCircleIcon class="h-4 w-4" />
        </button>
      </div>

      <select
        :value="sort"
        aria-label="Ordenar por"
        :class="selectClass"
        class="w-36 shrink-0 sm:w-44"
        @change="emit('update:sort', ($event.target as HTMLSelectElement).value as ClientSort)"
      >
        <option v-for="o in SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div class="scroll-thin -mx-1 flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-1 pb-0.5" role="tablist" aria-label="Segmento de clientes">
        <button
          v-for="chip in chips"
          :key="chip.value"
          type="button"
          role="tab"
          :aria-selected="segment === chip.value"
          :title="chip.hint"
          class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="segment === chip.value
            ? 'bg-primary text-text-inverse shadow-sm'
            : 'bg-bg-secondary text-text-secondary hover:bg-primary/10 hover:text-primary'"
          @click="emit('update:segment', chip.value)"
        >
          {{ chip.label }}
          <span
            class="rounded-full px-1.5 text-[10px] font-bold tabular-nums"
            :class="segment === chip.value ? 'bg-white/25 text-text-inverse' : 'bg-surface text-text-muted'"
          >{{ counts[chip.value] }}</span>
        </button>
      </div>

      <label v-if="segment === 'active' || segment === 'inactive'" class="inline-flex items-center gap-1.5 text-xs text-text-muted">
        {{ segment === 'active' ? 'En los últimos' : 'Hace más de' }}
        <select
          :value="windowDays"
          aria-label="Ventana de días"
          :class="selectClass"
          @change="emit('update:windowDays', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="d in WINDOW_OPTIONS" :key="d" :value="d">{{ windowLabel(d) }}</option>
        </select>
      </label>

      <div class="ml-auto flex items-center gap-3 text-xs text-text-muted" aria-live="polite">
        <span>
          <span class="font-semibold text-text">{{ resultCount }}</span><template v-if="filtered"> de {{ totalCount }}</template>
          {{ resultCount === 1 ? singular : plural }}
        </span>
        <button
          v-if="filtered"
          type="button"
          class="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          @click="emit('clear')"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MagnifierIcon, CloseCircleIcon } from '@solar-icons/vue/linear'
import { useBusinessStore } from '../../store/business'
import { NEW_CLIENT_DAYS, SORT_OPTIONS, WINDOW_OPTIONS, type ClientSegment, type ClientSort } from './clientFilters'

const props = defineProps<{
  search: string
  segment: ClientSegment
  windowDays: number
  sort: ClientSort
  counts: Record<ClientSegment, number>
  resultCount: number
  totalCount: number
  filtered: boolean
  placeholder: string
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:segment': [value: ClientSegment]
  'update:windowDays': [value: number]
  'update:sort': [value: ClientSort]
  clear: []
}>()

const businessStore = useBusinessStore()
const selectClass = 'rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15'

// El placeholder es corto (cabe en móvil); aquí se explica por qué campos busca.
const hint = 'Buscar por nombre, teléfono, documento, código o correo'

const visitsPlural = computed(() => (businessStore.terminology.appointmentPlural || 'citas').toLowerCase())
const singular = computed(() => (businessStore.terminology.client || 'cliente').toLowerCase())
const plural = computed(() => (businessStore.terminology.clientPlural || 'clientes').toLowerCase())

const chips = computed<{ value: ClientSegment; label: string; hint: string }[]>(() => [
  { value: 'all', label: 'Todos', hint: `Todos los ${plural.value}` },
  { value: 'active', label: 'Activos', hint: `Vinieron en los últimos ${props.windowDays} días` },
  { value: 'inactive', label: 'Inactivos', hint: `Su última visita fue hace más de ${props.windowDays} días` },
  { value: 'never', label: `Sin ${visitsPlural.value}`, hint: 'Todavía no tienen ninguna visita atendida' },
  { value: 'new', label: 'Nuevos', hint: `Registrados en los últimos ${NEW_CLIENT_DAYS} días` },
])

const windowLabel = (days: number) => (days === 180 ? '6 meses' : `${days} días`)
</script>
