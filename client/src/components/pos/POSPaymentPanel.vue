<template>
  <div class="flex flex-col h-full rounded-xl border border-border bg-surface p-3.5 sm:p-4 lg:min-h-0 min-w-0">
    <h3 class="text-base font-semibold text-text mb-3 sm:mb-4 shrink-0">Resumen de cobro</h3>

    <template v-if="selectedAppointment || isRetailOnly || isDirectService">
      <div class="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
        <div class="rounded-lg bg-bg-secondary p-3">
          <template v-if="isDirectService && !selectedAppointment">
            <div class="flex items-center justify-between text-sm mb-2 pb-2 border-b border-border">
              <span class="text-text-muted">Cliente</span>
              <span class="font-medium text-text">{{ retailClientName || 'Servicio Directo' }}</span>
            </div>
            <div v-if="directServicesList && directServicesList.length > 0" class="space-y-2">
              <div
                v-for="(item, i) in directServicesList"
                :key="item.id || i"
                class="flex items-start justify-between text-sm"
              >
                <div class="flex-1 min-w-0 pr-2">
                  <p class="font-medium text-text text-xs truncate">{{ item.serviceName }}</p>
                  <p class="text-text-muted text-[11px] truncate">
                    {{ item.employeeName }}<template v-if="item.assistantEmployeeName"> + {{ item.assistantEmployeeName }}</template>
                  </p>
                </div>
                <span class="font-semibold text-text text-xs shrink-0 tabular-nums">${{ item.price }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-text-muted text-center py-1">Sin servicios agregados</p>
          </template>
          <template v-else-if="isRetailOnly && !selectedAppointment">
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
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Productos</h4>
            <label v-if="!isRetailOnly" class="flex items-center gap-1.5 cursor-pointer">
              <span class="text-[11px] font-medium text-text-muted">
                <span class="hidden sm:inline">Incluidos (Exonerar precio)</span>
                <span class="sm:hidden">Incluidos</span>
              </span>
              <div
                class="relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                :class="areProductsIncluded ? 'bg-primary' : 'bg-bg-secondary border border-border'"
                @click="$emit('update:are-products-included', !areProductsIncluded)"
              >
                <span
                  class="inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="areProductsIncluded ? 'translate-x-3 bg-white' : 'translate-x-0.5 bg-border-strong'"
                />
              </div>
            </label>
          </div>
          <div class="space-y-2">
            <div
              v-for="(item, idx) in cart"
              :key="item.productId"
              class="flex items-center justify-between gap-2 rounded-lg bg-bg-secondary px-3 py-2"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text truncate">{{ item.productName }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs" :class="areProductsIncluded ? 'text-text-muted line-through opacity-70' : 'text-text-muted'">{{ formatDual(item.unitPrice) }} c/u</span>
                  <div v-if="isRetailOnly && item.unitPrice2 != null && Number(item.unitPrice2) > 0" class="inline-flex rounded border border-border p-0.5 bg-surface shrink-0">
                    <button
                      type="button"
                      @click.stop.prevent="$emit('set-price-index', idx, 1)"
                      class="px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer"
                      :class="item.priceIndex !== 2 ? 'bg-primary text-text-inverse shadow-2xs' : 'text-text-muted hover:text-text'"
                    >
                      P1
                    </button>
                    <button
                      type="button"
                      @click.stop.prevent="$emit('set-price-index', idx, 2)"
                      class="px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer"
                      :class="item.priceIndex === 2 ? 'bg-primary text-text-inverse shadow-2xs' : 'text-text-muted hover:text-text'"
                    >
                      P2
                    </button>
                  </div>
                </div>
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
                <div class="text-right w-16">
                  <span v-if="areProductsIncluded" class="block text-xs font-bold text-success">Exonerado</span>
                  <span v-else class="text-sm font-semibold text-text">{{ formatDual(item.subtotal) }}</span>
                </div>
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
            <div class="flex items-center justify-between gap-2">
              <label class="block text-sm font-medium text-text">Propina {{ tipAmount > 0 ? '(' + formatDual(tipAmount) + ')' : '' }}</label>
              <button
                v-if="tipParticipants.length > 1"
                type="button"
                @click="$emit('toggle-tip-adjust')"
                class="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary transition-theme hover:bg-bg-secondary shrink-0"
              >
                <span class="hidden sm:inline">Ajustar por empleado</span>
                <span class="sm:hidden">Ajustar</span>
              </button>
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
                <span class="font-medium text-text"><span class="hidden sm:inline">Distribución de propina</span><span class="sm:hidden">Distribución</span></span>
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
                  class="w-20 sm:w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs text-right text-text outline-none focus:border-primary"
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
          <div v-if="isRetailOnly" class="flex flex-col gap-2 border-t border-border pt-3 mt-1">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-text">Total Calculado</span>
              <span class="text-text-muted">{{ formatDual(productsTotal) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-text">Total a Cobrar</span>
              <div class="flex items-center gap-2">
                <select
                  :value="customTotalCurrency"
                  @change="$emit('update:custom-total-currency', ($event.target as HTMLSelectElement).value)"
                  class="rounded-lg border border-border bg-surface px-2 py-1 text-sm font-bold text-text outline-none focus:border-primary w-16"
                >
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
                </select>
                <input
                  :value="customTotalAmount ?? ''"
                  @input="$emit('update:custom-total-amount', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                  type="number" step="0.01" min="0" placeholder="Automático"
                  class="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-lg font-bold text-primary text-right outline-none focus:border-primary placeholder:text-text-muted/50"
                />
              </div>
            </div>
          </div>
          <div v-else class="flex items-center justify-between border-t border-border pt-2 mt-1">
            <span class="text-base font-bold text-text">Total</span>
            <DualAmount :amount="grandTotal" orientation="stack" size="lg" primary-class="text-xl font-bold text-primary" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-xs sm:text-sm font-medium text-text">Método de pago</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="pm in paymentMethods"
              :key="pm.value"
              @click="$emit('select-method', pm.value)"
              :class="[
                'rounded-lg border p-2 text-xs sm:text-sm font-medium transition-theme text-center relative flex items-center justify-center min-h-[42px] gap-1 px-2.5',
                paymentMethod === pm.value
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-2xs'
                  : 'border-border text-text-secondary hover:bg-bg-secondary'
              ]"
            >
              <span class="truncate">{{ pm.label }}</span>
              <span
                v-if="(pm as any).currency"
                class="shrink-0 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                :class="(pm as any).currency === 'USD' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
              >{{ (pm as any).currency === 'USD' ? '$' : 'Bs' }}</span>
            </button>
          </div>
        </div>

        <div v-if="paymentMethod === 'other'" class="space-y-2 mt-4">
          <label class="block text-xs sm:text-sm font-medium text-text">Moneda</label>
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

        <div v-if="needsGiftCardSelect" class="space-y-2 mt-4">
          <label class="block text-xs sm:text-sm font-medium text-text">Gift Card a consumir</label>
          <select
            :value="selectedGiftCardId"
            @change="$emit('update:selected-gift-card-id', ($event.target as HTMLSelectElement).value)"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs sm:text-sm font-medium text-text outline-none focus:border-primary truncate"
          >
            <option value="">-- Selecciona una Gift Card --</option>
            <option v-for="gc in activeGiftCards" :key="gc.id" :value="gc.id">
              [{{ gc.code || 'SIN CÓDIGO' }}] {{ gc.recipientName }} (De: {{ gc.buyerName || 'Anónimo' }}) — Saldo: ${{ gc.amount.toFixed(2) }}
            </option>
          </select>

          <div v-if="selectedGC" class="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-text-muted">Saldo disponible actual:</span>
              <span class="font-bold text-success text-sm tabular-nums">{{ formatDual(selectedGC.amount) }}</span>
            </div>
            <div v-if="selectedGC.amount < grandTotal" class="text-[11px] text-warning font-medium">
              ⚠️ El saldo de la gift card ({{ formatDual(selectedGC.amount) }}) es menor al total a cobrar ({{ formatDual(grandTotal) }}). Se consumirá el 100% de la gift card.
            </div>
            <div v-else class="text-[11px] text-success font-medium">
              ✅ Saldo suficiente. Nuevo saldo tras el cobro: {{ formatDual(selectedGC.amount - grandTotal) }}.
            </div>
          </div>
        </div>

        <div v-if="paymentMethod === 'mixed'" class="space-y-2 border-t border-border-subtle pt-3 mt-4">
          <label class="block text-xs sm:text-sm font-medium text-text">Distribución del pago</label>
          <div v-for="(split, idx) in paymentsBreakdown" :key="idx" class="grid grid-cols-[1fr_3.8rem_1fr_auto] gap-1.5 items-center">
            <select
              v-model="split.method"
              class="w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none focus:border-primary truncate"
            >
              <option v-for="m in mixedMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <select
              v-model="split.currency"
              class="w-full rounded-lg border border-border bg-surface px-1 py-2 text-xs text-text outline-none focus:border-primary text-center font-medium"
            >
              <option value="USD">USD</option>
              <option value="VES">Bs</option>
            </select>
            <input
              v-model.number="split.inputAmount"
              type="number" step="0.01" min="0"
              placeholder="0.00"
              class="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text outline-none placeholder:text-text-muted focus:border-primary text-right font-medium tabular-nums min-w-0"
            />
            <button
              v-if="paymentsBreakdown.length > 1"
              @click="$emit('remove-split', idx)"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-theme"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex items-center justify-between text-xs pt-1">
            <button @click="$emit('add-split')" class="text-primary hover:text-primary-hover transition-theme font-medium">
              + Agregar método
            </button>
            <span :class="splitRemaining === 0 ? 'text-success font-medium' : 'text-warning font-medium'" class="tabular-nums">
              Restante: {{ formatDual(splitRemaining) }}
            </span>
          </div>
        </div>

        <textarea
          :value="notes"
          @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
          placeholder="Notas del pago (opcional)"
          rows="2"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary mt-4"
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

    <div v-else class="flex-1 flex items-center justify-center text-center text-sm text-text-muted py-6">
      <div>
        <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p class="text-xs sm:text-sm">Selecciona una cita pendiente<br>o inicia una venta directa</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { DualAmount } from '../common'
import { formatDate } from '../../lib/formatters'
import { useAuth } from '../../composables/common/useAuth'
import { useGiftCards } from '../../composables/giftCards/useGiftCards'
import { useBusinessStore } from '../../store/business'
import type { PaymentMethod } from '../../types/database'
import type { PaymentBreakdownItem, POSProductItem } from '../../types/pos'

interface TipParticipant {
  employeeId: string
  employeeName: string
}

const props = defineProps<{
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
  selectedGiftCardId?: string | null
  customTotalAmount?: number | null
  customTotalCurrency?: 'USD' | 'VES'
  isDirectService?: boolean
  directServiceName?: string | null
  directServiceEmployeeName?: string | null
  directServiceAssistantName?: string | null
  directServicesList?: Array<{
    id?: string
    serviceName: string
    employeeName: string
    assistantEmployeeName?: string | null
    price: number
  }>
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
  'set-price-index': [idx: number, priceIndex: 1 | 2]
  'increment-qty': [idx: number]
  'decrement-qty': [idx: number]
  'remove-item': [idx: number]
  'update:are-products-included': [value: boolean]
  'update:selected-gift-card-id': [value: string | null]
}>()

const { formatDual } = useCurrency()
const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const { activeGiftCards } = useGiftCards(businessId)
const businessStore = useBusinessStore()

const needsGiftCardSelect = computed(() =>
  businessStore.features.gift_cards &&
  (props.paymentMethod === 'gift_card' ||
  (props.paymentMethod === 'mixed' && props.paymentsBreakdown.some(b => b.method === 'gift_card')))
)

const selectedGC = computed(() =>
  activeGiftCards.value.find(g => g.id === props.selectedGiftCardId)
)
</script>
