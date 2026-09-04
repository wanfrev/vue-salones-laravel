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
             <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">{{ businessStore.terminology.client }}</th>
            <th class="px-4 py-2.5 text-right font-medium text-text-muted text-xs">{{ activeTab === 'pending' ? 'Saldo / Total' : 'Monto' }}</th>
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
            <td class="px-4 py-2.5 text-right">
              <template v-if="activeTab === 'pending'">
                <div class="font-medium text-text">{{ formatUSD(c.remaining) }}</div>
                <div v-if="c.status === 'partial'" class="text-xs text-text-muted">
                  de {{ formatUSD(c.amount) }} · abonado {{ formatUSD(c.paid_amount) }}
                </div>
              </template>
              <template v-else>
                <div class="font-medium text-text">{{ formatUSD(c.amount) }}</div>
              </template>
            </td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ formatDate(c.created_at) }}</td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ c.paid_at ? formatDate(c.paid_at) : '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <div v-if="activeTab === 'pending'" class="flex items-center justify-center gap-1.5">
                <button
                  @click="openPay(c)"
                  class="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-theme hover:bg-success/20"
                >
                  Registrar abono
                </button>
                <button
                  v-if="Number(c.paid_amount) === 0"
                  @click="handleDelete(c)"
                  :disabled="deleteMutation.isPending.value"
                  title="Eliminar crédito"
                  class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div v-else class="flex items-center justify-center gap-2">
                <span class="text-xs text-text-secondary">{{ formatMethod(c.paid_method || '') }}</span>
                <button
                  @click="handleDelete(c)"
                  :disabled="deleteMutation.isPending.value"
                  title="Eliminar crédito"
                  class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeModal">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Registrar abono</h2>
          <p class="text-sm text-text-muted">{{ selectedCredit?.client_name }}</p>
        </div>

        <div v-if="selectedCredit" class="mb-4 rounded-lg bg-bg-secondary/60 px-3 py-2.5 text-xs">
          <div class="flex justify-between text-text-secondary">
            <span>Total de la venta</span>
            <span class="font-medium text-text">{{ formatUSD(selectedCredit.amount) }}</span>
          </div>
          <div v-if="selectedCredit.paid_amount > 0" class="flex justify-between text-text-secondary mt-1">
            <span>Ya abonado</span>
            <span class="font-medium text-success">{{ formatUSD(selectedCredit.paid_amount) }}</span>
          </div>
          <div class="flex justify-between text-text-secondary mt-1 pt-1 border-t border-border/60">
            <span>Saldo pendiente</span>
            <span class="font-semibold text-warning">{{ formatUSD(selectedCredit.remaining) }}</span>
          </div>
        </div>

        <div v-if="paymentHistory.length > 0" class="mb-4">
          <p class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Abonos anteriores</p>
          <div class="max-h-24 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
            <div v-for="p in paymentHistory" :key="p.id" class="flex justify-between text-xs text-text-secondary">
              <span>{{ formatDate(p.created_at) }} · {{ formatMethod(p.method) }}</span>
              <span class="font-medium text-text">{{ formatUSD(p.amount) }}</span>
            </div>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleConfirm">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="cr-amount">Monto a abonar</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input id="cr-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" :max="selectedCredit?.remaining"
                class="w-full rounded-lg border border-border bg-surface py-2 pl-7 pr-3 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="button" class="mt-1 text-xs font-medium text-primary hover:text-primary-hover" @click="fillFullAmount">
              Pagar el saldo completo ({{ formatUSD(selectedCredit?.remaining ?? 0) }})
            </button>
          </div>
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
            Este monto se reconocerá como ingreso en Finanzas el día de hoy.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closeModal">Cancelar</button>
            <button type="submit" :disabled="payMutation.isPending.value || !form.amount || form.amount <= 0"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ payMutation.isPending.value ? 'Guardando...' : 'Confirmar abono' }}
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
import { useBusinessStore } from '../../store/business'
import type { Credit } from '../../types/database'

const { formatUSD, exchangeRate } = useCurrency()
const businessStore = useBusinessStore()
const { pendingCredits, paidCredits, pendingTotal, isLoading, payMutation, usePaymentsForCredit, deleteMutation } = useCredits()

const tabs: { key: 'pending' | 'paid'; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagados' },
]
const activeTab = ref<'pending' | 'paid'>('pending')
const visibleCredits = computed(() => activeTab.value === 'pending' ? pendingCredits.value : paidCredits.value)

const showModal = ref(false)
const selectedCredit = ref<Credit | null>(null)
const form = ref<{ amount: number; method: string; currency: 'USD' | 'VES'; exchangeRate: number }>({
  amount: 0,
  method: 'cash',
  currency: 'USD',
  exchangeRate: exchangeRate.value || 1,
})

const selectedCreditId = ref<string | null>(null)
const { data: paymentHistoryData } = usePaymentsForCredit(() => selectedCreditId.value)
const paymentHistory = computed(() => paymentHistoryData.value ?? [])

const openPay = (credit: Credit) => {
  selectedCredit.value = credit
  selectedCreditId.value = credit.id
  form.value = { amount: credit.remaining, method: 'cash', currency: 'USD', exchangeRate: exchangeRate.value || 1 }
  showModal.value = true
}

const fillFullAmount = () => {
  if (selectedCredit.value) form.value.amount = selectedCredit.value.remaining
}

const closeModal = () => {
  showModal.value = false
  selectedCredit.value = null
  selectedCreditId.value = null
}

const handleDelete = async (credit: Credit) => {
  const message = Number(credit.paid_amount) > 0
    ? `¿Eliminar el crédito de ${credit.client_name}? El ingreso ya cobrado (${formatUSD(credit.paid_amount)}) se queda en Finanzas — solo se borra el registro del crédito.`
    : `¿Eliminar el crédito de ${credit.client_name} por ${formatUSD(credit.amount)}? Esta acción no se puede deshacer.`
  if (!window.confirm(message)) return
  try {
    await deleteMutation.mutateAsync(credit.id)
  } catch { /* handled by composable */ }
}

const handleConfirm = async () => {
  if (!selectedCredit.value || !form.value.amount || form.value.amount <= 0) return
  try {
    await payMutation.mutateAsync({
      id: selectedCredit.value.id,
      amount: form.value.amount,
      method: form.value.method,
      currency: form.value.currency,
      exchangeRate: form.value.currency === 'VES' ? form.value.exchangeRate : undefined,
    })
    closeModal()
  } catch { /* handled by composable */ }
}
</script>
