<template>
  <div class="@container overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text">Abonos a proveedores</h3>
        <p class="mt-0.5 text-xs text-text-muted">Pagos realizados a proveedores</p>
      </div>
      <button @click="ctx.openNew()"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Abono
      </button>
    </div>

    <div v-if="ctx.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-3 w-28 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
      </div>
    </div>

    <div v-else-if="ctx.payments.value.length === 0" class="px-4 py-10 text-center text-sm text-text-muted">
      No hay abonos registrados aún.
    </div>

    <div v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 @2xl:grid']">
        <span :class="headClass">Proveedor</span>
        <span :class="[headClass, 'text-right']">Monto</span>
        <span :class="headClass">Método</span>
        <span :class="headClass">Fecha</span>
        <span :class="[headClass, 'text-center']">Acción</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="p in ctx.payments.value" :key="p.id" data-testid="supplier-payment-row"
          :class="[gridClass, 'relative px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
          <div class="min-w-0 pr-12 @2xl:pr-0">
            <p class="font-medium text-text">{{ p.supplierName }}</p>
            <p class="text-xs text-text-muted @2xl:hidden">{{ formatMethod(p.paymentMethod) }} · {{ formatDate(p.paymentDate) }}</p>
          </div>
          <div class="mt-1 @2xl:mt-0 @2xl:text-right">
            <div class="font-medium tabular-nums text-text">
              {{ p.currency === 'VES' ? formatVESEs(p.originalAmount) : formatUSD(p.amount) }}
            </div>
            <div class="text-xs tabular-nums text-text-muted">
              {{ p.currency === 'VES' ? formatUSD(p.amount) : formatSecondary(p.amount, p.exchangeRateUsed) }}
            </div>
          </div>
          <div class="hidden text-text-secondary @2xl:block">{{ formatMethod(p.paymentMethod) }}</div>
          <div class="hidden text-text-secondary @2xl:block">{{ formatDate(p.paymentDate) }}</div>
          <div class="absolute right-2 top-2 flex items-center @2xl:static @2xl:justify-center">
            <button @click="ctx.handleDelete(p.id)"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
              title="Eliminar" aria-label="Eliminar">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <SupplierPaymentModal :ctx="ctx" />
</template>

<script setup lang="ts">
import { formatMethod, formatDate } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'
import SupplierPaymentModal from './SupplierPaymentModal.vue'

defineProps<{
  ctx: ReturnType<typeof import('../../composables/suppliers/useSuppliers').useSupplierPayments>
}>()

const { formatUSD, formatVESEs, formatSecondary } = useCurrency()

// Proveedor · Monto · Método · Fecha · Acción (última columna de ancho fijo).
const gridClass = '@2xl:grid @2xl:grid-cols-[minmax(0,1.3fr)_7.5rem_7rem_6rem_4rem] @2xl:items-center @2xl:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
</script>
