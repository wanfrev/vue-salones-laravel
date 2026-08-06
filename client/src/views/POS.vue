<template>
  <FeatureGate feature="pos">
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          <span class="font-medium uppercase tracking-wider">Ventas</span>
        </div>
        <h1 class="text-xl font-bold text-text sm:text-2xl lg:text-3xl">Punto de Venta</h1>
        <p class="hidden text-sm text-text-muted sm:block">Registra pagos de servicios y productos</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ExchangeRateCard
          :is-editable="isRateEditable"
          :edit-rate-value="editRateValue"
          :updating-rate="updatingRate"
          :display-rate="displayRate"
          @update:edit-rate-value="editRateValue = $event"
          @update-rate="handleRateUpdate"
        />
        <div class="flex items-center gap-2">
          <button
            v-if="businessStore.features.pos_direct_service_sale"
            @click="startDirectService"
            class="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200"
            :class="activeSaleType === 'direct_service' ? 'bg-primary text-text-inverse border-primary' : 'border-primary/30 text-primary hover:bg-primary/5'"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Servicio directo
          </button>
          <button @click="startRetailOnly" class="flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary shadow-sm transition-all duration-200 hover:bg-primary/5">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            {{ businessStore.features.agenda ? 'Venta directa' : 'Nueva factura' }}
          </button>
        </div>
      </div>
    </div>
  </header>

  <div v-if="queryError" class="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Error al cargar citas: {{ queryError }}</div>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
    <!-- LEFT PANEL -->
    <div class="min-w-0 space-y-4">
      <!-- DIRECT SERVICE PANEL -->
      <div v-if="activeSaleType === 'direct_service'" class="rounded-2xl border border-primary/30 bg-surface p-4 shadow-sm space-y-4 mb-4">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-text">Cobro Directo de Servicios</h3>
              <p class="text-xs text-text-muted">Agrega múltiples servicios y modifica sus montos fácilmente</p>
            </div>
          </div>
          <button @click="cancelDirectService" class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text" title="Cancelar servicio directo">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Formulario para agregar un servicio -->
        <div class="rounded-xl bg-bg-secondary/60 p-3 space-y-3 border border-border/50">
          <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Servicio -->
            <div class="lg:col-span-2">
              <label class="block text-[11px] font-semibold text-text-secondary mb-1">Servicio *</label>
              <select
                v-model="pendingServiceId"
                @change="onPendingServiceChange"
                class="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary"
              >
                <option value="" disabled>Selecciona un servicio</option>
                <option v-for="s in posServiciosList" :key="s.id" :value="s.id">
                  {{ s.name }} (${{ s.price }})
                </option>
              </select>
            </div>

            <!-- Precio Modificable -->
            <div>
              <label class="block text-[11px] font-semibold text-text-secondary mb-1">Precio ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                v-model.number="pendingServicePrice"
                placeholder="0.00"
                class="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text font-medium outline-none focus:border-primary"
              />
            </div>

            <!-- Empleado Principal -->
            <div>
              <label class="block text-[11px] font-semibold text-text-secondary mb-1">Empleado *</label>
              <select
                v-model="pendingEmployeeId"
                class="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary"
              >
                <option value="" disabled>Selecciona empleado</option>
                <option v-for="e in posEmpleadosList" :key="e.id" :value="e.id">
                  {{ e.name }}
                </option>
              </select>
            </div>

            <!-- Asistente (Opcional) -->
            <div class="lg:col-span-2">
              <label class="block text-[11px] font-semibold text-text-secondary mb-1">Asistente (opcional)</label>
              <select
                v-model="pendingAssistantId"
                class="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary"
              >
                <option value="">Sin asistente</option>
                <option v-for="e in posEmpleadosList.filter((x: any) => x.id !== pendingEmployeeId)" :key="e.id" :value="e.id">
                  {{ e.name }}
                </option>
              </select>
            </div>

            <!-- Botón Agregar -->
            <div class="lg:col-span-2 flex items-end">
              <button
                @click="addDirectServiceToList"
                :disabled="!pendingServiceId || !pendingEmployeeId || pendingServicePrice < 0"
                class="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                + Agregar servicio a la cuenta
              </button>
            </div>
          </div>
        </div>

        <!-- Lista de Servicios Agregados -->
        <div v-if="directServicesList.length > 0" class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-text uppercase tracking-wider">Servicios Agregados ({{ directServicesList.length }})</h4>
            <span class="text-xs font-bold text-primary tabular-nums">Subtotal Servicios: ${{ servicePrice.toFixed(2) }}</span>
          </div>

          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div
              v-for="(item, idx) in directServicesList"
              :key="item.id"
              class="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-2.5 shadow-2xs"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-text truncate">{{ item.serviceName }}</p>
                <p class="text-[11px] text-text-muted truncate">
                  Por: <span class="font-medium text-text">{{ item.employeeName }}</span>
                  <template v-if="item.assistantEmployeeName"> | Asistente: <span class="font-medium text-text">{{ item.assistantEmployeeName }}</span></template>
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-1 bg-bg-secondary px-2 py-1 rounded-lg border border-border">
                  <span class="text-xs text-text-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    :value="item.price"
                    @input="updateDirectServicePrice(idx, ($event.target as HTMLInputElement).valueAsNumber)"
                    class="w-16 bg-transparent text-right text-xs font-bold text-text outline-none"
                  />
                </div>

                <button
                  @click="removeDirectServiceFromList(idx)"
                  class="rounded-lg p-1 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                  title="Eliminar servicio"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cliente Opcional -->
        <div class="border-t border-border pt-3">
          <label class="block text-xs font-semibold text-text-secondary mb-1">Cliente asignado (opcional)</label>
          <div class="relative">
            <input
              v-model="directServiceClientSearch"
              @input="onDirectServiceSearchClients(directServiceClientSearch)"
              placeholder="Buscar cliente por nombre o teléfono..."
              class="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
            <div v-if="directServiceClientSuggestions.length > 0" class="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
              <button
                v-for="c in directServiceClientSuggestions"
                :key="c.id"
                @click="selectDirectServiceClient(c)"
                class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-text hover:bg-bg-secondary"
              >
                <span class="font-medium">{{ c.full_name }}</span>
                <span class="text-text-muted text-[10px]">{{ c.phone }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeSaleType === 'retail_only'" class="flex flex-col h-full space-y-4">
        <RetailProductSearch
          ref="retailSearchRef"
          :products="retailFilteredProducts"
          :client-suggestions="retailClientSuggestions"
          :business-id="businessId"
          :branch-id="branchId"
          :is-retail-only="!businessStore.features.agenda"
          @add-product="addRetailProduct"
          @select-client="selectRetailClient"
          @search-clients="onRetailSearchClients"
          @update:client-name="retailClientSearch = $event; retailClientId = null"
          @update:client-phone="retailClientPhone = $event"
        />
        <RetailProductGrid
          :products="products"
          :is-retail-only="!businessStore.features.agenda"
          @add-product="addRetailProduct"
          class="flex-1"
        />
      </div>

      <AppointmentList
        v-if="businessStore.features.agenda"
        :overdue="overdueAppointments"
        :upcoming="upcomingAppointments"
        :total-count="filteredAppointments.length"
        :selected-id="selectedId"
        :products="products"
        :cart="cart"
        :inline-product-search="inlineProductSearch"
        :show-inline-dropdown="showInlineDropdown"
        :show-go-to-calendar="!authStore.isCajeroProfile"
        @select="onSelectAppointment"
        @go-to-calendar="goToAppointmentInCalendar"
        @update:search="appointmentSearch = $event"
        @update:inline-product-search="inlineProductSearch = $event"
        @add-product="addInlineProduct"
        @blur="onInlineBlur" @focus="showInlineDropdown = true"
      />
    </div>

    <!-- RIGHT PANEL (desktop & tablet landscape) -->
    <div class="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-6rem)] lg:flex lg:flex-col lg:overflow-hidden lg:min-w-[340px]">
      <POSPaymentPanel
        :selected-appointment="selectedAppointment"
        :cart="cart" :service-price="servicePrice"
        :products-total="productsTotal" :cart-count="cart.length"
        :grand-total="grandTotal" :payment-method="paymentMethod"
        :other-currency="otherCurrency" :payment-methods="paymentMethods"
        :mixed-methods="mixedMethods" :payments-breakdown="paymentsBreakdown"
        :split-remaining="splitRemaining" :is-processing="isProcessing" :can-pay="canPay"
        :notes="paymentNotes" :tip-amount="tipAmount"
        :tip-participants="tipParticipants" :tip-allocations="tipAllocations"
        :tip-allocated-total="tipAllocatedTotal" :tip-remaining="tipRemaining"
        :show-tip-adjust="showTipAdjust" :is-retail-only="activeSaleType === 'retail_only'"
        :retail-client-name="activeSaleType === 'retail_only' ? retailClientSearch : directServiceClientSearch"
        :selected-gift-card-id="selectedGiftCardId"
        :custom-total-amount="customTotalAmount"
        :custom-total-currency="customTotalCurrency"
        :is-direct-service="activeSaleType === 'direct_service'"
        :direct-services-list="directServicesList"
        @update:custom-total-amount="customTotalAmount = $event"
        @update:custom-total-currency="customTotalCurrency = $event"
        @update:selected-gift-card-id="selectedGiftCardId = $event"
        @update:are-products-included="areProductsIncluded = $event"
        @select-method="selectMethod"
        @update:other-currency="otherCurrency = $event"
        @add-split="addSplit" @remove-split="removeSplit"
        @update:notes="paymentNotes = $event"
        @update:tip-amount="tipAmount = $event"
        @toggle-tip-adjust="showTipAdjust = !showTipAdjust"
        @set-equal-tip="setEqualTipAllocation"
        @update:tip-allocation="setTipAllocation"
        @process-payment="handleProcessPayment"
        @set-price-index="setPriceIndex"
        @increment-qty="incrementQty" @decrement-qty="decrementQty" @remove-item="removeItem"
      />
    </div>
  </div>

  <!-- MOBILE / TABLET PAYMENT DRAWER -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-full"
    >
      <div
        v-if="isMobile && mobilePaymentOpen"
        class="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden"
      >
        <div class="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 class="text-base font-semibold text-text">Cobrar</h2>
          <button
            @click="closeMobilePayment"
            class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-hidden p-3 sm:p-4 flex justify-center">
          <div class="w-full max-w-lg h-full flex flex-col min-w-0">
          <POSPaymentPanel
            :selected-appointment="selectedAppointment"
            :cart="cart" :service-price="servicePrice"
            :products-total="productsTotal" :cart-count="cart.length"
            :grand-total="grandTotal" :payment-method="paymentMethod"
            :other-currency="otherCurrency" :payment-methods="paymentMethods"
            :mixed-methods="mixedMethods" :payments-breakdown="paymentsBreakdown"
            :split-remaining="splitRemaining" :is-processing="isProcessing" :can-pay="canPay"
            :notes="paymentNotes" :tip-amount="tipAmount"
            :tip-participants="tipParticipants" :tip-allocations="tipAllocations"
            :tip-allocated-total="tipAllocatedTotal" :tip-remaining="tipRemaining"
            :show-tip-adjust="showTipAdjust" :is-retail-only="activeSaleType === 'retail_only'"
            :retail-client-name="activeSaleType === 'retail_only' ? retailClientSearch : directServiceClientSearch"
            :selected-gift-card-id="selectedGiftCardId"
            :custom-total-amount="customTotalAmount"
            :custom-total-currency="customTotalCurrency"
            :is-direct-service="activeSaleType === 'direct_service'"
            :direct-services-list="directServicesList"
            @update:custom-total-amount="customTotalAmount = $event"
            @update:custom-total-currency="customTotalCurrency = $event"
            @update:selected-gift-card-id="selectedGiftCardId = $event"
            @update:are-products-included="areProductsIncluded = $event"
            @select-method="selectMethod"
            @update:other-currency="otherCurrency = $event"
            @add-split="addSplit" @remove-split="removeSplit"
            @update:notes="paymentNotes = $event"
            @update:tip-amount="tipAmount = $event"
            @toggle-tip-adjust="showTipAdjust = !showTipAdjust"
            @set-equal-tip="setEqualTipAllocation"
            @update:tip-allocation="setTipAllocation"
            @process-payment="handleMobileProcessPayment"
            @set-price-index="setPriceIndex"
            @increment-qty="incrementQty" @decrement-qty="decrementQty" @remove-item="removeItem"
          />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Mobile floating pay button when drawer is closed -->
  <button
    v-if="isMobile && !mobilePaymentOpen && hasPaymentContext"
    @click="mobilePaymentOpen = true"
    class="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-text-inverse shadow-lg shadow-primary/25 transition-theme hover:bg-primary-hover lg:hidden"
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
    Cobrar
  </button>
  </FeatureGate>

  <POSConfirmModal
    :show="showConfirmModal" :grand-total="grandTotal"
    :client-name="confirmClientName" :is-processing="isProcessing"
    @cancel="cancelPayment" @confirm="confirmPayment"
  />

  <CitaFormModal
    ref="posCitaModalRef"
    :servicios="posServiciosList"
    :empleados="posEmpleadosList"
    @save="handleSaveCita"
    @delete="handleDeleteCita"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { listPendingAppointments, listSaleableProducts, posKeys, groupPendingAppointments } from '../services/posService'
import { searchClients } from '../services/clientesService'
import { listServicios } from '../services/serviciosService'
import { listEquipo } from '../services/equipoService'
import { usePOSCart } from '../composables/pos/usePOSCart'
import { usePOSPayment } from '../composables/pos/usePOSPayment'
import { FeatureGate } from '../components/common'
import { CitaFormModal } from '../components/modals'
import POSPaymentPanel from '../components/pos/POSPaymentPanel.vue'
import POSConfirmModal from '../components/pos/POSConfirmModal.vue'
import RetailProductSearch from '../components/pos/RetailProductSearch.vue'
import RetailProductGrid from '../components/pos/RetailProductGrid.vue'
import AppointmentList from '../components/pos/AppointmentList.vue'
import ExchangeRateCard from '../components/finanzas/ExchangeRateCard.vue'
import { useExchangeRate } from '../composables/finanzas/useExchangeRate'
import { toISODate, minutesToHHmm } from '../lib/formatters'
import { mapAppointmentToCita } from '../mappers/agendaMapper'
import { useAppointmentMutations } from '../composables/agenda/useAppointmentMutations'
import type { PaymentMethod } from '../types/database'
import type { Cita } from '../types/cita'

interface TipParticipant { employeeId: string; employeeName: string }

const { authStore } = useAuth()
const route = useRoute()
const router = useRouter()
const { exchangeRate, formatDual } = useCurrency()
const { error: showError, success: showSuccess } = useNotification()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const {
  isEditable: isRateEditable,
  editRateValue,
  updatingRate,
  displayRate,
  handleUpdate: handleRateUpdate,
} = useExchangeRate()
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const {
  cart,
  productsTotal,
  addProduct,
  setPriceIndex,
  incrementQty,
  decrementQty,
  removeItem,
  clearCart
} = usePOSCart()

const {
  paymentMethod,
  otherCurrency,
  paymentNotes,
  tipAmount,
  selectedGiftCardId,
  isProcessing: posIsProcessing,
  paymentMethods,
  mixedMethods,
  paymentsBreakdown,
  selectMethod,
  addSplit,
  removeSplit,
  reset: resetPayment
} = usePOSPayment()

const activeSaleType = ref<'appointment' | 'retail_only' | 'direct_service'>(businessStore.features.agenda ? 'appointment' : 'retail_only')
const selectedAppointment = ref<any>(null)

interface DirectServiceItem {
  id: string
  serviceId: string
  serviceName: string
  employeeId: string
  employeeName: string
  assistantEmployeeId?: string | null
  assistantEmployeeName?: string | null
  price: number
}

const directServicesList = ref<DirectServiceItem[]>([])
const pendingServiceId = ref('')
const pendingServicePrice = ref<number>(0)
const pendingEmployeeId = ref('')
const pendingAssistantId = ref('')
const directServiceClientId = ref<string | null>(null)
const directServiceClientSearch = ref('')
const directServiceClientSuggestions = ref<{ id: string; full_name: string; phone: string }[]>([])

const onPendingServiceChange = () => {
  const svc = posServiciosList.value.find((s: any) => s.id === pendingServiceId.value)
  if (svc) {
    pendingServicePrice.value = Number(svc.price ?? 0)
  }
}

const addDirectServiceToList = () => {
  if (!pendingServiceId.value || !pendingEmployeeId.value) return
  const svc = posServiciosList.value.find((s: any) => s.id === pendingServiceId.value)
  const emp = posEmpleadosList.value.find((e: any) => e.id === pendingEmployeeId.value)
  const asst = pendingAssistantId.value ? posEmpleadosList.value.find((e: any) => e.id === pendingAssistantId.value) : null

  directServicesList.value.push({
    id: 'ds_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    serviceId: pendingServiceId.value,
    serviceName: svc?.name ?? 'Servicio',
    employeeId: pendingEmployeeId.value,
    employeeName: emp?.name ?? 'Empleado',
    assistantEmployeeId: pendingAssistantId.value || null,
    assistantEmployeeName: asst?.name ?? null,
    price: Number(pendingServicePrice.value || 0),
  })

  pendingServiceId.value = ''
  pendingServicePrice.value = 0
  pendingAssistantId.value = ''
}

const removeDirectServiceFromList = (index: number) => {
  directServicesList.value.splice(index, 1)
}

const updateDirectServicePrice = (index: number, newPrice: number) => {
  if (directServicesList.value[index]) {
    directServicesList.value[index].price = Math.max(0, Number(newPrice || 0))
  }
}

const startDirectService = () => {
  selectedAppointment.value = null
  activeSaleType.value = 'direct_service'
  clearCart()
  resetPayment()
  directServicesList.value = []
  pendingServiceId.value = ''
  pendingServicePrice.value = 0
  pendingEmployeeId.value = ''
  pendingAssistantId.value = ''
  directServiceClientId.value = null
  directServiceClientSearch.value = ''
  directServiceClientSuggestions.value = []
  tipAllocations.value = {}
  tipManual.value = false
  showTipAdjust.value = false
  areProductsIncluded.value = false
  if (isMobile.value) mobilePaymentOpen.value = true
}

const cancelDirectService = () => {
  activeSaleType.value = businessStore.features.agenda ? 'appointment' : 'retail_only'
  directServicesList.value = []
  pendingServiceId.value = ''
  pendingServicePrice.value = 0
  pendingEmployeeId.value = ''
  pendingAssistantId.value = ''
  directServiceClientId.value = null
  directServiceClientSearch.value = ''
  directServiceClientSuggestions.value = []
  resetPayment()
  clearCart()
}

const selectDirectServiceClient = (client: { id: string; full_name: string; phone: string }) => {
  directServiceClientId.value = client.id
  directServiceClientSearch.value = client.full_name
  directServiceClientSuggestions.value = []
}

const onDirectServiceSearchClients = async (query: string) => {
  if (!businessId.value || !query.trim()) {
    directServiceClientSuggestions.value = []
    return
  }
  try {
    directServiceClientSuggestions.value = await searchClients(businessId.value, query, branchId.value)
  } catch {
    directServiceClientSuggestions.value = []
  }
}

const mobilePaymentOpen = ref(false)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 1024)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const hasPaymentContext = computed(() => selectedAppointment.value !== null || activeSaleType.value === 'retail_only' || activeSaleType.value === 'direct_service')
const queryError = ref<string | null>(null)
const appointmentSearch = ref('')
const inlineProductSearch = ref('')
const showInlineDropdown = ref(false)
const showTipAdjust = ref(false)
const tipAllocations = ref<Record<string, number>>({})
const tipManual = ref(false)

