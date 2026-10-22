<template>
  <div class="space-y-3 border-b border-border-subtle px-3 py-3 sm:px-4">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_13rem_13rem]">
      <div class="relative">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          :value="searchQuery"
          type="text"
          placeholder="Buscar..."
          :title="searchHint"
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2 pl-9 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
          @input="emit('search', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <FilterSelect v-model="employeeFilter" :options="employeeOptions" :aria-label="employeeLabel" default-value="all" />
      <FilterSelect v-model="serviceFilter" :options="serviceOptions" :aria-label="serviceLabel" default-value="all" />
    </div>

    <div v-if="showDateControls || hasActiveFilters" class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <template v-if="showDateControls">
        <p v-if="isSearching" class="text-xs italic text-text-muted">Buscando en todas las fechas</p>
        <template v-else>
          <div v-if="dateFilterMode === 'day' || dateFilterMode === 'week'" class="flex items-center gap-1.5">
            <button type="button" :class="arrowClass" :title="stepTitle(-1)" :aria-label="stepTitle(-1)" @click="step(-1)">
              <ArrowLeftIcon class="h-4 w-4" />
            </button>
            <input
              v-if="dateFilterMode === 'day'"
              type="date"
              :value="filterDate ?? ''"
              :class="dateClass"
              @change="emit('setFilterDate', ($event.target as HTMLInputElement).value || null)"
            />
            <span v-else class="whitespace-nowrap rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm text-text">{{ todayLabel }}</span>
            <button type="button" :class="arrowClass" :title="stepTitle(1)" :aria-label="stepTitle(1)" @click="step(1)">
              <ArrowRightIcon class="h-4 w-4" />
            </button>
          </div>
          <input
            v-else-if="dateFilterMode === 'all'"
            type="date"
            :value="filterDate ?? ''"
            :class="dateClass"
            @change="emit('setFilterDate', ($event.target as HTMLInputElement).value || null)"
          />
          <div v-else-if="dateFilterMode === 'range'" class="flex items-center gap-1.5">
            <input
              type="date"
              :value="rangeStart ?? ''"
              :max="rangeEnd ?? undefined"
              :class="dateClass"
              @change="emit('setCustomRange', ($event.target as HTMLInputElement).value, rangeEnd)"
            />
            <span class="shrink-0 text-xs text-text-muted">–</span>
            <input
              type="date"
              :value="rangeEnd ?? ''"
              :min="rangeStart ?? undefined"
              :class="dateClass"
              @change="emit('setCustomRange', rangeStart, ($event.target as HTMLInputElement).value)"
            />
          </div>

          <div class="inline-flex divide-x divide-border overflow-hidden rounded-xl border border-border text-xs font-medium">
            <button v-for="m in modes" :key="m.key" type="button" :class="modeClass(m.active)" @click="emit(m.key)">{{ m.label }}</button>
          </div>
        </template>
      </template>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10"
        @click="emit('reset')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MagnifierIcon, ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import FilterSelect from '../common/FilterSelect.vue'
import type { DateFilterMode } from '../../composables/agenda/useAdminAgenda'

const props = defineProps<{
  searchQuery: string
  searchHint: string
  employeeOptions: { value: string; label: string }[]
  serviceOptions: { value: string; label: string }[]
  employeeLabel: string
  serviceLabel: string
  /** Solo en «Activas»: en «Historial» los controles de fecha no se muestran (como siempre). */
  showDateControls: boolean
  isSearching: boolean
  dateFilterMode: DateFilterMode
  filterDate: string | null
  rangeStart: string | null
  rangeEnd: string | null
  todayLabel: string
  isToday: boolean
  isThisWeek: boolean
  hasActiveFilters: boolean
}>()

const employeeFilter = defineModel<string>('employee', { required: true })
const serviceFilter = defineModel<string>('service', { required: true })

const emit = defineEmits<{
  search: [value: string]
  stepDay: [delta: number]
  stepWeek: [delta: number]
  setFilterDate: [value: string | null]
  setCustomRange: [start: string | null, end: string | null]
  today: []
  week: []
  range: []
  all: []
  reset: []
}>()

const step = (delta: number) => (props.dateFilterMode === 'week' ? emit('stepWeek', delta) : emit('stepDay', delta))
const stepTitle = (delta: number) =>
  props.dateFilterMode === 'week' ? (delta < 0 ? 'Semana anterior' : 'Semana siguiente') : (delta < 0 ? 'Día anterior' : 'Día siguiente')

const modes = computed(() => [
  { key: 'today' as const, label: 'Hoy', active: props.isToday },
  { key: 'week' as const, label: 'Semana', active: props.isThisWeek },
  { key: 'range' as const, label: 'Rango', active: props.dateFilterMode === 'range' },
  { key: 'all' as const, label: 'Todas', active: props.dateFilterMode === 'all' },
])

const modeClass = (active: boolean) =>
  `px-3 py-2 transition-colors ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'}`
const arrowClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-theme hover:border-border-strong hover:bg-bg-secondary hover:text-text'
const dateClass = 'rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15'
</script>
