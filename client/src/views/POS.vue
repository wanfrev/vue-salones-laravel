<template>
  <FeatureGate feature="pos">
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          <span class="font-medium uppercase tracking-wider">Ventas</span>
        </div>
        <h1 class="text-2xl font-bold text-text lg:text-3xl">Punto de Venta</h1>
        <p class="hidden text-sm text-text-muted sm:block">Registra pagos de servicios y productos</p>
      </div>
      <div class="flex items-center gap-3">
        <ExchangeRateCard
          :is-editable="rateCtx.isEditable.value"
          :edit-rate-value="rateCtx.editRateValue.value"
          :updating-rate="rateCtx.updatingRate.value"
          :display-rate="rateCtx.displayRate.value"
          @update:edit-rate-value="rateCtx.editRateValue.value = $event"
          @update-rate="rateCtx.handleUpdate"
        />
        <RetailProductSearch
          v-if="activeSaleType === 'retail_only'"
          ref="retailSearchRef"
          :products="retailFilteredProducts"
          :client-suggestions="retailClientSuggestions"
          :business-id="businessId"
          :branch-id="branchId"
          @add-product="addRetailProduct"
          @select-client="selectRetailClient"
          @search-clients="onRetailSearchClients"
        />
        <button v-else @click="startRetailOnly" class="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary shadow-sm transition-all duration-200 hover:bg-primary/5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Venta directa
        </button>
      </div>
    </div>
  </header>

  <div v-if="queryError" class="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Error al cargar citas: {{ queryError }}</div>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
      <!-- LEFT PANEL -->
      <AppointmentList
        :overdue="overdueAppointments"
        :upcoming="upcomingAppointments"
        :total-count="filteredAppointments.length"
        :selected-id="selectedId"
        :products="products"
        :inline-product-search="inlineProductSearch"
        :show-inline-dropdown="showInlineDropdown"
        @select="selectAppointment"
        @go-to-calendar="goToAppointmentInCalendar"
        @update:search="appointmentSearch = $event"
        @update:inline-product-search="inlineProductSearch = $event"
        @add-product="addInlineProduct"
        @blur="onInlineBlur" @focus="showInlineDropdown = true"
      />

    <!-- RIGHT PANEL -->
    <div class="space-y-4 lg:sticky lg:top-20 h-fit lg:h-[calc(100vh-6rem)] lg:flex lg:flex-col lg:overflow-hidden">
      <POSPaymentPanel
        :selected-appointment="selectedAppointment"
        :cart="cartCtx.cart.value" :service-price="servicePrice"
        :products-total="cartCtx.productsTotal.value" :cart-count="cartCtx.cart.value.length"
        :grand-total="grandTotal" :payment-method="paymentCtx.paymentMethod.value"
        :other-currency="paymentCtx.otherCurrency.value" :payment-methods="paymentCtx.paymentMethods"
        :mixed-methods="paymentCtx.mixedMethods" :payments-breakdown="paymentCtx.paymentsBreakdown.value"
        :split-remaining="splitRemaining" :is-processing="isProcessing" :can-pay="canPay"
        :notes="paymentCtx.paymentNotes.value" :tip-amount="paymentCtx.tipAmount.value"
        :tip-participants="tipParticipants" :tip-allocations="tipAllocations"
        :tip-allocated-total="tipAllocatedTotal" :tip-remaining="tipRemaining"
        :show-tip-adjust="showTipAdjust" :is-retail-only="activeSaleType === 'retail_only'"
        :retail-client-name="retailClientId ? retailClientSearch : null"
        @select-method="paymentCtx.selectMethod"
        @update:other-currency="paymentCtx.otherCurrency.value = $event"
        @add-split="paymentCtx.addSplit" @remove-split="paymentCtx.removeSplit"
        @update:notes="paymentCtx.paymentNotes.value = $event"
        @update:tip-amount="paymentCtx.tipAmount.value = $event"
        @toggle-tip-adjust="showTipAdjust = !showTipAdjust"
        @set-equal-tip="setEqualTipAllocation"
        @update:tip-allocation="setTipAllocation"
        @process-payment="handleProcessPayment"
        @increment-qty="cartCtx.incrementQty" @decrement-qty="cartCtx.decrementQty" @remove-item="cartCtx.removeItem"
      />
    </div>
  </div>
  </FeatureGate>

  <POSConfirmModal
    :show="showConfirmModal" :grand-total="grandTotal"
    :client-name="confirmClientName" :is-processing="paymentCtx.isProcessing.value"
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
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { listPendingAppointments, listSaleableProducts, posKeys, groupPendingAppointments, recordSale } from '../services/posService'
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
import AppointmentList from '../components/pos/AppointmentList.vue'
import ExchangeRateCard from '../components/finanzas/ExchangeRateCard.vue'
import { useExchangeRate } from '../composables/finanzas/useExchangeRate'
import { posPrefill } from '../composables/pos/usePOSPrefillState'
import { toISODate, minutesToHHmm } from '../lib/formatters'
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
const rateCtx = useExchangeRate()
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const cartCtx = usePOSCart()
const paymentCtx = usePOSPayment()

