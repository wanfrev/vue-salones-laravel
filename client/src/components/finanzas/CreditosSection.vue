<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text">Créditos</h3>
        <p class="mt-0.5 text-xs text-text-muted">Ventas a crédito pendientes de cobro</p>
      </div>
      <div class="text-right" v-if="pendingTotal > 0">
        <p class="text-xs text-text-muted">Pendiente por cobrar</p>
        <p class="text-sm font-semibold tabular-nums text-warning">{{ formatUSD(pendingTotal) }}</p>
      </div>
    </div>

    <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Créditos">
      <button
        v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="activeTab === t.key"
        class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === t.key ? 'text-primary' : 'text-text-secondary hover:text-text'"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span v-if="activeTab === t.key" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
      </button>
    </div>

    <div v-if="isLoading" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-3 w-32 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-20 animate-pulse rounded bg-bg-secondary"></div>
      </div>
    </div>

    <div v-else-if="visibleCredits.length === 0" class="px-4 py-10 text-center text-sm text-text-muted">
      {{ activeTab === 'pending' ? 'No hay créditos pendientes.' : 'No hay créditos pagados aún.' }}
    </div>

    <div v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
        <span :class="headClass">{{ businessStore.terminology.client }}</span>
        <span :class="[headClass, 'text-right']">{{ activeTab === 'pending' ? 'Saldo / Total' : 'Monto' }}</span>
        <span :class="headClass">Fecha venta</span>
        <span :class="headClass">{{ activeTab === 'paid' ? 'Fecha pago' : '' }}</span>
        <span :class="[headClass, 'text-center']">{{ activeTab === 'pending' ? 'Acción' : 'Método' }}</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="c in visibleCredits" :key="c.id" data-testid="credit-row"
          :class="[gridClass, 'px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
          <div class="min-w-0">
            <div class="font-medium text-text">{{ c.client_name }}</div>
            <div v-if="c.client_phone" class="text-xs text-text-muted">{{ c.client_phone }}</div>
          </div>

          <div class="mt-1 md:mt-0 md:text-right">
            <template v-if="activeTab === 'pending'">
              <div class="font-medium tabular-nums text-text">{{ formatUSD(c.remaining) }}</div>
              <div v-if="c.status === 'partial'" class="text-xs text-text-muted">
                de {{ formatUSD(c.amount) }} · abonado {{ formatUSD(c.paid_amount) }}
              </div>
            </template>
            <template v-else>
              <div class="font-medium tabular-nums text-text">{{ formatUSD(c.amount) }}</div>
            </template>
            <!-- Pago mixto: lo que se pagó en el momento de la venta (no es un abono de este crédito) -->
            <div v-if="paidAtSale(c) > 0" data-testid="credit-sale-note" class="text-xs text-text-muted">
              Venta {{ formatUSD(c.sale_total ?? c.amount) }} · pagó {{ formatUSD(paidAtSale(c)) }} al vender
            </div>
          </div>

          <div class="hidden text-text-secondary md:block">{{ formatDate(c.created_at) }}</div>
          <div class="hidden text-text-secondary md:block">{{ c.paid_at ? formatDate(c.paid_at) : '—' }}</div>

          <div class="mt-2 md:mt-0">
            <div v-if="activeTab === 'pending'" class="flex items-center gap-1.5 md:justify-center">
              <button
                @click="openPay(c)"
                class="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-success ring-1 ring-success/30 transition-theme hover:bg-success/10"
              >
                Registrar abono
              </button>
              <button
                v-if="Number(c.paid_amount) === 0"
                @click="handleDelete(c)"
                :disabled="deleteMutation.isPending.value"
                title="Eliminar crédito"
                aria-label="Eliminar crédito"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <div v-else class="flex items-center gap-2 md:justify-center">
              <span class="text-xs text-text-secondary">{{ formatMethod(c.paid_method || '') }}</span>
              <button
                @click="handleDelete(c)"
                :disabled="deleteMutation.isPending.value"
                title="Eliminar crédito"
                aria-label="Eliminar crédito"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </li>
      </ul>
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
            <span class="font-medium text-text">{{ formatUSD(selectedCredit.sale_total ?? selectedCredit.amount) }}</span>
          </div>
          <div v-if="paidAtSale(selectedCredit) > 0" class="flex justify-between text-text-secondary mt-1" data-testid="credit-paid-at-sale">
            <span>Pagado al vender</span>
            <span class="font-medium text-success">{{ formatUSD(paidAtSale(selectedCredit)) }}</span>
          </div>
          <div v-if="selectedCredit.paid_amount > 0" class="flex justify-between text-text-secondary mt-1">
            <span>{{ paidAtSale(selectedCredit) > 0 ? 'Abonado después' : 'Ya abonado' }}</span>
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
          <div v-if="BANK_METHODS.includes(form.method) && banks.length > 0">
            <label class="mb-1 block text-sm font-medium text-text" for="cr-bank">Banco (opcional)</label>
            <select id="cr-bank" v-model="form.bankId"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option :value="null">-- Selecciona un banco --</option>
              <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div v-if="canBackdate">
            <label class="mb-1 block text-sm font-medium text-text" for="cr-date">Fecha del abono</label>
            <div class="flex items-center gap-2">
              <input id="cr-date" v-model="form.paidDate" type="date" :max="todayIso"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              <button v-if="form.paidDate" type="button"
                class="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="form.paidDate = ''">Hoy</button>
            </div>
          </div>
          <div v-if="form.currency === 'VES'">
            <label class="mb-1 block text-sm font-medium text-text" for="cr-rate">Tasa de cambio</label>
            <input id="cr-rate" v-model.number="form.exchangeRate" type="number" min="0.01" step="0.01"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <p class="text-xs text-text-muted">
            {{ form.paidDate && canBackdate
              ? `Este monto se reconocerá como ingreso en Finanzas el ${form.paidDate}, no hoy.`
              : 'Este monto se reconocerá como ingreso en Finanzas el día de hoy.' }}
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
import { useBanks } from '../../composables/finanzas/useBanks'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import type { Credit } from '../../types/database'

