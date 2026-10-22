<template>
  <div>
    <div v-if="items.length === 0" class="px-4 py-14 text-center text-sm text-text-muted">No hay comisiones registradas en este periodo.</div>

    <template v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-5 py-2 lg:grid']">
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="headClass">{{ terminology.service || 'Servicio' }} · {{ terminology.client || 'Cliente' }}</span>
        <span :class="[headClass, 'text-right']">Costo</span>
        <span :class="[headClass, 'text-right']">Comisión</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="p in paginatedData" :key="p.id" :class="[gridClass, 'px-4 py-3 transition-colors hover:bg-bg-secondary/40 sm:px-5']">
          <div class="flex min-w-0 items-start justify-between gap-3">
            <p class="truncate text-sm font-semibold text-text">{{ p.employee }}</p>
            <div class="shrink-0 text-right lg:hidden">
              <p class="text-sm font-bold tabular-nums text-success">{{ formatUSD(p.earnings) }}</p>
              <p class="-mt-0.5 text-[10px] text-text-muted">{{ formatSecondary(p.earnings) }}</p>
            </div>
          </div>

          <p class="mt-0.5 truncate text-xs text-text-secondary lg:hidden">{{ p.service }}<template v-if="p.client"> · {{ p.client }}</template></p>
          <p class="mt-0.5 text-xs text-text-muted lg:hidden">
            Costo {{ formatUSD(p.amount) }} ({{ formatSecondary(p.amount) }}) · {{ p.percentage }}%<template v-if="(p.tipAmount ?? 0) > 0"> · Propina {{ formatUSD(p.tipAmount) }}</template>
          </p>

          <div class="hidden min-w-0 lg:block">
            <p class="truncate text-xs font-medium text-text-secondary">{{ p.service }}</p>
            <p class="truncate text-xs text-text-muted">{{ p.client || '—' }}</p>
          </div>
          <div class="hidden text-right lg:block">
            <p class="text-xs tabular-nums text-text">{{ formatUSD(p.amount) }}</p>
            <p class="text-[11px] text-text-muted">{{ p.percentage }}% · {{ formatSecondary(p.amount) }}</p>
          </div>
          <div class="hidden text-right lg:block">
            <p class="text-sm font-bold tabular-nums text-success">{{ formatUSD(p.earnings) }}</p>
            <p class="text-[11px] text-text-muted">{{ formatSecondary(p.earnings) }}</p>
            <p v-if="(p.tipAmount ?? 0) > 0" class="text-[11px] text-text-muted">+ propina <span class="font-semibold text-primary">{{ formatUSD(p.tipAmount) }}</span></p>
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
import { useCurrency } from '../../composables/common/useCurrency'
import { usePagination } from '../../composables/common/usePagination'
import { useBusinessStore } from '../../store/business'
import ListPagination from '../common/ListPagination.vue'

/** Una fila de «Servicios realizados» (la arma useFinancialSummary): comisión del empleado por servicio. */
export interface ServicePaymentRow {
  id: string
  employee: string
  client?: string
  service: string
  amount: number
  percentage: number
  earnings: number
  tipAmount?: number
}

const props = defineProps<{ items: ServicePaymentRow[] }>()

const { formatUSD, formatSecondary } = useCurrency()
const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)

const gridClass = 'lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_8rem_8rem] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

const { currentPage, totalPages, pageNumbers, paginatedData, hasNextPage, hasPreviousPage, goToPage, nextPage, previousPage,
  paginationStart, paginationEnd, totalItems, firstPage } = usePagination({ data: toRef(props, 'items'), pageSize: 10 })
watch(() => props.items.length, () => firstPage())
</script>
