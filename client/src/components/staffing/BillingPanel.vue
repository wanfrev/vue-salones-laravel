<template>
  <div class="space-y-5 border-t border-border bg-bg-secondary/40 px-4 py-4">
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
        <p class="text-[10px] uppercase tracking-wider text-text-muted">Facturado</p>
        <p class="text-sm font-bold tabular-nums text-text">{{ formatUSD(billing.balance.value?.invoiced ?? 0) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
        <p class="text-[10px] uppercase tracking-wider text-text-muted">Pagado</p>
        <p class="text-sm font-bold tabular-nums text-success">{{ formatUSD(billing.balance.value?.paid ?? 0) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface px-3 py-2.5">
        <p class="text-[10px] uppercase tracking-wider text-text-muted">Pendiente</p>
        <p class="text-sm font-bold tabular-nums" :class="(billing.balance.value?.pending ?? 0) > 0 ? 'text-danger' : 'text-text'">
          {{ formatUSD(billing.balance.value?.pending ?? 0) }}
        </p>
      </div>
    </div>

    <div>
      <p class="mb-2 text-sm font-semibold text-text">Facturas</p>
      <div v-if="(billing.invoices.value ?? []).length === 0" class="rounded-lg bg-surface px-3 py-3 text-center text-xs text-text-muted">
        Sin facturas todavía. Se generan desde una semana aprobada en "Horas trabajadas".
      </div>
      <div v-else class="overflow-x-auto rounded-lg border border-border bg-surface">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2">#</th>
              <th class="px-3 py-2">Emitida</th>
              <th class="px-3 py-2">Vence</th>
              <th class="px-3 py-2 text-right">Total</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="invoice in billing.invoices.value" :key="invoice.id">
              <td class="px-3 py-2 font-medium text-text">{{ invoice.invoice_number }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ formatDateUS(invoice.issue_date.slice(0, 10)) }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ formatDateUS(invoice.due_date.slice(0, 10)) }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-text">{{ formatUSD(invoice.total) }}</td>
              <td class="px-3 py-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(invoice.status)">
                  {{ STATUS_LABELS[invoice.status] }}
                </span>
              </td>
              <td class="px-3 py-2 text-right">
                <button type="button" title="Imprimir" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                  @click="handlePrint(invoice.id)">
                  <PrinterIcon class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <p class="mb-2 text-sm font-semibold text-text">Abonos</p>
      <div v-if="(billing.payments.value ?? []).length" class="mb-3 overflow-x-auto rounded-lg border border-border bg-surface">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2">Fecha</th>
              <th class="px-3 py-2 text-right">Monto</th>
              <th class="px-3 py-2">Método</th>
              <th class="px-3 py-2">Referencia</th>
              <th class="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="payment in billing.payments.value" :key="payment.id">
              <td class="px-3 py-2 text-text-secondary">{{ formatDateUS(payment.payment_date.slice(0, 10)) }}</td>
              <td class="px-3 py-2 text-right tabular-nums font-medium text-success">{{ formatUSD(payment.amount) }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ payment.payment_method || '—' }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ payment.reference || '—' }}</td>
              <td class="px-3 py-2 text-right">
                <button type="button" title="Eliminar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                  @click="billing.removePayment(payment.id)">
                  <TrashBin2Icon class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <form class="flex flex-wrap items-end gap-2" @submit.prevent="submitPayment">
        <div class="w-28">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`amt-${companyId}`">Monto</label>
          <input :id="`amt-${companyId}`" v-model.number="form.amount" type="number" min="0.01" step="0.01" required :class="inputClass" />
        </div>
        <div class="w-40">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`inv-${companyId}`">Factura (opcional)</label>
          <select :id="`inv-${companyId}`" v-model="form.invoiceId" :class="inputClass">
            <option value="">A cuenta</option>
            <option v-for="i in billing.invoices.value" :key="i.id" :value="i.id">#{{ i.invoice_number }} — {{ formatUSD(i.total) }}</option>
          </select>
        </div>
        <div class="w-36">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`method-${companyId}`">Método</label>
          <input :id="`method-${companyId}`" v-model="form.paymentMethod" type="text" placeholder="Transferencia" :class="inputClass" />
        </div>
        <div class="w-36">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`date-${companyId}`">Fecha</label>
          <input :id="`date-${companyId}`" v-model="form.paymentDate" type="date" required :class="inputClass" />
        </div>
        <div class="w-32">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`ref-${companyId}`">Referencia</label>
          <input :id="`ref-${companyId}`" v-model="form.reference" type="text" :class="inputClass" />
        </div>
        <button type="submit" :disabled="billing.paymentMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
          {{ billing.paymentMutation.isPending.value ? 'Guardando...' : 'Registrar abono' }}
        </button>
      </form>
      <p v-if="billing.saveError.value" class="mt-2 text-xs text-danger">{{ billing.saveError.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { PrinterIcon, TrashBin2Icon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { useBilling } from '../../composables/staffing/useBilling'
import { getStaffingInvoice } from '../../services/staffing/staffingService'
import { printStaffingInvoice } from '../../lib/staffingInvoicePrint'
import { formatDateUS } from '../../lib/formatters'
import type { StaffingCompanyPaymentFormData } from '../../services/staffing/staffingService'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const STATUS_LABELS: Record<string, string> = { sent: 'Enviada', partial: 'Abonada', paid: 'Pagada' }

const props = defineProps<{
  businessId: string | null
  companyId: string
}>()

const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()

const billing = useBilling(toRef(props, 'businessId'), toRef(props, 'companyId'))

const statusClass = (status: string) => ({
  sent: 'bg-warning/10 text-warning',
  partial: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success',
}[status] ?? 'bg-bg-secondary text-text-muted')

const emptyForm = (): StaffingCompanyPaymentFormData => ({
  companyId: props.companyId,
  invoiceId: '',
  amount: 0,
  paymentMethod: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
})

const form = ref<StaffingCompanyPaymentFormData>(emptyForm())

const submitPayment = async () => {
  const ok = await billing.addPayment({ ...form.value, companyId: props.companyId })
  if (ok) form.value = emptyForm()
}

const handlePrint = async (invoiceId: string) => {
  const full = await getStaffingInvoice(invoiceId)
  printStaffingInvoice(full, businessStore.business?.name || 'Delta Work Force')
}
</script>
