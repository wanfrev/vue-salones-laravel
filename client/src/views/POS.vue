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
        <div v-if="activeSaleType === 'retail_only'" class="relative w-full sm:w-72">
          <input v-model="retailProductSearch" type="text" placeholder="Buscar producto..."
            class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
            @focus="showRetailDropdown = true" @blur="onRetailBlur" />
          <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div v-if="showRetailDropdown && retailFilteredProducts.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            <button v-for="product in retailFilteredProducts" :key="product.id"
              @mousedown.prevent="addRetailProduct(product)"
              :disabled="Number(product.available_qty ?? 0) <= 0"
              class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50 border-b border-border last:border-b-0">
              <div class="flex-1 min-w-0"><span class="text-text block truncate">{{ product.name }}</span><span class="text-xs text-text-muted">Stock: {{ Number(product.available_qty ?? 0) }}</span></div>
              <span class="text-text-muted text-xs whitespace-nowrap font-medium">{{ formatDual(product.unit_price) }}</span>
            </button>
          </div>
        </div>
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
    <div class="space-y-3">
      <div class="relative mb-3">
        <input v-model="appointmentSearch" type="text" placeholder="Buscar cliente..."
          class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <!-- Overdue appointments -->
      <div v-if="overdueAppointments.length > 0" class="rounded-xl border border-border bg-surface p-4 mb-3">
        <div class="flex items-center gap-2 mb-3">
          <svg class="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h3 class="text-sm font-semibold text-text">Citas realizadas</h3>
          <span class="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">{{ overdueAppointments.length }}</span>
        </div>
        <div class="space-y-1.5">
          <POSAppointmentCard
            v-for="appt in overdueAppointments" :key="appt.id"
            :appt="appt" :is-selected="selectedId === appt.id"
            :products="products" :inline-product-search="inlineProductSearch"
            :show-inline-dropdown="showInlineDropdown" variant="overdue"
            @select="selectAppointment" @go-to-calendar="goToAppointmentInCalendar"
            @update:inline-product-search="inlineProductSearch = $event"
            @add-product="addInlineProduct" @blur="onInlineBlur"
          />
        </div>
      </div>

      <!-- Upcoming appointments -->
      <div v-if="upcomingAppointments.length > 0" class="rounded-xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <h3 class="text-sm font-semibold text-text">Citas pendientes</h3>
          <span class="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{{ upcomingAppointments.length }}</span>
        </div>
        <div class="space-y-1.5">
          <POSAppointmentCard
            v-for="appt in upcomingAppointments" :key="appt.id"
            :appt="appt" :is-selected="selectedId === appt.id"
            :products="products" :inline-product-search="inlineProductSearch"
            :show-inline-dropdown="showInlineDropdown" variant="upcoming"
            @select="selectAppointment" @go-to-calendar="goToAppointmentInCalendar"
            @update:inline-product-search="inlineProductSearch = $event"
            @add-product="addInlineProduct" @blur="onInlineBlur"
          />
        </div>
      </div>

      <div v-if="filteredAppointments.length === 0" class="py-6 text-center text-sm text-text-muted rounded-xl border border-border bg-surface p-4">
        {{ appointmentSearch ? 'Sin resultados' : 'No hay citas pendientes de pago' }}
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div class="space-y-4 lg:sticky lg:top-20 h-fit">
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { listPendingAppointments, listSaleableProducts, posKeys, groupPendingAppointments, recordSale, recordPaymentOnly } from '../services/posService'
import { sellProduct } from '../services/inventarioService'
import { usePOSCart } from '../composables/pos/usePOSCart'
import { usePOSPayment } from '../composables/pos/usePOSPayment'
import { FeatureGate } from '../components/common'
import POSPaymentPanel from '../components/pos/POSPaymentPanel.vue'
import POSAppointmentCard from '../components/pos/POSAppointmentCard.vue'
import POSConfirmModal from '../components/pos/POSConfirmModal.vue'

interface TipParticipant { employeeId: string; employeeName: string }

const { authStore } = useAuth()
const router = useRouter()
const { exchangeRate, formatDual } = useCurrency()
const { error: showError, success: showSuccess } = useNotification()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const cartCtx = usePOSCart()
const paymentCtx = usePOSPayment()

const activeSaleType = ref<'appointment' | 'retail_only'>('appointment')
const selectedAppointment = ref<any>(null)
const queryError = ref<string | null>(null)
const appointmentSearch = ref('')
const retailProcessing = ref(false)
const retailProductSearch = ref('')
const showRetailDropdown = ref(false)
const inlineProductSearch = ref('')
const showInlineDropdown = ref(false)
const showTipAdjust = ref(false)
const tipAllocations = ref<Record<string, number>>({})
const tipManual = ref(false)

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
  enabled: computed(() => !!businessId.value),
})

const appointments = computed(() => groupPendingAppointments(appointmentsData.value ?? []))
const products = computed(() => productsData.value ?? [])
const selectedId = computed(() => selectedAppointment.value?.id ?? null)

const normalize = (s: string): string => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const filteredAppointments = computed(() => {
  if (!appointmentSearch.value) return appointments.value
  const q = normalize(appointmentSearch.value)
  const rawQ = appointmentSearch.value.toLowerCase()
  return appointments.value.filter((a: any) => {
    const name = normalize(a.clients?.full_name ?? '')
    const phone = (a.clients?.phone ?? '').replace(/\D/g, '')
    return name.startsWith(q) || phone.startsWith(rawQ) || normalize(a.services?.name ?? '').startsWith(q)
  })
})
const now = computed(() => new Date())
const overdueAppointments = computed(() => filteredAppointments.value.filter(a => new Date(a.start_time) <= now.value))
const upcomingAppointments = computed(() => filteredAppointments.value.filter(a => new Date(a.start_time) > now.value))

