<template>
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Finanzas</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Dashboard Financiero</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-xl border border-border bg-surface p-0.5 sm:p-1 shadow-sm w-full sm:w-auto">
          <button v-for="period in periods" :key="period.value" @click="selectedPeriod = period.value" :class="['rounded-lg px-3 py-1.5 text-xs font-medium transition-theme flex-1 sm:flex-none text-center', selectedPeriod === period.value ? 'bg-primary text-text-inverse shadow-sm shadow-primary/20' : 'text-text-secondary hover:text-text hover:bg-bg-secondary']">{{ period.label }}</button>
        </div>
        <div class="flex items-center gap-1 rounded-xl border border-border bg-surface px-1.5 py-1 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
          <button @click="goPrev" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Anterior">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <input
            v-if="selectedPeriod === 'month'"
            v-model="selectedMonth"
            type="month"
            class="w-[130px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
          />
          <span v-else class="min-w-[130px] text-center text-xs font-medium text-text px-2">{{ displayLabel }}</span>
          <button @click="goNext" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Siguiente">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          <button type="button" class="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text whitespace-nowrap ml-0.5" @click="resetToCurrent">Ahora</button>
        </div>
      </div>
    </div>
    <!-- Main tabs -->
    <div class="flex rounded-xl border border-border bg-surface p-0.5 mt-4 shadow-sm w-fit">
      <button v-for="tab in mainTabs" :key="tab.key" @click="activeTab = tab.key" :class="['rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200', activeTab === tab.key ? 'bg-primary text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary']">{{ tab.label }}</button>
    </div>
  </header>

  <!-- TAB 1: Resumen -->
  <template v-if="activeTab === 'resumen'">
    <div class="mb-4">
      <KpiCards :income-total="incomeTotal" :ves-income-total="vesIncomeTotal" :tips-total="summaryCtx.tipsTotal" :expense-total="expenseTotal" :net-total="netTotal" :margin="marginTotal" :active-card="activeCard" :is-loading="summaryCtx.isLoading.value" @click-income="toggleCard('income')" @click-expense="toggleCard('expense')" @click-net="toggleCard('net')" />
    </div>
    <Transition name="accordion">
      <CurrencyBreakdown v-if="activeBreakdown" :data="activeBreakdown" class="mb-4" @close="activeCard = null" />
    </Transition>
    <RecentTransactionsCard :transactions="visibleTransactions" :can-view-all="canViewAllTransactions" @view-all="activeTab = 'ingresos'" />
  </template>

  <!-- TAB 2: Ingresos Detallados -->
  <template v-if="activeTab === 'ingresos'">
    <DetailMovimientos :summary-ctx="summaryCtx" :expenses-ctx="expensesCtx" :selected-period="{ value: selectedPeriod }" :selected-month="{ value: selectedMonth }" :business-id="businessId" :hide-tabs="['gastos', 'servicios']" />
  </template>

  <!-- TAB 3: Egresos y Proveedores -->
  <template v-if="activeTab === 'egresos'">
    <DetailMovimientos :summary-ctx="summaryCtx" :expenses-ctx="expensesCtx" :selected-period="{ value: selectedPeriod }" :selected-month="{ value: selectedMonth }" :business-id="businessId" :show-only="'gastos'" />
    <div class="mt-4">
      <SupplierPaymentsSection :ctx="supplierPaymentsCtx" />
    </div>
  </template>

  <ExpenseFormModal :is-open="expensesCtx.showExpenseModal.value" :is-editing="!!expensesCtx.editingExpenseId.value" :form="expensesCtx.expenseForm.value" :save-error="expensesCtx.saveError.value" :is-saving="expensesCtx.saveMutation.isPending.value" @close="expensesCtx.closeModal" @save="handleExpenseSave" />
  <EditCobroModal :show="summaryCtx.showEditModal.value" :summary-ctx="summaryCtx" @close="summaryCtx.cancelEdit()" />
  <CitaFormModal ref="citaModalRef" :servicios="serviciosList" :empleados="empleadosList" @save="handleCitaSaveFromFinanzas" @delete="handleDeleteCita" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { usePeriodSelection } from '../composables/finanzas/usePeriodSelection'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { useExpenses } from '../composables/finanzas/useExpenses'
