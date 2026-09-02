<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-text">Abonos a proveedores</h3>
        <p class="text-xs text-text-muted mt-0.5">Pagos realizados a proveedores</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="ctx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Abono
        </button>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-10">
      <svg class="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="ctx.payments.value.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
      No hay abonos registrados aún.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">Proveedor</th>
            <th class="px-4 py-2.5 text-right font-medium text-text-muted text-xs">Monto</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden sm:table-cell">Método</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden md:table-cell">Fecha</th>
            <th class="px-4 py-2.5 text-center font-medium text-text-muted text-xs">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="p in ctx.payments.value" :key="p.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-2.5 font-medium text-text">{{ p.supplierName }}</td>
            <td class="px-4 py-2.5 text-right">
              <div class="font-medium text-text">
                {{ p.currency === 'VES' ? formatVESEs(p.originalAmount) : formatUSD(p.amount) }}
              </div>
              <div class="text-xs text-text-muted">
                {{ p.currency === 'VES' ? formatUSD(p.amount) : formatSecondary(p.amount, p.exchangeRateUsed) }}
              </div>
            </td>
            <td class="px-4 py-2.5 text-text-secondary hidden sm:table-cell">{{ formatMethod(p.paymentMethod) }}</td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ formatDate(p.paymentDate) }}</td>
            <td class="px-4 py-2.5 text-center">
              <button @click="ctx.handleDelete(p.id)"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                title="Eliminar">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
</script>
