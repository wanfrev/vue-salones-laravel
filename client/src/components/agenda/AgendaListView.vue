<template>
  <div>
    <!-- Error state -->
    <div v-if="error" class="m-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
      <div class="flex items-start gap-3">
        <svg class="mt-0.5 h-5 w-5 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p class="text-sm font-semibold text-danger">Error al cargar citas</p>
          <p class="mt-0.5 text-xs text-danger/70">{{ typeof error === 'object' && error !== null ? ((error as any).message || String(error)) : String(error) }}</p>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="divide-y divide-border-subtle">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-8 w-8 shrink-0 animate-pulse rounded-full bg-bg-secondary"></div>
        <div class="h-3 w-28 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-20 animate-pulse rounded bg-bg-secondary"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="citas.length === 0" class="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
        <svg class="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="mt-3 text-base font-medium text-text">No hay {{ tPlural || `${t || 'cita'}s` }}</h3>
      <p class="mt-1 text-sm text-text-muted">No se encontraron {{ tPlural || `${t || 'cita'}s` }} para mostrar.</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Resumen del padre (título y conteo) + orden por fecha -->
      <div class="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2">
        <div class="min-w-0 truncate text-xs text-text-muted"><slot name="summary" /></div>
        <button
          type="button"
          @click="toggleSort('date')"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text"
          :title="sortDir === 'asc' ? 'Mostrando de más antigua a más reciente' : 'Mostrando de más reciente a más antigua'"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h13M3 12h9m-9 5h5M17 4v16m0 0l-4-4m4 4l4-4" />
          </svg>
          Fecha: {{ sortDir === 'asc' ? 'ascendente' : 'descendente' }}
        </button>
      </div>

      <!-- Encabezados (solo escritorio) -->
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
        <button type="button" :class="[headClass, 'text-left hover:text-text']" @click="toggleSort('client')">
          {{ labels.client }}<SortArrow :active="sortKey === 'client'" :desc="sortDir === 'desc'" />
        </button>
        <button type="button" :class="[headClass, 'text-left hover:text-text']" @click="toggleSort('date')">
          Fecha<SortArrow :active="sortKey === 'date'" :desc="sortDir === 'desc'" />
        </button>
        <span :class="headClass">{{ labels.service }} / {{ labels.employee }}</span>
        <button type="button" :class="[headClass, 'text-left hover:text-text']" @click="toggleSort('status')">
          Estado<SortArrow :active="sortKey === 'status'" :desc="sortDir === 'desc'" />
        </button>
        <span />
      </div>

      <ul class="divide-y divide-border-subtle">
        <li
          v-for="cita in paginatedData"
          :key="cita.id"
          data-testid="agenda-row"
          :class="[gridClass, 'relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-bg-secondary/40']"
        >
          <!-- Cliente (en móvil deja sitio a la derecha para las acciones) -->
          <div class="col-span-2 flex min-w-0 items-center gap-2.5 pr-16 md:col-span-1 md:pr-0">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{{ getInitials(cita.clientName) }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-text">{{ cita.clientName }}</p>
              <p v-if="cita.petName" class="truncate text-xs font-medium text-primary/80">{{ cita.petName }}</p>
              <p v-if="cita.notes" class="line-clamp-2 text-xs text-text-muted md:truncate md:line-clamp-none">{{ cita.notes }}</p>
            </div>
          </div>

          <!-- Fecha y hora -->
          <div class="col-start-1 row-start-2 min-w-0 md:col-start-auto md:row-start-auto">
            <p class="hidden text-sm font-medium text-text md:block">{{ formatDateLabel(cita.date) }}</p>
            <p class="text-sm tabular-nums text-text md:text-xs md:text-text-secondary">
              <span class="font-medium md:hidden">{{ formatDateLabel(cita.date) }} · </span><span class="font-medium md:font-normal">{{ formatTime24to12(cita.time) }}</span>
              <span class="ml-1 text-xs text-text-muted">{{ cita.duration }}min</span>
            </p>
          </div>

          <!-- Servicio y profesional -->
          <div class="col-span-2 row-start-3 min-w-0 md:col-span-1 md:row-start-auto">
            <p class="truncate text-sm text-text-secondary">
              {{ cita.service }}
              <span
                v-if="(cita.groupServiceNames?.length ?? 0) > 1"
                :title="cita.groupServiceNames!.join(', ')"
                class="ml-1 text-xs font-semibold text-primary"
              >+{{ cita.groupServiceNames!.length - 1 }} {{ cita.groupServiceNames!.length - 1 === 1 ? labels.service.toLowerCase() : labels.servicePlural.toLowerCase() }}</span>
            </p>
            <p v-if="cita.employee" class="truncate text-xs text-text-muted">{{ cita.employee }}</p>
          </div>

          <!-- Estado -->
          <span
            class="col-start-2 row-start-2 inline-flex items-center justify-self-end gap-1.5 text-xs font-semibold md:col-start-auto md:row-start-auto md:justify-self-start"
            :class="statusText(cita.status)"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
            {{ cita.statusLabel }}
          </span>

          <!-- Acciones -->
          <div class="absolute right-2 top-2 flex items-center md:static md:justify-end">
            <button type="button" @click="$emit('edit', cita)" :class="iconButton" title="Editar" aria-label="Editar">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button type="button" @click="$emit('delete', cita.id)" :class="[iconButton, 'hover:!text-danger']" title="Eliminar" aria-label="Eliminar">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      </ul>

      <ListPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :page-numbers="pageNumbers"
        :has-next="hasNextPage"
        :has-previous="hasPreviousPage"
        :start="paginationStart"
        :end="paginationEnd"
        :total="totalItems"
        @goto="goToPage"
        @next="nextPage"
        @previous="previousPage"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, toRef, watch, type FunctionalComponent } from 'vue'