const activeSaleType = ref<'appointment' | 'retail_only'>('appointment')
const selectedAppointment = ref<any>(null)
const queryError = ref<string | null>(null)
const appointmentSearch = ref('')
const retailProcessing = ref(false)
const inlineProductSearch = ref('')
const showInlineDropdown = ref(false)
const showTipAdjust = ref(false)
const tipAllocations = ref<Record<string, number>>({})
const tipManual = ref(false)

const retailClientSearch = ref('')
const retailClientId = ref<string | null>(null)
const retailClientSuggestions = ref<{ id: string; full_name: string; phone: string }[]>([])
const retailSearchRef = ref<InstanceType<typeof RetailProductSearch> | null>(null)

const { data: appointmentsData } = useQuery({
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
  id: s.id, name: s.name, price: s.price, duration: s.duration,
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

const addRetailProduct = (product: any) => { cartCtx.addProduct(product); retailSearchRef.value?.reset() }
const addInlineProduct = (product: any) => { cartCtx.addProduct(product); inlineProductSearch.value = ''; showInlineDropdown.value = false }
const onInlineBlur = () => setTimeout(() => { showInlineDropdown.value = false }, 150)

const selectRetailClient = (client: { id: string; full_name: string; phone: string }) => {
  retailClientId.value = client.id
  retailClientSearch.value = client.full_name
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
  const appt = selectedAppointment.value
  if (!appt) return 0
  if (Array.isArray(appt.members) && appt.members.length > 0) return appt.members.reduce((sum: number, m: any) => sum + Number(m.price ?? 0), 0)
  if (appt.groupPrice != null) return appt.groupPrice
  return appt.price_override != null ? Number(appt.price_override) : Number(appt.service?.price ?? appt.services?.price ?? 0)
})

const grandTotal = computed(() => activeSaleType.value === 'retail_only' ? cartCtx.productsTotal.value : servicePrice.value + cartCtx.productsTotal.value + paymentCtx.tipAmount.value)

const tipParticipants = computed<TipParticipant[]>(() => {
  if (activeSaleType.value === 'retail_only' || !selectedAppointment.value) return []
  const appt = selectedAppointment.value
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
const setEqualTipAllocation = () => { tipAllocations.value = distributeEqualTip(paymentCtx.tipAmount.value, tipParticipants.value); tipManual.value = false }
const tipAllocatedTotal = computed(() => tipParticipants.value.reduce((sum, p) => sum + Number(tipAllocations.value[p.employeeId] ?? 0), 0))
const tipRemaining = computed(() => Number((paymentCtx.tipAmount.value - tipAllocatedTotal.value).toFixed(2)))
const normalizedTipAllocations = computed(() => tipParticipants.value.map(p => ({ employee_id: p.employeeId, amount: Number((tipAllocations.value[p.employeeId] ?? 0).toFixed(2)) })).filter(x => x.amount > 0))

watch([tipParticipants, () => selectedId.value], () => { setEqualTipAllocation(); showTipAdjust.value = false }, { immediate: true })
watch(() => paymentCtx.tipAmount.value, () => { if (!tipManual.value) setEqualTipAllocation() })

const splitRemaining = computed(() =>
  paymentCtx.paymentMethod.value === 'mixed'
    ? Math.max(0, grandTotal.value - paymentCtx.paymentsBreakdown.value.reduce((sum: number, s: any) => sum + (s.currency === 'VES' ? (s.inputAmount || 0) / exchangeRate.value : (s.inputAmount || 0)), 0))
    : 0
)
const isProcessing = computed(() => paymentCtx.isProcessing.value || retailProcessing.value)
const canPay = computed(() => {
  if (grandTotal.value <= 0) return false
  if (activeSaleType.value !== 'retail_only' && paymentCtx.tipAmount.value > 0 && tipParticipants.value.length > 0 && Math.abs(tipRemaining.value) >= 0.01) return false
  if (paymentCtx.paymentMethod.value === 'mixed') {
    const total = paymentCtx.paymentsBreakdown.value.reduce((sum: number, s: any) => sum + (s.currency === 'VES' ? (s.inputAmount || 0) / exchangeRate.value : (s.inputAmount || 0)), 0)
    return Math.abs(total - grandTotal.value) < 0.01 && paymentCtx.paymentsBreakdown.value.length > 0
  }
  return true
})

const selectAppointment = (appt: any) => {
  if (selectedAppointment.value?.id === appt.id) { selectedAppointment.value = null; cartCtx.clearCart(); paymentCtx.reset(); return }
  selectedAppointment.value = appt; activeSaleType.value = 'appointment'
  cartCtx.clearCart()
  setEqualTipAllocation()
}
const goToAppointmentInCalendar = (appt: any) => {
  const startDate = new Date(appt.start_time)
  const minutes = startDate.getHours() * 60 + startDate.getMinutes()
  const isGroup = !!(appt.isGroup || appt.group_id)
  const cita: Cita = {
    id: appt.id,
    clientName: appt.client?.full_name ?? appt.clients?.full_name ?? 'Cliente',
    clientId: appt.client_id,
    clientPhone: appt.client?.phone ?? appt.clients?.phone ?? '',
    service: appt.services?.name ?? (appt.service?.name ?? appt.services?.name) ?? '',
    serviceId: appt.service_id,
    employee: appt.employee_profile?.full_name ?? appt.profiles?.full_name ?? '',
    employeeId: appt.employee_id,
    date: toISODate(startDate),
    time: minutesToHHmm(minutes),
    duration: appt.duration_override ?? appt.service?.duration_minutes ?? appt.services?.duration_minutes ?? 30,
    price: appt.price_override != null ? Number(appt.price_override) : Number(appt.service?.price ?? appt.services?.price ?? 0),
    status: appt.status || 'pending',
    notes: appt.notes || undefined,
    groupId: appt.group_id || undefined,
  }
  posCitaModalRef.value?.open(cita)
}
const startRetailOnly = () => { selectedAppointment.value = null; activeSaleType.value = 'retail_only'; cartCtx.clearCart(); paymentCtx.reset(); retailProductSearch.value = ''; retailClientSearch.value = ''; retailClientId.value = null; retailClientSuggestions.value = []; retailSearchRef.value?.reset(); tipAllocations.value = {}; tipManual.value = false; showTipAdjust.value = false }
const setTipAllocation = (employeeId: string, value: number) => { tipManual.value = true; tipAllocations.value = { ...tipAllocations.value, [employeeId]: Math.max(0, Number(value || 0)) } }

const handleRetailPayment = async () => {
  if (retailProcessing.value || cartCtx.cart.value.length === 0) return
  retailProcessing.value = true
  try {
    const ok = await paymentCtx.processDirectSale(
      cartCtx.productsTotal.value,
      cartCtx.cart.value,
      exchangeRate.value,
      formatDual,
      retailClientId.value,
    )
    if (ok) { cartCtx.clearCart(); paymentCtx.reset() }
  } finally { retailProcessing.value = false }
}

const handleGroupPayment = async (appt: any) => {
  const groupIds: string[] = appt.groupIds
  const members: any[] = appt.members ?? []; const groupPrice: number = appt.groupPrice
  const products = cartCtx.cart.value; const method = paymentCtx.paymentMethod.value
  const serviceTotal = servicePrice.value; const productsTotal = cartCtx.productsTotal.value
  if (groupPrice <= 0 || !members.length) { showError('Precio inválido'); return }

  paymentCtx.isProcessing.value = true
  try {
    const exchangeRt = exchangeRate.value; const notes = paymentCtx.paymentNotes.value
    const breakdownSource = paymentCtx.paymentsBreakdown.value
    let methodBreakdowns: any[]
    if (method !== 'mixed') {
      const pMethodObj = paymentCtx.paymentMethods.find((m: any) => m.value === method)
      const currency = (pMethodObj?.currency as string) ?? paymentCtx.otherCurrency.value
      methodBreakdowns = [{ method, inputAmount: currency === 'VES' ? grandTotal.value * exchangeRt : grandTotal.value, currency, amount: grandTotal.value }]
    } else {
      methodBreakdowns = breakdownSource.map((item: any) => ({ ...item, amount: item.currency === 'VES' ? item.inputAmount / exchangeRt : item.inputAmount }))
    }

    let remainingService = serviceTotal
    const employeeTotalPrice = new Map<string, number>()
    for (const m of members) { if (m.employeeId) employeeTotalPrice.set(m.employeeId, (employeeTotalPrice.get(m.employeeId) ?? 0) + m.price) }

    for (let i = 0; i < groupIds.length; i++) {
      const isLast = i === groupIds.length - 1; const proportion = members[i].price / groupPrice
      const serviceShare = isLast ? Math.max(0, Math.round(remainingService * 100) / 100) : Math.round(serviceTotal * proportion * 100) / 100
      if (!isLast) remainingService -= serviceShare

      const amount = i === 0 ? serviceShare + productsTotal : serviceShare
      const amountWithoutProducts = serviceShare
      const productsForThis = i === 0 ? productsTotal : 0
      const employeeId = members[i]?.employeeId
      const fullTip = employeeId ? (tipAllocations.value[employeeId] ?? 0) : 0
      const memberServices = members.filter(m => m.employeeId === employeeId).length
      const memberTip = Number(((memberServices > 0 ? fullTip / memberServices : 0)).toFixed(2))
      // Store the full payment breakdown (not proportional) so the edit card shows real amounts
      const memberBreakdown = methodBreakdowns.map(b => ({ ...b }))

      const saleParams = {
        appointmentId: groupIds[i],
        serviceAmount: i === 0 ? amountWithoutProducts : amount,
        amount: i === 0 ? amount : amount,
        productsAmount: i === 0 ? productsForThis : 0,
        method: method as PaymentMethod,
        products: i === 0 ? products : [],
        notes,
        exchangeRate: exchangeRt,
        paymentsBreakdown: memberBreakdown as any,
        businessId: businessId.value!,
        branchId: branchId.value,
        tipAmount: memberTip,
      }
      await recordSale(saleParams)
    }
    showSuccess(`Cobro registrado correctamente`); selectedAppointment.value = null; cartCtx.clearCart(); paymentCtx.reset()
    await Promise.allSettled([
      queryClient.invalidateQueries({ exact: false, queryKey: ['pos-pending'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['inventario'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['appointments'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ exact: false, queryKey: ['supplier-payments'] }),
    ])
    await Promise.allSettled([
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-transactions'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-summary'] }),
      queryClient.refetchQueries({ exact: false, queryKey: ['finanzas-product-sales'] }),
    ])
  } catch (err: any) { showError(err?.message ?? 'Error al procesar pago') }
  finally { paymentCtx.isProcessing.value = false }
}

const showConfirmModal = ref(false)
const confirmClientName = computed(() => activeSaleType.value === 'retail_only' ? null : (selectedAppointment.value?.client?.full_name ?? selectedAppointment.value?.clients?.full_name) || null)
const handleProcessPayment = () => { if (grandTotal.value > 0) showConfirmModal.value = true }
const cancelPayment = () => { showConfirmModal.value = false }

const confirmPayment = async () => {
  showConfirmModal.value = false
  if (activeSaleType.value === 'retail_only') { await handleRetailPayment(); return }
  if (!selectedAppointment.value) return
  const appt = selectedAppointment.value
  if (appt.isGroup && appt.groupIds?.length > 1) { await handleGroupPayment(appt); return }
  const ok = await paymentCtx.processPayment(appt.id, servicePrice.value, cartCtx.cart.value, exchangeRate.value, formatDual, normalizedTipAllocations.value, cartCtx.productsTotal.value)
  if (ok) { selectedAppointment.value = null; cartCtx.clearCart(); paymentCtx.reset() }
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
    router.replace({ query: {} })
    applyPrefill()
  }
}

const applyPrefill = () => {
  const prefill = posPrefill.value
  if (!prefill) return
  posPrefill.value = null

  const method = prefill.paymentMethod as PaymentMethod
  const isMixed = method === 'mixed' || (prefill.breakdown && prefill.breakdown.length > 1)

  paymentCtx.paymentMethod.value = isMixed ? 'mixed' : method
  paymentCtx.otherCurrency.value = prefill.paymentCurrency

  if (isMixed && prefill.breakdown && prefill.breakdown.length > 0) {
    paymentCtx.paymentsBreakdown.value = [...prefill.breakdown]
  } else if (!isMixed && prefill.breakdown && prefill.breakdown.length === 1) {
    const b = prefill.breakdown[0]
    paymentCtx.paymentMethod.value = b.method as PaymentMethod
    paymentCtx.otherCurrency.value = b.currency
  } else {
    paymentCtx.paymentsBreakdown.value = []
  }

  paymentCtx.tipAmount.value = prefill.tipAmount ?? 0
  paymentCtx.paymentNotes.value = prefill.notes ?? ''

  if (prefill.products && prefill.products.length > 0) {
    cartCtx.clearCart()
    for (const p of prefill.products) {
      cartCtx.cart.value.push({
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
watch(() => route.query.appointmentId, () => { tryAutoSelect() })
</script>
