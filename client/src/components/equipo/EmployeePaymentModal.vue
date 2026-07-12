<script setup lang="ts">
import { reactive } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { formatPayType } from '../../lib/formatters'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'payment-saved'])
const { formatUSD, formatVESInline } = useCurrency()
const businessStore = useBusinessStore()

const ctx = reactive(props.paymentsCtx)

const toYmd = (d: Date) => d.toISOString().slice(0, 10)
const now = new Date()
const periodStart = ref(toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)))
const periodEnd = ref(toYmd(now))

import { ref, watch } from 'vue'
import { getEmployeeBalance, type EmployeeBalance } from '../../services/employeePaymentsService'

const balance = ref<EmployeeBalance | null>(null)
const loadingBalance = ref(false)

const fetchBalance = async () => {
  const empId = ctx.paymentForm.employeeId
  if (!empId || !props.businessId) { balance.value = null; return }
  loadingBalance.value = true
  try {
    balance.value = await getEmployeeBalance(props.businessId, empId, props.branchId, periodStart.value || undefined, periodEnd.value || undefined)
  } catch {
    balance.value = null
  } finally {
    loadingBalance.value = false
  }
}

watch(() => ctx.paymentForm.employeeId, fetchBalance)
watch([periodStart, periodEnd], fetchBalance)
watch(ctx.showPaymentModal, (v) => {
  if (v) { balance.value = null; fetchBalance() }
})

const handleSubmit = async () => {
  try { await ctx.handleSavePayment(); emit('payment-saved'); emit('close') } catch { }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ctx.showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ ctx.editingPaymentId ? 'Editar pago' : 'Registrar pago' }}</h2>
          <p class="text-sm text-text-muted">{{ ctx.editingPaymentId ? 'Modifica los datos del pago' : 'Registra un adelanto, sueldo o comisión pagada' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="!ctx.editingPaymentId">
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="ctx.paymentForm.employeeId" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name ?? emp.full_name }}</option>
            </select>
          </div>

          <div v-if="!ctx.editingPaymentId" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios desde</label>
              <input v-model="periodStart" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios hasta</label>
              <input v-model="periodEnd" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
            </div>
          </div>

          <div v-if="loadingBalance" class="text-center text-sm text-text-muted py-2">Cargando balance...</div>

          <div v-else-if="balance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Tipo de pago</span>
              <span class="font-medium text-text">{{ formatPayType(balance.payType, balance.baseSalary, balance.payPercentage) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Generado en servicios</span>
              <span class="font-medium text-success">{{ formatUSD(balance.totalEarned) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Pagado hasta ahora</span>
              <span class="font-medium text-danger">{{ formatUSD(balance.totalPaid) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2">
              <span class="text-sm font-semibold text-text">Saldo pendiente</span>
              <span class="text-base font-bold" :class="balance.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">
                {{ formatUSD(balance.pendingBalance) }}
              </span>
            </div>
            <button v-if="balance.pendingBalance > 0" type="button"
              @click="ctx.paymentForm.amount = balance.pendingBalance"
              class="w-full mt-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-primary/10">
              Pagar saldo pendiente
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div><label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="ctx.paymentForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="ctx.paymentForm.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Método</label>
              <select v-model="ctx.paymentForm.paymentMethod"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select></div>
          </div>
          <div><label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="ctx.paymentForm.paymentDate" type="date" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>
          <div><label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="ctx.paymentForm.notes" type="text" placeholder="Ej: Comisión servicios, adelanto..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>

          <div v-if="ctx.saveError" class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{{ ctx.saveError }}</div>

          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit" :disabled="ctx.isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.isSaving ? 'Guardando...' : (ctx.editingPaymentId ? 'Actualizar pago' : 'Guardar pago') }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>