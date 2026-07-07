<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-text">Abonos a proveedores</h3>
        <p class="text-xs text-text-muted mt-0.5">Pagos realizados a proveedores</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="ctx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Abono
        </button>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-10">
      <svg class="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="ctx.payments.value.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
      No hay abonos registrados aún.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">Proveedor</th>
            <th class="px-4 py-2.5 text-right font-medium text-text-muted text-xs">Monto</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden sm:table-cell">Método</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden md:table-cell">Fecha</th>
            <th class="px-4 py-2.5 text-center font-medium text-text-muted text-xs">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="p in ctx.payments.value" :key="p.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-2.5 font-medium text-text">{{ p.supplierName }}</td>
            <td class="px-4 py-2.5 text-right">
              <div class="font-medium text-text">
                {{ p.currency === 'VES' ? formatVESEs(p.originalAmount) : formatUSD(p.amount) }}
              </div>
              <div class="text-xs text-text-muted">
                {{ p.currency === 'VES' ? formatUSD(p.amount) : formatVESInline(p.amount, p.exchangeRateUsed) + ' Bs' }}
              </div>
            </td>
            <td class="px-4 py-2.5 text-text-secondary hidden sm:table-cell">{{ formatMethod(p.paymentMethod) }}</td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ formatDate(p.paymentDate) }}</td>
            <td class="px-4 py-2.5 text-center">
              <button @click="ctx.handleDelete(p.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="ctx.showModal.value"
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
            <select id="sp-supplier" v-model="ctx.form.value.supplierId"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" required>
              <option value="" disabled>Selecciona un proveedor</option>
              <option v-for="s in ctx.supplierOptions.value" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <p v-if="ctx.form.value.supplierId && ctx.supplierMap.value[ctx.form.value.supplierId]" class="mt-1.5 text-xs text-text-muted">
              Deuda total: <span class="font-medium text-text">{{ formatUSD(ctx.supplierMap.value[ctx.form.value.supplierId].totalDebt) }}</span>
              <span class="mx-1">|</span>
              Pendiente: <span class="font-medium" :class="ctx.selectedSupplierPendingBalance.value > 0 ? 'text-warning' : 'text-success'">{{ formatUSD(ctx.selectedSupplierPendingBalance.value) }}</span>
              <template v-if="ctx.selectedSupplierPendingAfter.value > 0 && ctx.form.value.amount > 0">
                <span class="mx-1">|</span>
                Restaría: <span class="font-medium text-text-muted">{{ formatUSD(ctx.selectedSupplierPendingAfter.value) }}</span>
              </template>
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-amount">Monto</label>
              <input id="sp-amount" v-model.number="ctx.form.value.amount" type="number" min="0.01" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-currency">Moneda</label>
              <select id="sp-currency" v-model="ctx.form.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sp-method">Método de pago</label>
              <select id="sp-method" v-model="ctx.form.value.paymentMethod"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
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
              <input id="sp-date" v-model="ctx.form.value.paymentDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" required />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sp-notes">Notas</label>
            <input id="sp-notes" v-model="ctx.form.value.notes" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional" />
          </div>
          <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="ctx.closeModal">Cancelar</button>
            <button type="submit" :disabled="ctx.createMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.createMutation.isPending.value ? 'Registrando...' : 'Registrar abono' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { formatMethod, formatDate } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  ctx: ReturnType<typeof import('../../composables/suppliers/useSuppliers').useSupplierPayments>
}>()

const { formatUSD, formatVESEs, formatVESInline } = useCurrency()

const handleSave = async () => {
  try {
    await props.ctx.handleSave()
  } catch { /* handled by composable */ }
}
</script>
