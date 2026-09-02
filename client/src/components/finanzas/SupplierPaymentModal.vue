<template>
  <Teleport to="body">
    <div
      v-if="ctx.showModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="ctx.closeModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">Registrar abono</h2>
          <p class="text-sm text-text-muted">Registra un pago a un proveedor</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sp-supplier">Proveedor</label>
            <select
              id="sp-supplier"
              v-model="ctx.form.value.supplierId"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required
            >
              <option value="" disabled>Selecciona un proveedor</option>
              <option v-for="s in ctx.supplierOptions.value" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <p
              v-if="ctx.form.value.supplierId && ctx.supplierMap.value[ctx.form.value.supplierId]"
              class="mt-1.5 text-xs text-text-muted"
            >
              Deuda total: <span class="font-medium text-text">{{
                formatUSD(ctx.supplierMap.value[ctx.form.value.supplierId].totalDebt)
              }}</span>
              <span class="mx-1">|</span>
              Pendiente: <span
                class="font-medium"
                :class="ctx.selectedSupplierPendingBalance.value > 0 ? 'text-warning' : 'text-success'"
              >{{ formatUSD(ctx.selectedSupplierPendingBalance.value) }}</span>
              <template v-if="ctx.selectedSupplierPendingAfter.value > 0 && ctx.form.value.amount > 0">
                <span class="mx-1">|</span>
                Restaría: <span class="font-medium text-text-muted">{{
                  formatUSD(ctx.selectedSupplierPendingAfter.value)
                }}</span>
              </template>
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-amount">Monto</label>
              <input
                id="sp-amount"
                v-model.number="ctx.form.value.amount"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-currency">Moneda</label>
              <select
                id="sp-currency"
                v-model="ctx.form.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-method">Método de pago</label>
              <select
                id="sp-method"
                v-model="ctx.form.value.paymentMethod"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-date">Fecha</label>
              <input
                id="sp-date"
                v-model="ctx.form.value.paymentDate"
                type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sp-notes">Notas</label>
            <input
              id="sp-notes"
              v-model="ctx.form.value.notes"
              type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional"
            />
          </div>
          <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="ctx.closeModal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="ctx.createMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ ctx.createMutation.isPending.value ? 'Registrando...' : 'Registrar abono' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  ctx: ReturnType<typeof import('../../composables/suppliers/useSuppliers').useSupplierPayments>
}>()

const { formatUSD } = useCurrency()

const handleSave = async () => {
  try {
    await props.ctx.handleSave()
  } catch {
    /* handled by composable */
  }
}
</script>
