<template>
  <div class="rounded-xl border border-border bg-surface p-4 lg:flex lg:flex-col lg:h-full lg:min-h-0">
    <h3 class="text-base font-semibold text-text mb-4 shrink-0">Resumen de cobro</h3>

    <template v-if="selectedAppointment || isRetailOnly">
      <div class="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
      <div class="rounded-lg bg-bg-secondary p-3">
        <template v-if="isRetailOnly && !selectedAppointment">
          <div class="flex items-center justify-between text-sm">
            <span class="text-text-muted">Cliente</span>
            <span class="font-medium text-text">{{ retailClientName || 'Venta Directa / Mostrador' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mt-1">
            <span class="text-text-muted">Servicio</span>
            <span class="font-medium text-text-muted">—</span>
          </div>
        </template>
        <template v-else-if="selectedAppointment">
          <div class="flex items-center justify-between text-sm mt-1">
            <span class="text-text-muted">Cliente</span>
            <span class="font-medium text-text">{{ selectedAppointment.client?.full_name || selectedAppointment.clients?.full_name || '—' }}</span>
          </div>
          <div v-if="selectedAppointment.appointment_date" class="flex items-center justify-between text-sm mt-1">
            <span class="text-text-muted">Fecha</span>
            <span class="font-medium text-text">{{ formatDate(selectedAppointment.appointment_date) }}</span>
          </div>
          <template v-if="selectedAppointment.members?.length">
            <div class="border-t border-border-subtle mt-2 pt-2 space-y-1">
              <div
                v-for="(m, i) in selectedAppointment.members"
                :key="i"
                class="flex items-center justify-between text-sm"
              >
                <div class="flex-1 min-w-0">
                  <span class="text-text truncate">{{ m.serviceName }}</span>
                  <span class="text-text-muted ml-1 text-xs">· {{ m.employeeName }}</span>
                </div>
                <span class="font-medium text-text text-xs shrink-0 ml-2 tabular-nums">${{ m.price }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="text-text-muted">Servicio</span>
              <span class="font-medium text-text">{{ (selectedAppointment.service?.name ?? selectedAppointment.services?.name) || '—' }}</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-1">
              <span class="text-text-muted">Empleado</span>
              <span class="font-medium text-text">{{ (selectedAppointment.employee_profile?.full_name ?? selectedAppointment.profiles?.full_name) || '—' }}</span>
            </div>
            <div v-if="selectedAppointment.assistant_employee_id" class="flex items-center justify-between text-sm mt-1">
              <span class="text-text-muted">Asistente</span>
              <span class="font-medium text-text">{{ (selectedAppointment.assistant_profile?.full_name) || '—' }} ({{ selectedAppointment.assistant_percentage ?? 0 }}%)</span>
            </div>
          </template>
        </template>
      </div>

      <div v-if="cart.length > 0" class="border-t border-border-subtle pt-3">
        <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Productos</h4>
        <div class="space-y-2">
          <div
            v-for="(item, idx) in cart"
            :key="item.productId"
            class="flex items-center justify-between gap-2 rounded-lg bg-bg-secondary px-3 py-2"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text truncate">{{ item.productName }}</p>
              <p class="text-xs text-text-muted">{{ formatDual(item.unitPrice) }} c/u</p>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="$emit('decrement-qty', idx)"
                class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-text-muted hover:bg-surface hover:text-text transition-theme"
              >
                −
              </button>
              <span class="w-6 text-center text-sm font-semibold text-text">{{ item.quantity }}</span>
              <button
                @click="$emit('increment-qty', idx)"
                class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-text-muted hover:bg-surface hover:text-text transition-theme"
              >
                +
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-text w-16 text-right">{{ formatDual(item.subtotal) }}</span>
              <button
                @click="$emit('remove-item', idx)"
                class="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-theme"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-border-subtle pt-3 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-text-muted">Subtotal servicios</span>
          <span class="font-medium text-text">{{ formatDual(servicePrice) }}</span>
        </div>
        <div v-if="productsTotal > 0" class="flex items-center justify-between text-sm">
          <span class="text-text-muted">Subtotal productos ({{ cartCount }})</span>
          <span class="font-medium text-text">{{ formatDual(productsTotal) }}</span>
        </div>
        <div v-if="!isRetailOnly" class="space-y-1.5 border-t border-border pt-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <label class="block text-sm font-medium text-text">Propina {{ tipAmount > 0 ? '(' + formatDual(tipAmount) + ')' : '' }}</label>
              <button
                v-if="tipParticipants.length > 1"
                type="button"
                @click="$emit('toggle-tip-adjust')"
                class="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
              >
                Ajustar por empleado
              </button>
            </div>
          </div>
          <input
            :value="tipAmount || ''"
            @input="$emit('update:tipAmount', Number(($event.target as HTMLInputElement).value) || 0)"
            type="number" min="0" step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary"
          />

          <div v-if="showTipAdjust && tipParticipants.length > 0" class="rounded-lg border border-border bg-bg-secondary/40 p-2.5 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-text">Distribución de propina</span>
              <button
                type="button"
                @click="$emit('set-equal-tip')"
                class="text-primary hover:text-primary-hover font-medium"
              >
                Repartir igual
              </button>
            </div>
            <div v-for="participant in tipParticipants" :key="participant.employeeId" class="grid grid-cols-[1fr_auto] items-center gap-2">
              <span class="text-xs text-text truncate">{{ participant.employeeName }}</span>
              <input
                :value="tipAllocations[participant.employeeId] ?? 0"
                @input="$emit('update:tip-allocation', participant.employeeId, Number(($event.target as HTMLInputElement).value) || 0)"
                type="number"
                min="0"
                step="0.01"
                class="w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs text-right text-text outline-none focus:border-primary"
              />
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-muted">Asignado</span>
              <span class="font-medium text-text">{{ formatDual(tipAllocatedTotal) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-muted">Restante</span>
              <span :class="Math.abs(tipRemaining) < 0.01 ? 'text-success font-medium' : 'text-warning font-medium'">
                {{ formatDual(tipRemaining) }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-border pt-2">
          <span class="text-base font-bold text-text">Total</span>
          <DualAmount :amount="grandTotal" orientation="stack" size="lg" primary-class="text-xl font-bold text-primary" />
        </div>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-medium text-text">Método de pago</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="pm in paymentMethods"
            :key="pm.value"
            @click="$emit('select-method', pm.value)"
            :class="[
              'rounded-lg border p-2 text-sm font-medium transition-theme text-center relative',
              paymentMethod === pm.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-secondary hover:bg-bg-secondary'
            ]"
          >
            {{ pm.label }}
            <span
              v-if="(pm as any).currency"
              class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              :class="(pm as any).currency === 'USD' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
            >{{ (pm as any).currency === 'USD' ? '$' : 'Bs' }}</span>
          </button>
        </div>
      </div>

      <div v-if="paymentMethod === 'other'" class="space-y-2">
        <label class="block text-sm font-medium text-text">Moneda</label>
        <div class="flex rounded-lg border border-border bg-bg-secondary/50 p-0.5">
          <button
            @click="$emit('update:otherCurrency', 'USD')"
            class="flex-1 rounded-md py-1.5 text-xs font-medium transition-theme"
            :class="otherCurrency === 'USD' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'"
          >USD ($)</button>
          <button
            @click="$emit('update:otherCurrency', 'VES')"
            class="flex-1 rounded-md py-1.5 text-xs font-medium transition-theme"
            :class="otherCurrency === 'VES' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'"
          >VES (Bs)</button>
        </div>
      </div>

      <div v-if="paymentMethod === 'mixed'" class="space-y-2 border-t border-border-subtle pt-3">
        <label class="block text-sm font-medium text-text">Distribución del pago</label>
        <div v-for="(split, idx) in paymentsBreakdown" :key="idx" class="flex items-center gap-2">
          <select
            v-model="split.method"
            class="flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none focus:border-primary"
          >
            <option v-for="m in mixedMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <select
            v-model="split.currency"
            class="w-16 rounded-lg border border-border bg-surface px-1 py-2 text-xs text-text outline-none focus:border-primary"
          >
            <option value="USD">USD</option>
            <option value="VES">Bs</option>
          </select>
          <div class="relative flex-1">
            <input
              v-model.number="split.inputAmount"
              type="number" step="0.01" min="0"
              class="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none placeholder:text-text-muted focus:border-primary"
            />
          </div>
          <button
            v-if="paymentsBreakdown.length > 1"
            @click="$emit('remove-split', idx)"
            class="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex items-center justify-between text-xs">
          <button @click="$emit('add-split')" class="text-primary hover:text-primary-hover transition-theme font-medium">
            + Agregar método
          </button>
          <span :class="splitRemaining === 0 ? 'text-success' : 'text-warning'">
            Restante: {{ formatDual(splitRemaining) }}
          </span>
        </div>
      </div>

      <textarea
        :value="notes"
        @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Notas del pago (opcional)"
        rows="2"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary"
      ></textarea>
      </div>

      <div class="pt-3 shrink-0 border-t border-border-subtle">
        <button
          @click="$emit('process-payment')"
          :disabled="isProcessing || !canPay"
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-text-inverse transition-theme hover:bg-primary-hover disabled:opacity-50"
        >
          <svg v-if="isProcessing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isProcessing ? 'Procesando...' : `Cobrar ${formatDual(grandTotal)}` }}
        </button>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center text-center text-sm text-text-muted">
      <div>
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary mb-3">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p>Selecciona una cita pendiente<br>o inicia una venta directa</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import { DualAmount } from '../common'
import { formatDate } from '../../lib/formatters'
import type { PaymentMethod } from '../../types/database'
import type { PaymentBreakdownItem, POSProductItem } from '../../types/pos'

interface TipParticipant {
  employeeId: string
  employeeName: string
}

defineProps<{
  selectedAppointment: any
  cart: POSProductItem[]
  servicePrice: number
  productsTotal: number
  cartCount: number
  grandTotal: number
  paymentMethod: PaymentMethod
  otherCurrency: 'USD' | 'VES'
  paymentMethods: { label: string; value: PaymentMethod }[]
  mixedMethods: { label: string; value: PaymentMethod }[]
  paymentsBreakdown: PaymentBreakdownItem[]
  splitRemaining: number
  isProcessing: boolean
  canPay: boolean
  notes: string
  tipAmount: number
  tipParticipants: TipParticipant[]
  tipAllocations: Record<string, number>
  tipAllocatedTotal: number
  tipRemaining: number
  showTipAdjust: boolean
  isRetailOnly?: boolean
  retailClientName?: string | null
}>()

defineEmits<{
  'select-method': [method: PaymentMethod]
  'update:otherCurrency': [currency: 'USD' | 'VES']
  'add-split': []
  'remove-split': [idx: number]
  'update:notes': [value: string]
  'update:tipAmount': [value: number]
  'toggle-tip-adjust': []
  'set-equal-tip': []
  'update:tip-allocation': [employeeId: string, value: number]
  'process-payment': []
  'increment-qty': [idx: number]
  'decrement-qty': [idx: number]
  'remove-item': [idx: number]
}>()

const { formatDual } = useCurrency()
</script>
