<script setup lang="ts">
import { reactive } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'payment-saved'])
const { formatUSD } = useCurrency()
const businessStore = useBusinessStore()

const ctx = reactive(props.paymentsCtx)

const handleSubmit = async () => {
  try { await ctx.handleSavePayment(); emit('payment-saved'); emit('close') } catch { }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ctx.showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
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
