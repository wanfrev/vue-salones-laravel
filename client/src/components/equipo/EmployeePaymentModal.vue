<script setup lang="ts">
import { ref } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { formatPayType } from '../../lib/formatters'
import { getEmployeeBalance, type EmployeeBalance } from '../../services/employeePaymentsService'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
}>()

const emit = defineEmits(['close', 'payment-saved'])
const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()
const selectedBalance = ref<EmployeeBalance | null>(null)

const toYmd = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const now = new Date()
const earningsStartDate = ref(toYmd(new Date(now.getFullYear(), now.getMonth(), 1)))
const earningsEndDate = ref(toYmd(now))

const onEmployeeChange = async () => {
  const empId = props.paymentsCtx.paymentForm.value.employeeId
  if (!empId || !props.businessId) { selectedBalance.value = null; return }
  try { selectedBalance.value = await getEmployeeBalance(props.businessId, empId, props.branchId, earningsStartDate.value || null, earningsEndDate.value || null) } catch { selectedBalance.value = null }
}

const handleSubmitPayment = async () => {
  if (props.paymentsCtx.editingPaymentId.value) {
    try { await props.paymentsCtx.handleUpdate(); emit('close'); emit('payment-saved') } catch { }
  } else {
    try { await props.paymentsCtx.handleSave(); emit('close'); emit('payment-saved') } catch { }
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="paymentsCtx.showPaymentModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ paymentsCtx.editingPaymentId.value ? 'Editar pago' : 'Registrar pago' }}</h2>
          <p class="text-sm text-text-muted">{{ paymentsCtx.editingPaymentId.value ? 'Modifica los datos del pago' : 'Registra un adelanto, sueldo o comisión pagada' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmitPayment">
          <div v-if="!paymentsCtx.editingPaymentId.value">
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado'
              }}</label>
            <select v-model="paymentsCtx.paymentForm.value.employeeId" required @change="onEmployeeChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase()
                }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}
              </option>
            </select>
          </div>

          <div v-if="!paymentsCtx.editingPaymentId.value" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios desde</label>
              <input v-model="earningsStartDate" type="date" @change="onEmployeeChange"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios hasta</label>
              <input v-model="earningsEndDate" type="date" @change="onEmployeeChange"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div v-if="selectedBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Tipo de
                pago</span><span class="font-medium text-text">{{ formatPayType(selectedBalance.payType,
                  selectedBalance.baseSalary, selectedBalance.payPercentage) }}</span></div>
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Generado en
                servicios</span><span class="font-medium text-success">{{ formatUSD(selectedBalance.totalEarned)
                }}</span></div>
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Pagado hasta
                ahora</span><span class="font-medium text-danger">{{ formatUSD(selectedBalance.totalPaid) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2"><span
                class="text-sm font-semibold text-text">Saldo pendiente</span><span class="text-base font-bold"
                :class="selectedBalance.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{
                  formatUSD(selectedBalance.pendingBalance) }}</span></div>
            <button v-if="selectedBalance.pendingBalance > 0" type="button"
              @click="paymentsCtx.paymentForm.value.amount = selectedBalance.pendingBalance"
              class="w-full mt-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-primary/10">Pagar
              saldo pendiente</button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div><label class="mb-1 block text-sm font-medium text-text">Monto</label><input
                v-model.number="paymentsCtx.paymentForm.value.amount" type="number" min="0.01" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required /></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Moneda</label><select
                v-model="paymentsCtx.paymentForm.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Método</label><select
                v-model="paymentsCtx.paymentForm.value.method"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select></div>
          </div>
          <div><label class="mb-1 block text-sm font-medium text-text">Fecha</label><input
              v-model="paymentsCtx.paymentForm.value.date" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required /></div>
          <div><label class="mb-1 block text-sm font-medium text-text">Notas</label><input
              v-model="paymentsCtx.paymentForm.value.notes" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Comisión servicios, adelanto..." /></div>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit"
              :disabled="paymentsCtx.createMutation.isPending.value || paymentsCtx.updateMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{{
                paymentsCtx.createMutation.isPending.value || paymentsCtx.updateMutation.isPending.value ? 'Guardando...'
                  : (paymentsCtx.editingPaymentId.value ? 'Actualizar pago' : 'Guardar pago') }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