const props = defineProps<{
  periodDates?: { start: string; end: string }
}>()

const { formatUSD, exchangeRate } = useCurrency()
const businessStore = useBusinessStore()
const { pendingCredits, paidCredits, pendingTotal, isLoading, payMutation, usePaymentsForCredit, deleteMutation } = useCredits(computed(() => props.periodDates))

// Cliente · Saldo/Total · Fecha venta · Fecha pago · Acción/Método (última columna de ancho fijo).
const gridClass = 'md:grid md:grid-cols-[minmax(0,1.4fr)_9rem_6rem_6rem_12rem] md:items-center md:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

const tabs: { key: 'pending' | 'paid'; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagados' },
]
const activeTab = ref<'pending' | 'paid'>('pending')
const visibleCredits = computed(() => activeTab.value === 'pending' ? pendingCredits.value : paidCredits.value)

// Lo pagado en el momento de la venta (parte no crédito de un pago mixto); el servidor lo manda ya calculado.
const paidAtSale = (c: Credit) => Number(c.paid_at_sale ?? 0)

const showModal = ref(false)
const selectedCredit = ref<Credit | null>(null)
const { banks } = useBanks()
const authStore = useAuthStore()
const BANK_METHODS = ['pago_movil', 'transfer', 'punto_venta']
// Misma regla que "Fecha del cobro" en el POS (toggle "Permitir cobrar con otra fecha" +
// admin/encargado); el servidor la vuelve a exigir en CreditController::pay.
const canBackdate = computed(() =>
  !!businessStore.features.pos_backdate_enabled &&
  ['admin', 'superadmin', 'encargado'].includes(authStore.role ?? ''),
)
const todayIso = computed(() => new Date().toLocaleDateString('en-CA'))
const form = ref<{ amount: number; method: string; currency: 'USD' | 'VES'; exchangeRate: number; bankId: string | null; paidDate: string }>({
  amount: 0,
  method: 'cash',
  currency: 'USD',
  exchangeRate: exchangeRate.value || 1,
  bankId: null,
  paidDate: '',
})

const selectedCreditId = ref<string | null>(null)
const { data: paymentHistoryData } = usePaymentsForCredit(() => selectedCreditId.value)
const paymentHistory = computed(() => paymentHistoryData.value ?? [])

const openPay = (credit: Credit) => {
  selectedCredit.value = credit
  selectedCreditId.value = credit.id
  form.value = { amount: credit.remaining, method: 'cash', currency: 'USD', exchangeRate: exchangeRate.value || 1, bankId: null, paidDate: '' }
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
      bankId: BANK_METHODS.includes(form.value.method) ? form.value.bankId : null,
      paidDate: canBackdate.value ? form.value.paidDate : null,
    })
    closeModal()
  } catch { /* handled by composable */ }
}
</script>