const retailClientSearch = ref('')
const retailClientId = ref<string | null>(null)
const retailClientPhone = ref('')
const retailClientSuggestions = ref<{ id: string; full_name: string; phone: string }[]>([])
const retailSearchRef = ref<InstanceType<typeof RetailProductSearch> | null>(null)

const { data: appointmentsData, refetch: refetchAppointments } = useQuery({
  queryKey: computed(() => posKeys.pending(businessId.value, branchId.value)),
  queryFn: async () => {
    try { queryError.value = null; return await listPendingAppointments(businessId.value!, branchId.value) }
    catch (err) { queryError.value = (err as any)?.message ?? String(err); return [] }
  },
  enabled: computed(() => !!businessId.value), staleTime: 0,
})
const { data: productsData } = useQuery({
  queryKey: computed(() => posKeys.products(businessId.value, branchId.value)),
  queryFn: () => listSaleableProducts(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value), staleTime: 0,
})

const posCitaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)

const { data: posServiciosData } = useQuery({
  queryKey: computed(() => ['pos-servicios', businessId.value, branchId.value]),
  queryFn: () => listServicios(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
  staleTime: 5 * 60 * 1000,
})
const posServiciosList = computed(() => (posServiciosData.value ?? []).map((s: any) => ({
  id: s.id, name: s.name, price: s.price, duration: s.duration, is_fixed_commission: s.is_fixed_commission, fixed_commission_amount: s.fixed_commission_amount, fixed_commission_assistant_amount: s.fixed_commission_assistant_amount,
})))

const { data: posEmpleadosData } = useQuery({
  queryKey: computed(() => ['pos-empleados', businessId.value, branchId.value]),
  queryFn: () => listEquipo(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
  staleTime: 5 * 60 * 1000,
})
const posEmpleadosList = computed(() => (posEmpleadosData.value ?? []).map((e: any) => ({
  id: e.id, name: e.name, payType: e.payType, payPercentage: e.payPercentage, disableAgenda: e.disableAgenda,
})))

const appointments = computed(() => groupPendingAppointments(appointmentsData.value ?? []))
const products = computed(() => productsData.value ?? [])
const selectedId = computed(() => selectedAppointment.value?.id ?? null)

const normalize = (s: string): string => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const filteredAppointments = computed(() => {
  if (!appointmentSearch.value) return appointments.value
  const q = normalize(appointmentSearch.value)
  const rawQ = appointmentSearch.value.toLowerCase()
  return appointments.value.filter((a: any) => {
    const name = normalize((a.client?.full_name ?? a.clients?.full_name) ?? '')
    const phone = (a.client?.phone ?? a.clients?.phone ?? '').replace(/\D/g, '')
    return name.startsWith(q) || phone.startsWith(rawQ) || normalize((a.service?.name ?? a.services?.name) ?? '').startsWith(q)
  })
})
const now = computed(() => new Date())
const overdueAppointments = computed(() => filteredAppointments.value.filter(a => new Date(a.start_time) <= now.value))
const upcomingAppointments = computed(() => filteredAppointments.value.filter(a => new Date(a.start_time) > now.value))

const retailFilteredProducts = computed(() =>
  (products.value as any[]).filter((p: any) => Number(p.available_qty ?? 0) > 0)
)

const addRetailProduct = (product: any) => { 
  addProduct(product); 
  retailSearchRef.value?.reset() 
  if (isMobile.value) mobilePaymentOpen.value = true
}
const addInlineProduct = (product: any) => { addProduct(product); inlineProductSearch.value = ''; showInlineDropdown.value = false }
const onInlineBlur = (e: FocusEvent) => {
  if (!e.relatedTarget) return
  setTimeout(() => { showInlineDropdown.value = false }, 150)
}

const selectRetailClient = (client: { id: string; full_name: string; phone: string }) => {
  retailClientId.value = client.id
  retailClientSearch.value = client.full_name
  retailClientPhone.value = client.phone
  retailClientSuggestions.value = []
  retailSearchRef.value?.reset()
}

const onRetailSearchClients = async (query: string) => {
  if (!businessId.value) return
  try {
    retailClientSuggestions.value = await searchClients(businessId.value, query, branchId.value)
  } catch {
    retailClientSuggestions.value = []
  }
}

const servicePrice = computed(() => {
  if (activeSaleType.value === 'direct_service') {
    return directServicesList.value.reduce((sum, item) => sum + Number(item.price || 0), 0)
  }
  const appt = selectedAppointment.value
  if (!appt) return 0
  if (Array.isArray(appt.members) && appt.members.length > 0) return appt.members.reduce((sum: number, m: any) => sum + Number(m.price ?? 0), 0)
  if (appt.groupPrice != null) return appt.groupPrice
  return appt.price_override != null ? Number(appt.price_override) : Number(appt.service?.price ?? appt.services?.price ?? 0)
})

const areProductsIncluded = ref(false)
const effectiveProductsTotal = computed(() => areProductsIncluded.value ? 0 : productsTotal.value)

const customTotalAmount = ref<number | null>(null)
const customTotalCurrency = ref<'USD' | 'VES'>('USD')

const grandTotal = computed(() => {
  if (activeSaleType.value === 'retail_only') {
    if (customTotalAmount.value != null && customTotalAmount.value > 0) {
      return customTotalCurrency.value === 'VES'
        ? Number((customTotalAmount.value / exchangeRate.value).toFixed(2))
        : customTotalAmount.value
    }
    return effectiveProductsTotal.value
  }
  return servicePrice.value + effectiveProductsTotal.value + tipAmount.value
})

const tipParticipants = computed<TipParticipant[]>(() => {
  if (activeSaleType.value === 'retail_only') return []
  if (activeSaleType.value === 'direct_service') {
    const map = new Map<string, string>()
    for (const item of directServicesList.value) {
      if (item.employeeId && !map.has(item.employeeId)) map.set(item.employeeId, item.employeeName)
      if (item.assistantEmployeeId && !map.has(item.assistantEmployeeId)) map.set(item.assistantEmployeeId, item.assistantEmployeeName ?? 'Asistente')
    }
    return Array.from(map.entries()).map(([id, name]) => ({ employeeId: id, employeeName: name }))
  }
  const appt = selectedAppointment.value
  if (!appt) return []
  if (appt.isGroup && Array.isArray(appt.members)) {
    const map = new Map<string, string>()
    for (const m of appt.members) { if (m.employeeId && !map.has(m.employeeId)) map.set(m.employeeId, m.employeeName ?? 'Empleado') }
    return Array.from(map.entries()).map(([id, name]) => ({ employeeId: id, employeeName: name }))
  }
  const result: TipParticipant[] = []
  if (appt.employee_id) result.push({ employeeId: appt.employee_id, employeeName: appt.employee_profile?.full_name ?? appt.profiles?.full_name ?? 'Empleado' })
  if (appt.assistant_employee_id) result.push({ employeeId: appt.assistant_employee_id, employeeName: appt.assistant_profile?.full_name ?? 'Asistente' })
  return [...new Map(result.map(p => [p.employeeId, p])).values()]
})

const distributeEqualTip = (total: number, participants: TipParticipant[]): Record<string, number> => {
  if (!participants.length || total <= 0) return {}
  const cents = Math.round(total * 100), base = Math.floor(cents / participants.length), rem = cents % participants.length
  const next: Record<string, number> = {}; participants.forEach((p, i) => { next[p.employeeId] = (base + (i < rem ? 1 : 0)) / 100 })
  return next
}
const setEqualTipAllocation = () => { tipAllocations.value = distributeEqualTip(tipAmount.value, tipParticipants.value); tipManual.value = false }
const tipAllocatedTotal = computed(() => tipParticipants.value.reduce((sum, p) => sum + Number(tipAllocations.value[p.employeeId] ?? 0), 0))
const tipRemaining = computed(() => Number((tipAmount.value - tipAllocatedTotal.value).toFixed(2)))
const normalizedTipAllocations = computed(() => tipParticipants.value.map(p => ({ employee_id: p.employeeId, amount: Number((tipAllocations.value[p.employeeId] ?? 0).toFixed(2)) })).filter(x => x.amount > 0))

watch([tipParticipants, () => selectedId.value], () => { setEqualTipAllocation(); showTipAdjust.value = false }, { immediate: true })
watch(() => tipAmount.value, () => { if (!tipManual.value) setEqualTipAllocation() })

const splitRemaining = computed(() =>
  paymentMethod.value === 'mixed'
    ? Math.max(0, grandTotal.value - paymentsBreakdown.value.reduce((sum: number, s: any) => sum + (s.currency === 'VES' ? (s.inputAmount || 0) / exchangeRate.value : (s.inputAmount || 0)), 0))
    : 0
)
const isProcessing = computed(() => posIsProcessing.value)
const canPay = computed(() => {
  if (grandTotal.value <= 0) return false
  if (activeSaleType.value === 'direct_service') {
    if (directServicesList.value.length === 0) return false
  }
  if (activeSaleType.value !== 'retail_only' && tipAmount.value > 0 && tipParticipants.value.length > 0 && Math.abs(tipRemaining.value) >= 0.01) return false
  if (paymentMethod.value === 'mixed') {
    const total = paymentsBreakdown.value.reduce((sum: number, s: any) => sum + (s.currency === 'VES' ? (s.inputAmount || 0) / exchangeRate.value : (s.inputAmount || 0)), 0)
    return Math.abs(total - grandTotal.value) < 0.01 && paymentsBreakdown.value.length > 0
  }
  return true
})

const selectAppointment = (appt: any) => {
  if (selectedAppointment.value?.id === appt.id) { selectedAppointment.value = null; clearCart(); resetPayment(); areProductsIncluded.value = false; return }
  selectedAppointment.value = appt; activeSaleType.value = 'appointment'
  clearCart()
  areProductsIncluded.value = false

  const rawProducts: any[] = []
  if (appt.isGroup && Array.isArray(appt.members)) {
    for (const m of appt.members) {
      if (m.associated_products && Array.isArray(m.associated_products)) rawProducts.push(...m.associated_products)
      else if (m.associatedProducts && Array.isArray(m.associatedProducts)) rawProducts.push(...m.associatedProducts)
    }
  }
  if (appt.associated_products && Array.isArray(appt.associated_products)) rawProducts.push(...appt.associated_products)
  else if (appt.associatedProducts && Array.isArray(appt.associatedProducts)) rawProducts.push(...appt.associatedProducts)

  for (const item of rawProducts) {
    const pid = item.productId || item.product_id
    if (!pid) continue
    const qty = Number(item.quantity || 1)
    const uPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0)
    const uCost = Number(item.unitCost ?? item.unit_cost ?? 0)
    const pName = item.productName || item.product_name || item.name || 'Producto'

    const existing = cart.value.find(c => c.productId === pid)
    if (existing) {
      existing.quantity += qty
      existing.subtotal = existing.unitPrice * existing.quantity
    } else {
      cart.value.push({
        productId: pid,
        productName: pName,
        availableQty: 999,
        variantId: item.variantId || item.variant_id || null,
        variantName: item.variantName || item.variant_name || null,
        quantity: qty,
        unitPrice: uPrice,
        unitCost: uCost,
        subtotal: uPrice * qty,
      })
    }
  }

  setEqualTipAllocation()
}

const onSelectAppointment = (appt: any) => {
  selectAppointment(appt)
  if (selectedAppointment.value && isMobile.value) mobilePaymentOpen.value = true
}

const closeMobilePayment = () => {
  mobilePaymentOpen.value = false
}

const handleMobileProcessPayment = () => {
  if (grandTotal.value <= 0) return
  showConfirmModal.value = true
}

watch(() => appointments.value, (list) => {
  if (!selectedAppointment.value) return
  const updated = list.find((a: any) => a.id === selectedAppointment.value.id)
  if (updated) selectedAppointment.value = updated
})
const goToAppointmentInCalendar = (appt: any) => {
  const cita = mapAppointmentToCita(appt)
  posCitaModalRef.value?.open(cita)
}
const startRetailOnly = () => {
  selectedAppointment.value = null; activeSaleType.value = 'retail_only'; clearCart(); resetPayment(); retailClientSearch.value = ''; retailClientPhone.value = ''; retailClientId.value = null; retailClientSuggestions.value = []; retailSearchRef.value?.reset(); tipAllocations.value = {}; tipManual.value = false; showTipAdjust.value = false; areProductsIncluded.value = false; customTotalAmount.value = null; customTotalCurrency.value = 'USD'
  if (isMobile.value) mobilePaymentOpen.value = true
}
const setTipAllocation = (employeeId: string, value: number) => { tipManual.value = true; tipAllocations.value = { ...tipAllocations.value, [employeeId]: Math.max(0, Number(value || 0)) } }

const handleRetailPayment = async () => {
  const ok = await processDirectSale({
    totalAmount: grandTotal.value,
    products: cart.value,
    exchangeRate: exchangeRate.value,
    clientId: retailClientId.value,
    clientNameInput: !retailClientId.value ? retailClientSearch.value : undefined,
    clientPhoneInput: !retailClientId.value ? retailClientPhone.value : undefined,
  })
  if (ok) {
    clearCart()
    resetPayment()
    retailClientSearch.value = ''
    retailClientPhone.value = ''
    retailClientId.value = null
    retailClientSuggestions.value = []
    retailSearchRef.value?.reset()
    mobilePaymentOpen.value = false
  }
}

const handleDirectServicePayment = async () => {
  if (isProcessing.value || directServicesList.value.length === 0) return
  const ok = await processDirectServiceSale({
    services: directServicesList.value.map(s => ({
      serviceId: s.serviceId,
      employeeId: s.employeeId,
      assistantEmployeeId: s.assistantEmployeeId || null,
      price: s.price,
    })),
    clientId: directServiceClientId.value || null,
    serviceAmount: servicePrice.value,
    productsAmount: effectiveProductsTotal.value,
    products: cart.value,
    exchangeRate: exchangeRate.value,
    tipAmount: tipAmount.value,
  })
  if (ok) {
    selectedAppointment.value = null
    clearCart()
    resetPayment()
    cancelDirectService()
    mobilePaymentOpen.value = false
  }
}

const showConfirmModal = ref(false)
const confirmClientName = computed(() => {
  if (activeSaleType.value === 'retail_only') return retailClientId.value ? retailClientSearch.value : null
  if (activeSaleType.value === 'direct_service') return directServiceClientId.value ? directServiceClientSearch.value : null
  return (selectedAppointment.value?.client?.full_name ?? selectedAppointment.value?.clients?.full_name) || null
})
const handleProcessPayment = () => { if (grandTotal.value > 0) showConfirmModal.value = true }
const cancelPayment = () => { showConfirmModal.value = false }

const confirmPayment = async () => {
  showConfirmModal.value = false
  if (activeSaleType.value === 'retail_only' || (activeSaleType.value === 'appointment' && !selectedAppointment.value && cart.value.length > 0)) { 
    await handleRetailPayment(); 
    return 
  }
  if (activeSaleType.value === 'direct_service') { await handleDirectServicePayment(); return }
  if (!selectedAppointment.value) return
  const appt = selectedAppointment.value
  const ok = await processPayment({
    appointmentId: appt.id,
    serviceAmount: servicePrice.value,
    products: cart.value,
    exchangeRate: exchangeRate.value,
    tipAmount: tipAmount.value,
    productsAmount: effectiveProductsTotal.value,
    isGroup: !!(appt.isGroup && appt.groupIds?.length > 1),
    groupIds: appt.groupIds,
    members: appt.members,
    groupPrice: appt.groupPrice,
    tipAllocations: tipAllocations.value,
  })
  if (ok) { selectedAppointment.value = null; clearCart(); resetPayment(); areProductsIncluded.value = false; mobilePaymentOpen.value = false }
}

const { handleSaveCita, handleDeleteCita } = useAppointmentMutations({
  businessId,
  createdBy: computed(() => authStore.profile?.id),
  modalRef: posCitaModalRef,
})

const tryAutoSelect = () => {
  const id = route.query.appointmentId as string | undefined
  if (!id) return
  if (appointments.value.length === 0) return
  const found = appointments.value.find((a: any) =>
    a.id === id || (a.groupIds && a.groupIds.includes(id)),
  )
  if (found) {
    selectAppointment(found)
    applyPrefill()
    router.replace({ query: {} })
  }
}

const applyPrefill = () => {
  const raw = sessionStorage.getItem('posPrefill')
  if (!raw) return
  sessionStorage.removeItem('posPrefill')

  let prefill: any
  try { prefill = JSON.parse(raw) } catch { return }
  if (!prefill) return

  const method = prefill.paymentMethod as PaymentMethod
  const isMixed = method === 'mixed' || (prefill.breakdown && prefill.breakdown.length > 1)

  paymentMethod.value = isMixed ? 'mixed' : method
  otherCurrency.value = prefill.paymentCurrency

  if (isMixed && prefill.breakdown && prefill.breakdown.length > 0) {
    paymentsBreakdown.value = [...prefill.breakdown]
  } else if (!isMixed && prefill.breakdown && prefill.breakdown.length === 1) {
    const b = prefill.breakdown[0]
    paymentMethod.value = b.method as PaymentMethod
    otherCurrency.value = b.currency
  } else {
    paymentsBreakdown.value = []
  }

  tipAmount.value = prefill.tipAmount ?? 0
  paymentNotes.value = prefill.notes ?? ''

  if (prefill.products && prefill.products.length > 0) {
    clearCart()
    for (const p of prefill.products) {
      cart.value.push({
        productId: p.productId,
        productName: p.productName,
        variantId: null,
        variantName: null,
        quantity: p.quantity,
        unitPrice: p.unitCost,
        unitCost: p.unitCost,
        subtotal: p.unitCost * p.quantity,
        availableQty: 999,
      })
    }
  }
}

watch(appointments, () => { tryAutoSelect() }, { immediate: true })
watch(() => route.query.appointmentId, async (newId) => {
  if (!newId) return
  await nextTick()
  let found = appointments.value.find((a: any) =>
    a.id === newId || (a.groupIds && a.groupIds.includes(newId)),
  )
  if (!found) {
    await refetchAppointments()
    await nextTick()
    found = appointments.value.find((a: any) =>
      a.id === newId || (a.groupIds && a.groupIds.includes(newId)),
    )
  }
  if (found) {
    selectAppointment(found)
    applyPrefill()
    router.replace({ query: {} })
  }
})
</script>
