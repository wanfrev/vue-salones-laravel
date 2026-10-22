<template>
  <div>
    <div v-if="items.length === 0" class="px-4 py-14 text-center text-sm text-text-muted">No hay deuda pendiente en este periodo.</div>

    <template v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-5 py-2 lg:grid']">
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="[headClass, 'text-right']">Total ganado</span>
        <span :class="[headClass, 'text-right']">Pagado</span>
        <span :class="[headClass, 'text-right']">Pendiente</span>
        <span />
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="row in paginatedData" :key="row.employeeId" :class="[gridClass, 'px-4 py-3 transition-colors hover:bg-bg-secondary/40 sm:px-5']">
          <!-- Empleado: forma de pago y de dónde sale el total -->
          <div class="min-w-0">
            <div class="flex items-baseline justify-between gap-3">
              <p class="truncate text-sm font-semibold text-text">{{ row.employeeName }}</p>
              <div class="shrink-0 text-right lg:hidden">
                <p class="text-sm font-bold tabular-nums" :class="pendingClass(row)">{{ formatUSD(row.pendingBalance) }}</p>
                <p class="-mt-0.5 text-[10px] text-text-muted">pendiente</p>
              </div>
            </div>
            <p class="mt-0.5 text-xs text-text-muted">{{ payTypeText(row) }}</p>
            <p v-if="row.baseSalary > 0 || row.commissionTotal > 0" class="text-[11px] text-text-muted">{{ originText(row) }}</p>
          </div>

          <!-- Móvil: ganado y pagado en una línea; escritorio: columnas -->
          <p class="mt-1 text-xs text-text-muted lg:hidden">
            Ganado {{ formatUSD(row.totalEarned) }} · Pagado {{ formatUSD(row.totalPaid) }}<template v-if="row.totalConsumed > 0"> · Consumo {{ formatUSD(row.totalConsumed) }}</template>
          </p>
          <p class="hidden text-right text-sm font-semibold tabular-nums text-text lg:block">{{ formatUSD(row.totalEarned) }}</p>
          <div class="hidden text-right lg:block">
            <p class="text-sm font-medium tabular-nums text-danger">{{ formatUSD(row.totalPaid) }}</p>
            <p class="text-[11px] text-text-muted">{{ formatEmployeeSecondary(row.totalPaid) }}</p>
            <p v-if="row.totalConsumed > 0" class="text-[11px] text-text-muted">+ consumo {{ formatUSD(row.totalConsumed) }}</p>
          </div>
          <p class="hidden text-right text-sm font-bold tabular-nums lg:block" :class="pendingClass(row)">{{ formatUSD(row.pendingBalance) }}</p>

          <div class="mt-2 flex lg:mt-0 lg:justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              title="Imprimir recibo de pago"
              @click="emit('openRecibo', row)"
            >
              <PrinterIcon :size="14" /> Recibo
            </button>
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
import { PrinterIcon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { usePagination } from '../../composables/common/usePagination'
import { useBusinessStore } from '../../store/business'
import ListPagination from '../common/ListPagination.vue'

/** Lo que gana, ha cobrado y debe cada empleado en el periodo (lo arma Equipo.vue desde useEmployeePayments). */
export interface DebtRow {
  employeeId: string
  employeeName: string
  payType?: string
  payPercentage: number
  baseSalary: number
  commissionTotal: number
  totalEarned: number
  totalPaid: number
  totalConsumed: number
  pendingBalance: number
}

const props = defineProps<{ items: DebtRow[] }>()
const emit = defineEmits<{ openRecibo: [row: DebtRow] }>()

const { formatUSD, formatEmployeeSecondary } = useCurrency()
const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)

const gridClass = 'lg:grid lg:grid-cols-[minmax(0,1.8fr)_7rem_7.5rem_7rem_6rem] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

const pendingClass = (row: DebtRow) => (row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted')

function payTypeText(row: DebtRow): string {
  if (row.payType === 'salary') return 'Sueldo base'
  if (row.payType === 'mixed') return `Sueldo + ${row.payPercentage}%`
  if (row.payType === 'percentage') return `${row.payPercentage}% por servicio`
  return '—'
}

/** «Sueldo $200 + comisión $85»: de dónde sale el total ganado. */
function originText(row: DebtRow): string {
  const parts: string[] = []
  if (row.baseSalary > 0) parts.push(`sueldo ${formatUSD(row.baseSalary)}`)
  if (row.commissionTotal > 0) parts.push(`comisión ${formatUSD(row.commissionTotal)}`)
  const text = parts.join(' + ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const { currentPage, totalPages, pageNumbers, paginatedData, hasNextPage, hasPreviousPage, goToPage, nextPage, previousPage,
  paginationStart, paginationEnd, totalItems, firstPage } = usePagination({ data: toRef(props, 'items'), pageSize: 10 })
watch(() => props.items.length, () => firstPage())
</script>
