<script setup lang="ts">
import { reactive } from 'vue'
import { useBusinessStore } from '../../store/business'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'consumption-saved'])
const businessStore = useBusinessStore()
const ctx = reactive(props.paymentsCtx)

const handleSubmit = async () => {
  try { await ctx.handleSaveConsumption(); emit('consumption-saved'); emit('close') } catch { }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ctx.showConsumptionModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Debitar consumo</h2>
          <p class="text-sm text-text-muted">Registra productos o servicios consumidos por el empleado</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="ctx.consumptionForm.employeeId" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name ?? emp.full_name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Concepto</label>
            <input v-model="ctx.consumptionForm.concept" type="text" required
              placeholder="Ej: Productos de mostrador, shampoo..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="ctx.consumptionForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>
            <div><label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="ctx.consumptionForm.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select></div>
          </div>
          <div><label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="ctx.consumptionForm.paymentDate" type="date" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>
          <div><label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="ctx.consumptionForm.notes" type="text" placeholder="Opcional..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" /></div>

          <div v-if="ctx.saveError" class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{{ ctx.saveError }}</div>

          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit" :disabled="ctx.isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.isSaving ? 'Guardando...' : 'Debitar consumo' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
