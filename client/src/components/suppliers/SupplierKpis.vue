<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-text-muted">Total proveedores</p>
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BagIcon class="h-4 w-4" />
        </span>
      </div>
      <p class="mt-2 text-xl font-bold text-text tabular-nums">{{ metrics.totalSuppliers }}</p>
      <p class="mt-0.5 text-xs text-text-muted">
        {{ metrics.withDebt }} con deuda pendiente
      </p>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-text-muted">Deuda total</p>
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-text-muted/10 text-text-secondary">
          <BillListIcon class="h-4 w-4" />
        </span>
      </div>
      <p class="mt-2 text-xl font-bold text-text tabular-nums">{{ formatUSD(metrics.totalDebt) }}</p>
      <p class="mt-0.5 text-xs text-text-muted">Facturas + asignaciones</p>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-text-muted">Total abonado</p>
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
          <DollarIcon class="h-4 w-4" />
        </span>
      </div>
      <p class="mt-2 text-xl font-bold text-success tabular-nums">{{ formatUSD(metrics.totalPaid) }}</p>
      <p class="mt-0.5 text-xs text-text-muted">Pagos desde egresos</p>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-text-muted">Saldo pendiente</p>
        <span
          class="flex h-7 w-7 items-center justify-center rounded-lg"
          :class="metrics.totalPending > 0 ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'"
        >
          <CheckCircleIcon v-if="metrics.totalPending === 0" class="h-4 w-4" />
          <BillListIcon v-else class="h-4 w-4" />
        </span>
      </div>
      <p
        class="mt-2 text-xl font-bold tabular-nums"
        :class="metrics.totalPending > 0 ? 'text-warning' : 'text-success'"
      >
        {{ formatUSD(metrics.totalPending) }}
      </p>
      <p class="mt-0.5 text-xs text-text-muted">Por amortizar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import { BagIcon, BillListIcon, DollarIcon, CheckCircleIcon } from '@solar-icons/vue/linear'

defineProps<{
  metrics: {
    totalSuppliers: number
    withDebt: number
    totalDebt: number
    totalPaid: number
    totalPending: number
    totalInvoicesAmount: number
  }
}>()

const { formatUSD } = useCurrency()
</script>