import { useSupplierPayments } from '../composables/suppliers/useSuppliers'
import KpiCards from '../components/finanzas/KpiCards.vue'
import SupplierPaymentsSection from '../components/finanzas/SupplierPaymentsSection.vue'
import ExpenseFormModal from '../components/finanzas/ExpenseFormModal.vue'
import CurrencyBreakdown from '../components/finanzas/CurrencyBreakdown.vue'
import RecentTransactionsCard from '../components/finanzas/RecentTransactionsCard.vue'
import DetailMovimientos from '../components/finanzas/DetailMovimientos.vue'
import EditCobroModal from '../components/finanzas/EditCobroModal.vue'
import { CitaFormModal } from '../components/modals'
import { useQuery } from '@tanstack/vue-query'
import { api as supabase } from '../lib/api'
import { listServicios } from '../services/serviciosService'
import { listEquipo } from '../services/equipoService'
import { APPOINTMENT_SELECT } from '../services/agendaService'
import { useBusinessStore } from '../store/business'
import type { Cita, PaymentEditContext } from '../types/cita'
import { mapAppointmentToCita } from '../mappers/agendaMapper'
import type { PaymentMethod } from '../types/database'
import { formatMethod } from '../lib/formatters'

const { authStore } = useAuth()
const { formatUSD, formatVESInline } = useCurrency()
const businessStore = useBusinessStore()
const router = useRouter()

const { selectedPeriod, selectedMonth, resetToCurrent, goPrev, goNext, displayLabel, periods } = usePeriodSelection()
const businessId = computed(() => authStore.businessId)

const activeTab = ref<'resumen' | 'ingresos' | 'egresos'>('resumen')
const mainTabs = [
  { key: 'resumen' as const, label: 'Resumen' },
  { key: 'ingresos' as const, label: 'Ingresos' },
  { key: 'egresos' as const, label: 'Egresos' },
]

const expensesCtx = useExpenses(businessId, selectedPeriod, selectedMonth)
const expenses = expensesCtx.expenses
const supplierPaymentsCtx = useSupplierPayments(businessId, selectedPeriod, selectedMonth)
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, expenses, selectedMonth)

const incomeTotal = summaryCtx.incomeTotal
const localIncomeTotal = summaryCtx.localIncomeTotal
const vesIncomeTotal = summaryCtx.vesIncomeTotal
const expenseTotal = computed(() => expensesCtx.expenseTotal.value + supplierPaymentsCtx.paymentTotal.value)
const netTotal = computed(() => localIncomeTotal.value - expenseTotal.value)
const marginTotal = computed(() => (localIncomeTotal.value > 0 ? (netTotal.value / localIncomeTotal.value) * 100 : 0))

const activeCard = ref<'income' | 'expense' | 'net' | null>(null)
const toggleCard = (card: 'income' | 'expense' | 'net') => { activeCard.value = activeCard.value === card ? null : card }

const incomeBreakdown = computed(() => {
  const usdByMethod: Record<string, number> = {}
  const vesByMethod: Record<string, number> = {}
  let totalUSD = 0
  let totalVES = 0
  for (const tx of summaryCtx.transactionsAll.value) {
    if (tx.breakdown && tx.breakdown.length > 0) {
      for (const item of tx.breakdown) {
        if (item.currency === 'VES') { totalVES += item.inputAmount; vesByMethod[item.method] = (vesByMethod[item.method] ?? 0) + item.inputAmount }
        else { totalUSD += item.amount; usdByMethod[item.method] = (usdByMethod[item.method] ?? 0) + item.amount }
      }
    } else if (tx.exchangeRateUsed > 1) {
      const vAmt = tx.amount * tx.exchangeRateUsed; totalVES += vAmt; vesByMethod[tx.rawMethod] = (vesByMethod[tx.rawMethod] ?? 0) + vAmt
    } else { totalUSD += tx.amount; usdByMethod[tx.rawMethod] = (usdByMethod[tx.rawMethod] ?? 0) + tx.amount }
  }
  return {
    title: 'Desglose de Ingresos por moneda', usdTotal: totalUSD, vesTotal: totalVES,
    usdItems: Object.entries(usdByMethod).map(([method, amount]) => ({ label: formatMethod(method), amount })).sort((a, b) => b.amount - a.amount),
    vesItems: Object.entries(vesByMethod).map(([method, amount]) => ({ label: formatMethod(method), amount })).sort((a, b) => b.amount - a.amount),
    usdLabel: 'Método de pago', vesLabel: 'Método de pago',
  }
})