import { getInitials, getStatusColor, formatTime24to12, parseLocalDate } from '../../lib/formatters'
import { usePagination } from '../../composables/common/usePagination'
import ListPagination from '../common/ListPagination.vue'
import type { Cita } from '../../types/cita'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr, 12, 0, 0)
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]} ${dd}/${mm}`
}

// Mismo color de siempre por estado (viene de getStatusColor); aquí solo se usa el color del texto.
const statusText = (status: string) => getStatusColor(status).split(' ').find(c => c.startsWith('text-')) ?? 'text-text-muted'

// Flecha de orden de las columnas ordenables.
const SortArrow: FunctionalComponent<{ active: boolean; desc: boolean }> = (p) =>
  p.active
    ? h('svg', { class: ['ml-1 inline h-3 w-3 transition-transform', p.desc ? 'rotate-180' : ''], fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2.5' },
      [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M19 9l-7 7-7-7' })])
    : null

const props = defineProps<{
  citas: Cita[]
  loading?: boolean
  error?: unknown
  t?: string
  tPlural?: string
  labels?: Record<string, string>
  pageSize?: number
}>()

defineEmits<{
  edit: [cita: Cita]
  delete: [id: string]
}>()

// Cliente · Fecha/hora · Servicio y profesional · Estado · Acciones (última columna de ancho fijo).
const gridClass = 'md:grid md:grid-cols-[minmax(0,1.5fr)_7rem_minmax(0,1.3fr)_6.5rem_4.5rem] md:items-center md:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const iconButton = 'rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary'

const citasRef = toRef(props, 'citas')
const labels = computed(() => ({
  client: props.labels?.client || 'Cliente',
  service: props.labels?.service || 'Servicio',
  servicePlural: props.labels?.servicePlural || 'Servicios',
  employee: props.labels?.employee || 'Empleado',
}))

type SortKey = 'client' | 'date' | 'status' | null
// Ordenado por fecha ascendente por defecto -- antes no había orden explícito (dependía del
// orden en que llegaban del API) y no había forma de cambiarlo desde las tarjetas móviles.
const sortKey = ref<SortKey>('date')
const sortDir = ref<'asc' | 'desc'>('asc')
const STATUS_ORDER: Record<string, number> = { pending: 0, confirmed: 1, paid: 2, cancelled: 3 }

function toggleSort(key: Exclude<SortKey, null>) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sortedCitas = computed(() => {
  if (!sortKey.value) return citasRef.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  return [...citasRef.value].sort((a, b) => {
    if (key === 'client') return a.clientName.localeCompare(b.clientName) * dir
    if (key === 'date') {
      const av = `${a.date}T${a.time}`
      const bv = `${b.date}T${b.time}`
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir
    }
    return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir
  })
})

const {
  paginatedData,
  currentPage,
  totalPages,
  totalItems,
  paginationStart,
  paginationEnd,
  hasNextPage,
  hasPreviousPage,
  nextPage,
  previousPage,
  goToPage,
  pageNumbers,
} = usePagination({
  data: sortedCitas,
  pageSize: props.pageSize ?? 25,
})

watch([() => props.citas, sortKey, sortDir], () => {
  goToPage(1)
})
</script>