const filterProducts = (query: string): any[] => {
  if (!query) return (products.value as any[]).filter((p: any) => Number(p.available_qty ?? 0) > 0).slice(0, 6)
  return (products.value as any[]).filter((p: any) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
}
const retailFilteredProducts = computed(() => filterProducts(retailProductSearch.value))

const addRetailProduct = (product: any) => { cartCtx.addProduct(product); retailProductSearch.value = ''; showRetailDropdown.value = false }
const addInlineProduct = (product: any) => { cartCtx.addProduct(product); inlineProductSearch.value = ''; showInlineDropdown.value = false }
const onRetailBlur = () => setTimeout(() => { showRetailDropdown.value = false }, 150)
const onInlineBlur = () => setTimeout(() => { showInlineDropdown.value = false }, 150)

const servicePrice = computed(() => {
  const appt = selectedAppointment.value
  if (!appt) return 0
  if (Array.isArray(appt.members) && appt.members.length > 0) return appt.members.reduce((sum: number, m: any) => sum + Number(m.price ?? 0), 0)
  if (appt.groupPrice != null) return appt.groupPrice
  return appt.price_override != null ? Number(appt.price_override) : Number(appt.services?.price ?? 0)
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
  if (appt.employee_id) result.push({ employeeId: appt.employee_id, employeeName: appt.profiles?.full_name ?? 'Empleado' })
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
  if (activeSaleType.value !== 'retail_only') cartCtx.clearCart()
  setEqualTipAllocation()
}
const goToAppointmentInCalendar = (appt: any) => router.push({ name: 'admin-calendario', query: { fecha: new Date(appt.start_time).toISOString().slice(0, 10) } })
const startRetailOnly = () => { selectedAppointment.value = null; activeSaleType.value = 'retail_only'; cartCtx.clearCart(); paymentCtx.reset(); retailProductSearch.value = ''; tipAllocations.value = {}; tipManual.value = false; showTipAdjust.value = false }
const setTipAllocation = (employeeId: string, value: number) => { tipManual.value = true; tipAllocations.value = { ...tipAllocations.value, [employeeId]: Math.max(0, Number(value || 0)) } }

const handleRetailPayment = async () => {
  if (retailProcessing.value || cartCtx.cart.value.length === 0) return
  retailProcessing.value = true
  try {
    const method = paymentCtx.paymentMethod.value
    const currency = paymentCtx.paymentMethods.find((m: any) => m.value === method)?.currency ?? paymentCtx.otherCurrency.value
    const rate = exchangeRate.value
    for (const item of cartCtx.cart.value) {
      const saleCurrency = method === 'other' ? paymentCtx.otherCurrency.value : (currency as 'USD' | 'VES') ?? 'USD'
      await sellProduct(businessId.value!, item.productId, item.quantity, paymentCtx.paymentNotes.value || `POS Venta directa`, null, item.unitPrice, rate, saleCurrency, branchId.value)
    }
    cartCtx.clearCart(); paymentCtx.reset()
  } catch (err) { showError((err as any)?.message ?? 'Error al procesar') }
  finally { retailProcessing.value = false }
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
      const employeeId = members[i]?.employeeId
      const fullTip = employeeId ? (tipAllocations.value[employeeId] ?? 0) : 0
      const tipProportion = employeeId && fullTip > 0 ? members[i].price / (employeeTotalPrice.get(employeeId) ?? 1) : 0
      const memberTip = Number((fullTip * tipProportion).toFixed(2))
      const memberBreakdown = methodBreakdowns.map(b => ({ ...b, inputAmount: Math.round(b.inputAmount * proportion * 100) / 100, amount: Math.round(b.amount * proportion * 100) / 100 }))

      if (i === 0) {
        await recordSale({ appointmentId: groupIds[i], amount, method: method as any, products, notes, exchangeRate: exchangeRt, paymentsBreakdown: memberBreakdown as any, businessId: businessId.value!, branchId: branchId.value, tipAmount: memberTip })
      } else {
        await recordPaymentOnly({ appointmentId: groupIds[i], amount, method: method as any, notes, exchangeRate: exchangeRt, paymentsBreakdown: memberBreakdown as any, tipAmount: memberTip })
      }
    }
    showSuccess(`Cobro registrado correctamente`); selectedAppointment.value = null; cartCtx.clearCart(); paymentCtx.reset()
  } catch (err: any) { showError(err?.message ?? 'Error al procesar pago') }
  finally { paymentCtx.isProcessing.value = false }
}

const showConfirmModal = ref(false)
const confirmClientName = computed(() => activeSaleType.value === 'retail_only' ? null : selectedAppointment.value?.clients?.full_name || null)
const handleProcessPayment = () => { if (grandTotal.value > 0) showConfirmModal.value = true }
const cancelPayment = () => { showConfirmModal.value = false }

const confirmPayment = async () => {
  showConfirmModal.value = false
  if (activeSaleType.value === 'retail_only') { await handleRetailPayment(); return }
  if (!selectedAppointment.value) return
  const appt = selectedAppointment.value
  if (appt.isGroup && appt.groupIds?.length > 1) { await handleGroupPayment(appt); return }
  const ok = await paymentCtx.processPayment(appt.id, grandTotal.value, cartCtx.cart.value, exchangeRate.value, formatDual, normalizedTipAllocations.value)
  if (ok) { selectedAppointment.value = null; cartCtx.clearCart(); paymentCtx.reset() }
}
</script>
