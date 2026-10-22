<template>
  <div>
    <div v-if="items.length === 0" class="px-4 py-14 text-center text-sm text-text-muted">No hay pagos de nómina registrados en este periodo.</div>

    <template v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-5 py-2 lg:grid']">
        <span :class="headClass">Fecha</span>
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="headClass">Método</span>
        <span :class="[headClass, 'text-right']">Monto</span>
        <span />
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="ep in paginatedData" :key="ep.id" :class="[gridClass, 'relative px-4 py-3 transition-colors hover:bg-bg-secondary/40 sm:px-5']">
          <p class="hidden text-xs tabular-nums text-text-secondary lg:block">{{ formatDate(ep.paymentDate) }}</p>

          <div class="min-w-0 pr-20 lg:pr-0">
            <p class="truncate text-sm font-semibold text-text">{{ ep.employeeName }}</p>
            <p class="mt-0.5 text-xs text-text-muted lg:hidden">{{ formatDate(ep.paymentDate) }} · {{ methodText(ep) }}</p>
          </div>

          <div class="hidden min-w-0 lg:block">
            <span v-if="ep.type === 'consumption'" class="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">{{ ep.concept || 'Consumo' }}</span>
            <span v-else class="text-xs text-text-secondary">{{ formatMethod(ep.paymentMethod) }}</span>
          </div>

          <div class="mt-1 text-left lg:mt-0 lg:text-right">
            <p class="text-sm font-bold tabular-nums text-danger">{{ primaryAmount(ep) }}</p>
            <p class="text-[11px] text-text-muted">{{ secondaryAmount(ep) }}</p>
          </div>

          <div class="absolute right-3 top-2.5 flex items-center gap-0.5 lg:static lg:justify-end">
            <button
              type="button"
              class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
              title="Editar pago" aria-label="Editar pago"
              @click="emit('edit', ep)"
            ><PenIcon :size="15" /></button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              title="Eliminar pago" aria-label="Eliminar pago"
              @click="emit('delete', ep.id)"
            ><TrashBin2Icon :size="15" /></button>
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
import { PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { usePagination } from '../../composables/common/usePagination'
import { useBusinessStore } from '../../store/business'
import { formatDate, formatMethod } from '../../lib/formatters'
import ListPagination from '../common/ListPagination.vue'

/** Un pago de nómina o un consumo debitado (los arma useEmployeePayments). */
export interface PayrollPaymentRow {
  id: string
  paymentDate: string
  employeeName: string
  type?: string
  concept?: string
  paymentMethod: string
  /** 'USD' | 'VES' */
  currency?: string
  /** Monto tal como se pagó (en su moneda). */
  originalAmount: number
  /** Equivalente en USD. */
  amount: number
  employeeVesRate?: number
}

const props = defineProps<{ items: PayrollPaymentRow[] }>()
const emit = defineEmits<{
  edit: [payment: PayrollPaymentRow]
  delete: [id: string]
}>()

const { formatUSD, formatVESEs, formatEmployeeSecondary } = useCurrency()
const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)

const gridClass = 'lg:grid lg:grid-cols-[6rem_minmax(0,1.4fr)_minmax(0,1.4fr)_8.5rem_4.5rem] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

// Un pago en bolívares se muestra en bolívares (lo que se entregó) y su equivalente en dólares debajo.
const primaryAmount = (ep: PayrollPaymentRow) => (ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount))
const secondaryAmount = (ep: PayrollPaymentRow) =>
  ep.currency === 'VES' ? formatUSD(ep.amount) : formatEmployeeSecondary(ep.amount, ep.employeeVesRate)
const methodText = (ep: PayrollPaymentRow) => (ep.type === 'consumption' ? ep.concept || 'Consumo' : formatMethod(ep.paymentMethod))

const { currentPage, totalPages, pageNumbers, paginatedData, hasNextPage, hasPreviousPage, goToPage, nextPage, previousPage,
  paginationStart, paginationEnd, totalItems, firstPage } = usePagination({ data: toRef(props, 'items'), pageSize: 10 })
watch(() => props.items.length, () => firstPage())
</script>
