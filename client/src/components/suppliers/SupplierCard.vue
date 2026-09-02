<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:border-border-strong hover:shadow-md">
    <!-- Card Header -->
    <div class="p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary shadow-inner">
            {{ getInitials(supplier.fullName) }}
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-base font-bold text-text leading-tight">{{ supplier.fullName }}</h3>
            <p v-if="supplier.company" class="truncate text-xs font-medium text-text-secondary mt-0.5">
              {{ supplier.company }}
            </p>
            <p v-else class="text-xs text-text-muted mt-0.5">Sin empresa registrada</p>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="shrink-0">
          <span
            v-if="supplier.pendingBalance > 0"
            class="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning border border-warning/20"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
            Debe {{ formatUSD(supplier.pendingBalance) }}
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success border border-success/20"
          >
            <CheckCircleIcon class="h-3.5 w-3.5" />
            Al día
          </span>
        </div>
      </div>

      <!-- Contact info & notes -->
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <a
          v-if="supplier.phone"
          :href="`tel:${supplier.phone}`"
          class="inline-flex items-center gap-1 text-text-secondary hover:text-primary transition-colors"
        >
          <span>📞 {{ supplier.phone }}</span>
        </a>
        <span v-else class="text-text-muted">Sin teléfono</span>

        <p v-if="supplier.notes" class="truncate max-w-[260px] text-text-muted italic" :title="supplier.notes">
          "{{ supplier.notes }}"
        </p>
      </div>

      <!-- Financial Snapshot Box -->
      <div class="mt-4 rounded-xl border border-border/80 bg-bg-secondary/40 p-3.5">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="border-r border-border/60 pr-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Pendiente</span>
            <span
              class="mt-1 block text-base font-extrabold tabular-nums"
              :class="supplier.pendingBalance > 0 ? 'text-warning' : 'text-success'"
            >
              {{ formatUSD(supplier.pendingBalance) }}
            </span>
          </div>

          <div class="border-r border-border/60 px-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Deuda total</span>
            <span class="mt-1 block text-sm font-bold tabular-nums text-text">
              <template v-if="supplier.debtCurrency === 'VES'">
                {{ formatVESEs(supplier.debtOriginalAmount) }}
              </template>
              <template v-else>
                {{ formatUSD(supplier.totalDebt) }}
              </template>
            </span>
          </div>

          <div class="pl-1">
            <span class="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Abonado</span>
            <span class="mt-1 block text-sm font-bold tabular-nums text-success">
              {{ formatUSD(supplier.totalPaid) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Facturas de compra indicator & toggle -->
      <div class="mt-3.5">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="showInvoices = !showInvoices"
        >
          <div class="flex items-center gap-2">
            <BillListIcon class="h-4 w-4 text-primary" />
            <span>
              <strong>{{ supplier.invoiceCount }}</strong>
              {{ supplier.invoiceCount === 1 ? 'factura de compra' : 'facturas de compra' }}
              <template v-if="supplier.invoicesTotal > 0">
                · Total: <span class="text-text font-semibold">{{ formatUSD(supplier.invoicesTotal) }}</span>
              </template>
            </span>
          </div>
          <div class="flex items-center gap-1 text-text-muted">
            <span>{{ showInvoices ? 'Ocultar' : 'Ver detalle' }}</span>
            <ArrowDownIcon class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': showInvoices }" />
          </div>
        </button>

        <!-- Invoices List Accordion -->
        <div v-if="showInvoices" class="mt-2 space-y-2 rounded-xl border border-border bg-bg-secondary/20 p-2.5 text-xs">
          <p v-if="supplier.invoices.length === 0" class="py-2 text-center text-text-muted">
            No hay facturas de inventario registradas para este proveedor.
          </p>
          <div
            v-for="inv in supplier.invoices"
            :key="inv.id"
            class="rounded-lg border border-border/70 bg-surface p-2.5 transition-theme"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-text">Factura #{{ inv.invoiceNumber }}</p>
                <p class="text-[11px] text-text-muted mt-0.5">
                  Fecha: {{ formatDateUS(inv.invoiceDate) }} · {{ inv.items.length }} {{ inv.items.length === 1 ? 'producto' : 'productos' }}
                </p>
              </div>
              <div class="text-right">
                <span class="font-bold tabular-nums text-text">{{ formatUSD(inv.total) }}</span>
                <div>
                  <button
                    type="button"
                    class="text-[10px] text-primary hover:underline font-medium"
                    @click="printPurchaseInvoice(inv, businessStore.business?.name || 'Negocio')"
                  >
                    Reimprimir
                  </button>
                </div>
              </div>
            </div>

            <!-- Items mini-preview -->
            <div v-if="inv.items?.length" class="mt-2 border-t border-border/50 pt-1.5 space-y-1">
              <div
                v-for="item in inv.items"
                :key="item.id"
                class="flex items-center justify-between text-[11px] text-text-secondary"
              >
                <span class="truncate max-w-[180px]">{{ item.quantity }}x {{ item.productName }}</span>
                <span class="tabular-nums font-medium text-text">{{ formatUSD(item.lineTotal) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Actions Footer -->
    <div class="flex items-center justify-between border-t border-border bg-bg-secondary/50 px-4 py-2.5 sm:px-5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover"
        @click="$emit('pay', supplier.id)"
      >
        <DollarIcon class="h-3.5 w-3.5" />
        <span>Abonar</span>
      </button>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
          title="Editar proveedor"
          @click="$emit('edit', supplier)"
        >
          <PenIcon class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
          title="Eliminar proveedor"
          @click="$emit('delete', supplier.id)"
        >
          <TrashBin2Icon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getInitials, formatDateUS } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { printPurchaseInvoice } from '../../lib/purchaseInvoicePrint'
import type { PurchaseInvoiceRow } from '../../services/purchaseInvoiceService'
import type { SupplierRow } from '../../services/suppliersService'
import {
  BillListIcon,
  DollarIcon,
  PenIcon,
  TrashBin2Icon,
  CheckCircleIcon,
  ArrowDownIcon,
} from '@solar-icons/vue/linear'

export interface SupplierWithDetails extends SupplierRow {
  totalPaid: number
  pendingBalance: number
  invoiceCount: number
  invoicesTotal: number
  invoices: PurchaseInvoiceRow[]
}

defineProps<{
  supplier: SupplierWithDetails
}>()

defineEmits<{
  (e: 'pay', supplierId: string): void
  (e: 'edit', supplier: SupplierRow): void
  (e: 'delete', supplierId: string): void
}>()

const { formatUSD, formatVESEs } = useCurrency()
const businessStore = useBusinessStore()
const showInvoices = ref(false)
</script>