const expenseBreakdown = computed(() => {
  const usdByCat: Record<string, number> = {}
  const vesByCat: Record<string, number> = {}
  let totalUSD = 0
  let totalVES = 0
  for (const exp of expenses.value) {
    if (exp.currency === 'VES') { totalVES += exp.originalAmount; vesByCat[exp.category] = (vesByCat[exp.category] ?? 0) + exp.originalAmount }
    else { totalUSD += exp.amount; usdByCat[exp.category] = (usdByCat[exp.category] ?? 0) + exp.amount }
  }
  return {
    title: 'Desglose de Gastos por moneda', usdTotal: totalUSD, vesTotal: totalVES,
    usdItems: Object.entries(usdByCat).map(([cat, amount]) => ({ label: cat, amount })).sort((a, b) => b.amount - a.amount),
    vesItems: Object.entries(vesByCat).map(([cat, amount]) => ({ label: cat, amount })).sort((a, b) => b.amount - a.amount),
    usdLabel: 'Categoría', vesLabel: 'Categoría',
  }
})

const netBreakdown = computed(() => {
  return {
    title: 'Desglose de Ganancia por moneda',
    usdTotal: Math.max(0, incomeBreakdown.value.usdTotal - expenseBreakdown.value.usdTotal),
    vesTotal: Math.max(0, incomeBreakdown.value.vesTotal - expenseBreakdown.value.vesTotal),
    usdItems: [] as { label: string; amount: number }[],
    vesItems: [] as { label: string; amount: number }[],
    usdLabel: '', vesLabel: '',
  }
})

const activeBreakdown = computed(() => {
  if (activeCard.value === 'income') return incomeBreakdown.value
  if (activeCard.value === 'expense') return expenseBreakdown.value
  if (activeCard.value === 'net') return netBreakdown.value
  return null
})

const visibleTransactions = computed(() => summaryCtx.transactions.value.slice(0, 5))
const canViewAllTransactions = computed(() => summaryCtx.transactions.value.length > 5)

const goToAllRecords = (tipo: string) => {
  router.push({ name: 'admin-finanzas-registros', params: { tipo }, query: { period: selectedPeriod.value, month: selectedMonth.value } })
}

const handleExpenseSave = async () => {
  try { await expensesCtx.handleSave() }
  catch { /* handled by composable */ }
}

const originalStartEdit = summaryCtx.startEdit
summaryCtx.startEdit = (tx: any) => {
  if (tx.appointmentId || tx.appointment_id) {
    openCitaEditFromCobro(tx)
  } else {
    originalStartEdit(tx)
  }
}

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)

const { data: serviciosData } = useQuery({
  queryKey: computed(() => ['finanzas-servicios', businessId.value, businessStore.currentBranchId]),
  queryFn: () => listServicios(businessId.value!, businessStore.currentBranchId),
  enabled: computed(() => !!businessId.value),
})
const serviciosList = computed(() => (serviciosData.value ?? []).map((s: any) => ({
  id: s.id, name: s.name, price: s.price, duration: s.duration,
})))

const { data: empleadosData } = useQuery({
  queryKey: computed(() => ['finanzas-empleados', businessId.value, businessStore.currentBranchId]),
  queryFn: () => listEquipo(businessId.value!, businessStore.currentBranchId),
  enabled: computed(() => !!businessId.value),
})
const empleadosList = computed(() => (empleadosData.value ?? []).map((e: any) => ({
  id: e.id, name: e.name, payType: e.payType, payPercentage: e.payPercentage, disableAgenda: e.disableAgenda,
})))

const handleCitaSaveFromFinanzas = async (data: any) => {
  try {
    await supabase.auth.getSession()
  } catch {}
  try {
    await citaModalRef.value?.close?.()
    summaryCtx.invalidateAll()
  } catch (err) {
    console.error(err)
  }
}

const handleDeleteCita = (id: string) => {
  if (window.confirm('¿Eliminar esta cita?')) {
    supabase.from('appointments').delete().eq('id', id).then(() => {
      summaryCtx.invalidateAll()
    })
  }
}

const openCitaEditFromCobro = async (tx: any) => {
  if (!tx.appointmentId) return
  const { data: cita } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', tx.appointmentId)
    .maybeSingle()
  if (!cita) return

  const paymentData: PaymentEditContext = {
    transactionId: tx.id,
    method: tx.rawMethod || tx.method,
    amount: tx.amount,
    currency: tx.primaryCurrency || 'USD',
    exchangeRate: tx.exchangeRateUsed || 1,
    tipAmount: tx.tipAmount || 0,
    notes: tx.notes || undefined,
    breakdown: tx.breakdown || undefined,
  }
  citaModalRef.value?.open(mapAppointmentToCita(cita), paymentData)
}
</script>

<style>
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}
.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
