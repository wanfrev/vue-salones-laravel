<template>
  <ModalBase
    :is-open="isOpen"
    title="Historial de facturas de compra"
    subtitle="Revisa cuándo llegó cada mercancía y qué incluía"
    size="xl"
    :show-footer="false"
    @close="close"
  >
    <div class="space-y-3">
      <FormInput
        v-model="search"
        placeholder="Buscar por N° de factura o proveedor..."
      />

      <div v-if="isLoading" class="py-10 text-center text-sm text-text-muted">Cargando facturas...</div>

      <p v-else-if="filteredInvoices.length === 0" class="py-10 text-center text-sm text-text-muted">
        {{ invoices?.length ? 'Ninguna factura coincide con la búsqueda.' : 'Todavía no se ha registrado ninguna factura de compra.' }}
      </p>

      <div v-else class="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        <div v-for="invoice in filteredInvoices" :key="invoice.id"
          class="rounded-xl border border-border bg-bg-secondary/30">
          <button type="button" class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            @click="toggle(invoice.id)">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-text">
                Factura #{{ invoice.invoiceNumber }}
                <span class="ml-1 font-normal text-text-muted">· {{ formatDateUS(invoice.invoiceDate) }}</span>
              </p>
              <p class="truncate text-xs text-text-muted">
                {{ invoice.supplierName || 'Sin proveedor' }}
                <span v-if="invoice.createdByName"> · Registrada por {{ invoice.createdByName }}</span>
                <span> · {{ invoice.items.length }} {{ invoice.items.length === 1 ? 'producto' : 'productos' }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="text-sm font-bold tabular-nums text-text">{{ formatUSD(invoice.total) }}</span>
              <ArrowDownIcon class="h-4 w-4 text-text-muted transition-transform" :class="{ 'rotate-180': expanded.has(invoice.id) }" />
            </div>
          </button>

          <div v-if="expanded.has(invoice.id)" class="border-t border-border px-4 py-3">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-[10px] uppercase tracking-wider text-text-muted">
                  <th class="pb-1.5 pr-2">Producto</th>
                  <th class="pb-1.5 pr-2 text-right">Cantidad</th>
                  <th class="pb-1.5 pr-2 text-right">Costo unit.</th>
                  <th class="pb-1.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                <tr v-for="item in invoice.items" :key="item.id">
                  <td class="py-1.5 pr-2 text-text">
                    {{ item.productName }}
                    <span v-if="item.productSku" class="text-text-muted">({{ item.productSku }})</span>
                  </td>
                  <td class="py-1.5 pr-2 text-right tabular-nums text-text-secondary">{{ item.quantity }}</td>
                  <td class="py-1.5 pr-2 text-right tabular-nums text-text-secondary">{{ formatUSD(item.unitCost) }}</td>
                  <td class="py-1.5 text-right tabular-nums text-text-secondary">{{ formatUSD(item.lineTotal) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="invoice.notes" class="mt-2 text-xs text-text-muted">Notas: {{ invoice.notes }}</p>
            <div class="mt-2 flex justify-end">
              <button type="button" @click="printPurchaseInvoice(invoice, businessStore.business?.name || 'Negocio')"
                class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">
                Reimprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ArrowDownIcon } from '@solar-icons/vue/linear'
import { useModal } from '../../composables/common/useModal'
import { useCurrency } from '../../composables/common/useCurrency'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import ModalBase from '../common/ModalBase.vue'
import { FormInput } from '../forms'
import { listPurchaseInvoices, purchaseInvoiceKeys } from '../../services/purchaseInvoiceService'
import { printPurchaseInvoice } from '../../lib/purchaseInvoicePrint'
import { formatDateUS } from '../../lib/formatters'

const MODAL_ID = 'purchase-invoice-history-modal'
const { isOpen, close } = useModal(MODAL_ID)
const { formatUSD } = useCurrency()
const { authStore } = useAuth()
const businessStore = useBusinessStore()

const businessId = computed(() => authStore.businessId)

const { data: invoices, isLoading } = useQuery({
  queryKey: computed(() => purchaseInvoiceKeys.all(businessId.value)),
  queryFn: () => listPurchaseInvoices(),
  enabled: computed(() => !!businessId.value && isOpen.value),
})

const search = ref('')
watch(isOpen, (open) => { if (open) search.value = '' })

const filteredInvoices = computed(() => {
  const list = invoices.value ?? []
  const query = search.value.trim().toLowerCase()
  if (!query) return list
  return list.filter(i =>
    i.invoiceNumber.toLowerCase().includes(query) ||
    (i.supplierName ?? '').toLowerCase().includes(query),
  )
})

const expanded = ref<Set<string>>(new Set())
const toggle = (id: string) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const open = () => {
  useModal(MODAL_ID).open()
}

defineExpose({ open, close, isOpen })
</script>
