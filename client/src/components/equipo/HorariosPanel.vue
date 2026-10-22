<template>
  <div>
    <div v-if="items.length === 0" class="px-4 py-14 text-center text-sm text-text-muted">No hay horarios registrados</div>

    <template v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-5 py-2 lg:grid']">
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="headClass">Entrada</span>
        <span :class="headClass">Salida</span>
        <span :class="headClass">Descanso</span>
        <span :class="[headClass, 'text-right']">Estado</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="row in paginatedData" :key="row.id" :class="[gridClass, 'px-4 py-3 transition-colors hover:bg-bg-secondary/40 sm:px-5']">
          <div class="flex min-w-0 items-center justify-between gap-3">
            <p class="truncate text-sm font-semibold text-text">{{ row.name }}</p>
            <span :class="[badgeClass(row.available), 'lg:hidden']"><span :class="dotClass(row.available)" />{{ row.available ? 'Disponible' : 'No disponible' }}</span>
          </div>

          <p class="mt-0.5 text-xs tabular-nums text-text-secondary lg:hidden">{{ formatTime24to12(row.start) }} - {{ formatTime24to12(row.end) }} · {{ row.break }}</p>

          <p class="hidden text-xs tabular-nums text-text-secondary lg:block">{{ formatTime24to12(row.start) }}</p>
          <p class="hidden text-xs tabular-nums text-text-secondary lg:block">{{ formatTime24to12(row.end) }}</p>
          <p class="hidden min-w-0 truncate text-xs text-text-secondary lg:block">{{ row.break }}</p>
          <div class="hidden justify-end lg:flex">
            <span :class="badgeClass(row.available)"><span :class="dotClass(row.available)" />{{ row.available ? 'Disponible' : 'No disponible' }}</span>
          </div>
        </li>
      </ul>

      <ListPagination
        :current-page="currentPage" :total-pages="totalPages" :page-numbers="pageNumbers"
        :has-next="hasNextPage" :has-previous="hasPreviousPage" :start="paginationStart" :end="paginationEnd" :total="totalItems"
        @goto="goToPage" @next="nextPage" @previous="previousPage"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import { usePagination } from '../../composables/common/usePagination'
import { useBusinessStore } from '../../store/business'
import { formatTime24to12 } from '../../lib/formatters'
import ListPagination from '../common/ListPagination.vue'

/** Una fila de «Horarios del Equipo» (la arma Equipo.vue desde el horario de cada empleado). */
export interface ScheduleRow {
  id: string
  name: string
  start: string
  end: string
  /** Texto ya armado: «13:00 - 14:00» o «Sin descanso registrado». */
  break: string
  appointments: number
  available: boolean
}

const props = defineProps<{ items: ScheduleRow[] }>()

const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)

const gridClass = 'lg:grid lg:grid-cols-[minmax(0,1.4fr)_7rem_7rem_minmax(0,1.4fr)_9rem] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

const badgeClass = (available: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`
const dotClass = (available: boolean) => `h-1.5 w-1.5 rounded-full ${available ? 'bg-success' : 'bg-danger'}`

const { currentPage, totalPages, pageNumbers, paginatedData, hasNextPage, hasPreviousPage, goToPage, nextPage, previousPage,
  paginationStart, paginationEnd, totalItems, firstPage } = usePagination({ data: toRef(props, 'items'), pageSize: 10 })
watch(() => props.items.length, () => firstPage())
</script>
