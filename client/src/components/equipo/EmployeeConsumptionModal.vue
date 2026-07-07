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

const emit = defineEmits(['close', 'consumption-saved'])
const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()
const consumptionBalance = ref<EmployeeBalance | null>(null)

const onEmployeeChange = async () => {
  const empId = props.paymentsCtx.consumptionForm.value.employeeId
  if (!empId || !props.businessId) { consumptionBalance.value = null; return }
  try { consumptionBalance.value = await getEmployeeBalance(props.businessId, empId, props.branchId) } catch { consumptionBalance.value = null }
}

const handleSubmit = async () => {
  try { await props.paymentsCtx.handleSaveConsumption(); emit('close'); emit('consumption-saved') } catch {}
}
</script>

<template>
  <Teleport to="body">
    <div v-if="paymentsCtx.showConsumptionModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Debitar consumo</h2>
          <p class="text-sm text-text-muted">Registra un servicio o producto consumido por el empleado. Se descontará de su saldo.</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.consumptionForm.value.employeeId" required @change="onEmployeeChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>

          <div v-if="consumptionBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Tipo de pago</span><span class="font-medium text-text">{{ formatPayType(consumptionBalance.payType, consumptionBalance.baseSalary, consumptionBalance.payPercentage) }}</span></div>
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Generado en servicios</span><span class="font-medium text-success">{{ formatUSD(consumptionBalance.totalEarned) }}</span></div>
            <div class="flex items-center justify-between text-sm"><span class="text-text-muted">Pagado + Consumido</span><span class="font-medium text-danger">{{ formatUSD(consumptionBalance.totalPaid) }}</span></div>
            <div class="flex items-center justify-between border-t border-border pt-2"><span class="text-sm font-semibold text-text">Saldo pendiente</span><span class="text-base font-bold" :class="consumptionBalance.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(consumptionBalance.pendingBalance) }}</span></div>
          </div>

          <div><label class="mb-1 block text-sm font-medium text-text">Servicio / Producto consumido</label><input v-model="paymentsCtx.consumptionForm.value.concept" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" placeholder="Ej: Corte de cabello, Shampoo..." required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="mb-1 block text-sm font-medium text-text">Monto</label><input v-model.number="paymentsCtx.consumptionForm.value.amount" type="number" min="0.01" step="0.01" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" placeholder="0.00" required /></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Moneda</label><select v-model="paymentsCtx.consumptionForm.value.currency" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"><option value="USD">USD $</option><option value="VES">Bs</option></select></div>
          </div>
          <div><label class="mb-1 block text-sm font-medium text-text">Fecha</label><input v-model="paymentsCtx.consumptionForm.value.date" type="date" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" required /></div>
          <p v-if="paymentsCtx.consumptionError.value" class="text-sm text-danger">{{ paymentsCtx.consumptionError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary" @click="emit('close')">Cancelar</button>
            <button type="submit" :disabled="paymentsCtx.consumeMutation.isPending.value" class="inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-60">{{ paymentsCtx.consumeMutation.isPending.value ? 'Guardando...' : 'Debitar consumo' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
