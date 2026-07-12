<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { formatPayType } from '../../lib/formatters'
import { getEmployeeBalance, type EmployeeBalance } from '../../services/employeePaymentsService'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'payment-saved'])
const { formatUSD, formatVESInline, exchangeRate } = useCurrency()
const businessStore = useBusinessStore()

const ctx = reactive(props.paymentsCtx)

const toYmd = (d: Date) => d.toISOString().slice(0, 10)
const now = new Date()
const periodStart = ref(toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)))
const periodEnd = ref(toYmd(now))

const balance = ref<EmployeeBalance | null>(null)
const loadingBalance = ref(false)

const fetchBalance = async () => {
  const empId = ctx.paymentForm.employeeId
  if (!empId || !props.businessId) { balance.value = null; return }
  loadingBalance.value = true
  try {
    balance.value = await getEmployeeBalance(props.businessId, empId, periodStart.value || undefined, periodEnd.value || undefined)
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

const effectiveRate = computed(() => {
  if (balance.value?.employee_ves_rate && balance.value.employee_ves_rate > 0) {
    return balance.value.employee_ves_rate
  }
  return exchangeRate.value
})

const rateLabel = computed(() => {
  if (balance.value?.employee_ves_rate && balance.value.employee_ves_rate > 0) {
    return `tasa del empleado: ${balance.value.employee_ves_rate}`
  }
  return `tasa global: ${exchangeRate.value}`
})

const convertedAmount = computed(() => {
  const amount = ctx.paymentForm.amount
  if (!amount || amount <= 0) return ''
  if (ctx.paymentForm.currency === 'USD') {
    return `${formatVESInline(amount, effectiveRate.value)} Bs`
  }
  return `${formatUSD(amount / effectiveRate.value)}`
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

          <div v-if="loadingBalance" class="text-center text-sm text-text-muted py-3">Cargando balance...</div>

          <div v-else-if="balance" class="rounded-xl border border-border bg-bg-secondary/50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Tipo de pago</span>
              <span class="text-sm font-semibold text-text">{{ formatPayType(balance.pay_type, balance.base_salary, balance.pay_percentage) }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Devengado</span>
                <span class="font-semibold text-text">{{ formatUSD(balance.total_earned) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Pagado</span>
                <span class="font-medium text-success">{{ formatUSD(balance.total_paid) }}</span>
              </div>
              <div v-if="balance.total_consumed > 0" class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Consumos / Deducciones</span>
                <span class="font-medium text-warning">{{ formatUSD(balance.total_consumed) }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-border pt-2.5">
              <span class="text-sm font-semibold text-text">Pendiente por pagar</span>
              <span class="text-base font-bold" :class="balance.pending > 0 ? 'text-primary' : 'text-success'">
                {{ formatUSD(balance.pending) }}
              </span>
            </div>

            <button v-if="balance.pending > 0" type="button"
              @click="ctx.paymentForm.amount = balance.pending"
              class="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
              Pagar saldo pendiente ({{ formatUSD(balance.pending) }})
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-3 sm:col-span-1">
              <label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="ctx.paymentForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
              <p v-if="convertedAmount" class="mt-1 text-xs text-text-muted">
                {{ ctx.paymentForm.currency === 'USD' ? '≈' : '=' }} {{ convertedAmount }}
                <span class="text-text-muted/60">({{ rateLabel }})</span>
              </p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="ctx.paymentForm.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Método</label>
              <select v-model="ctx.paymentForm.paymentMethod"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="ctx.paymentForm.paymentDate" type="date" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="ctx.paymentForm.notes" type="text" placeholder="Ej: Comisión servicios, adelanto..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
          </div>

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
