<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-secondary px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-text">Créditos</h3>
        <p class="text-xs text-text-muted mt-0.5">Ventas a crédito pendientes de cobro</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right" v-if="pendingTotal > 0">
          <p class="text-xs text-text-muted">Pendiente por cobrar</p>
          <p class="text-sm font-semibold text-warning">{{ formatUSD(pendingTotal) }}</p>
        </div>
        <div class="flex rounded-lg border border-border bg-surface p-0.5">
          <button
            v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
            :class="['rounded-md px-3 py-1 text-xs font-medium transition-all', activeTab === t.key ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:text-text']"
          >{{ t.label }}</button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-10">
      <svg class="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="visibleCredits.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
      {{ activeTab === 'pending' ? 'No hay créditos pendientes.' : 'No hay créditos pagados aún.' }}
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">Cliente</th>
            <th class="px-4 py-2.5 text-right font-medium text-text-muted text-xs">Monto</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden md:table-cell">Fecha venta</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden md:table-cell">{{ activeTab === 'paid' ? 'Fecha pago' : '' }}</th>
            <th class="px-4 py-2.5 text-center font-medium text-text-muted text-xs">{{ activeTab === 'pending' ? 'Acción' : 'Método' }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="c in visibleCredits" :key="c.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-2.5">
              <div class="font-medium text-text">{{ c.client_name }}</div>
              <div v-if="c.client_phone" class="text-xs text-text-muted">{{ c.client_phone }}</div>
            </td>
            <td class="px-4 py-2.5 text-right font-medium text-text">{{ formatUSD(c.amount) }}</td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ formatDate(c.created_at) }}</td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ c.paid_at ? formatDate(c.paid_at) : '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <button
                v-if="activeTab === 'pending'"
                @click="openMarkPaid(c)"
                class="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-theme hover:bg-success/20"
              >
                Marcar pagado
              </button>
              <span v-else class="text-xs text-text-secondary">{{ formatMethod(c.paid_method || '') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeModal">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">Marcar crédito como pagado</h2>
          <p class="text-sm text-text-muted">{{ selectedCredit?.client_name }} · {{ formatUSD(selectedCredit?.amount ?? 0) }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleConfirm">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cr-method">Método de pago</label>
              <select id="cr-method" v-model="form.method"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="cash">Efectivo ($)</option>
                <option value="cash_ves">Efectivo (Bs)</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
                <option value="punto_venta">Punto de Venta (Bs)</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cr-currency">Moneda</label>
              <select id="cr-currency" v-model="form.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div v-if="form.currency === 'VES'">
            <label class="mb-1 block text-sm font-medium text-text" for="cr-rate">Tasa de cambio</label>
            <input id="cr-rate" v-model.number="form.exchangeRate" type="number" min="0.01" step="0.01"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <p class="text-xs text-text-muted">
            Al confirmar, este monto se reconocerá como ingreso y se incluirá en el cálculo de ganancia.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closeModal">Cancelar</button>
            <button type="submit" :disabled="markPaidMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ markPaidMutation.isPending.value ? 'Guardando...' : 'Confirmar pago' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatMethod, formatDate } from '../../lib/formatters'
import { useCredits } from '../../composables/finanzas/useCredits'
import type { Credit } from '../../types/database'

const { formatUSD, exchangeRate } = useCurrency()
const { pendingCredits, paidCredits, pendingTotal, isLoading, markPaidMutation } = useCredits()

const tabs: { key: 'pending' | 'paid'; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagados' },
]
const activeTab = ref<'pending' | 'paid'>('pending')
const visibleCredits = computed(() => activeTab.value === 'pending' ? pendingCredits.value : paidCredits.value)

const showModal = ref(false)
const selectedCredit = ref<Credit | null>(null)
const form = ref<{ method: string; currency: 'USD' | 'VES'; exchangeRate: number }>({
  method: 'cash',
  currency: 'USD',
  exchangeRate: exchangeRate.value || 1,
})

const openMarkPaid = (credit: Credit) => {
  selectedCredit.value = credit
  form.value = { method: 'cash', currency: 'USD', exchangeRate: exchangeRate.value || 1 }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCredit.value = null
}

const handleConfirm = async () => {
  if (!selectedCredit.value) return
  try {
    await markPaidMutation.mutateAsync({
      id: selectedCredit.value.id,
      method: form.value.method,
      currency: form.value.currency,
      exchangeRate: form.value.currency === 'VES' ? form.value.exchangeRate : undefined,
    })
    closeModal()
  } catch { /* handled by composable */ }
}
</script>
