<template>
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <DollarIcon class="h-3.5 w-3.5" />
          <span>Finanzas</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Dashboard Financiero</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-xl border border-border bg-surface p-0.5 sm:p-1 shadow-sm w-full sm:w-auto">
          <button v-for="period in periods" :key="period.value" @click="selectedPeriod = period.value" :class="['rounded-lg px-3 py-1.5 text-xs font-medium transition-theme flex-1 sm:flex-none text-center', selectedPeriod === period.value ? 'bg-primary text-text-inverse shadow-sm shadow-primary/20' : 'text-text-secondary hover:text-text hover:bg-bg-secondary']">{{ period.label }}</button>
        </div>
        <div class="flex items-center gap-1 rounded-xl border border-border bg-surface px-1.5 py-1 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
          <button v-if="selectedPeriod !== 'custom'" @click="goPrev" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Anterior">
            <ArrowLeftIcon class="h-3.5 w-3.5" />
          </button>
          <input
            v-if="selectedPeriod === 'day'"
            type="date"
            :value="selectedMonth"
            @change="onDayChange"
            class="w-[130px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
          />
          <input
            v-else-if="selectedPeriod === 'month'"
            v-model="selectedMonth"
            type="month"
            class="w-[130px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
          />
          <template v-else-if="selectedPeriod === 'custom'">
            <input
              type="date"
              :value="customFrom"
              @change="onCustomFromChange"
              class="w-[120px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
            />
            <span class="text-xs text-text-muted">—</span>
            <input
              type="date"
              :value="customTo"
              @change="onCustomToChange"
              class="w-[120px] rounded-md border border-border bg-surface px-2 py-1 text-xs text-text text-center outline-none transition-theme focus:border-primary"
            />
          </template>
          <span v-else class="min-w-[130px] text-center text-xs font-medium text-text px-2">{{ displayLabel }}</span>
          <button v-if="selectedPeriod !== 'custom'" @click="goNext" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" title="Siguiente">
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </button>
          <button type="button" class="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text whitespace-nowrap ml-0.5" @click="resetToCurrent">{{ selectedPeriod === 'custom' ? 'Hoy' : 'Ahora' }}</button>
        </div>
        <ExchangeRateCard
          :is-editable="rateCtx.isEditable.value"
          :edit-rate-value="rateCtx.editRateValue.value"
          :updating-rate="rateCtx.updatingRate.value"
          :display-rate="rateCtx.displayRate.value"
          @update:edit-rate-value="rateCtx.editRateValue.value = $event"
          @update-rate="rateCtx.handleUpdate"
        />
      </div>
    </div>
    <!-- Main tabs -->
    <div class="flex rounded-xl border border-border bg-surface p-0.5 mt-4 shadow-sm w-fit">
      <button v-for="tab in mainTabs" :key="tab.key" @click="activeTab = tab.key" :class="['rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200', activeTab === tab.key ? 'bg-primary text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary']">{{ tab.label }}</button>
    </div>
  </header>

  <!-- TAB 1: Resumen -->
  <template v-if="activeTab === 'resumen'">
    <div v-if="!hideFinancialDashboard" class="mb-4">
      <KpiCards :income-total="incomeTotal" :ves-income-total="vesIncomeTotal" :tips-total="summaryCtx.tipsTotal" :expense-total="expenseTotal" :net-total="netTotal" :margin="marginTotal" :active-card="activeCard" :is-loading="summaryCtx.isLoading.value" @click-income="toggleCard('income')" @click-expense="toggleCard('expense')" @click-net="toggleCard('net')" />
    </div>
    <Transition name="accordion">
      <CurrencyBreakdown v-if="activeBreakdown" :data="activeBreakdown" class="mb-4" @close="activeCard = null" />
    </Transition>
    <RecentTransactionsCard :transactions="visibleTransactions" :can-view-all="canViewAllTransactions" @view-all="activeTab = 'ingresos'" />
  </template>

  <!-- TAB 2: Ingresos Detallados -->
  <template v-if="activeTab === 'ingresos'">
    <DetailMovimientos :summary-ctx="summaryCtx" :expenses-ctx="expensesCtx" :selected-period="{ value: selectedPeriod }" :selected-month="{ value: selectedMonth }" :business-id="businessId" :hide-tabs="ingresosHideTabs" :hide-total="hideFinancialDashboard" />
  </template>

  <!-- TAB 3: Egresos, Proveedores y Nómina -->
  <template v-if="activeTab === 'egresos'">
    <DetailMovimientos :summary-ctx="summaryCtx" :expenses-ctx="expensesCtx" :selected-period="{ value: selectedPeriod }" :selected-month="{ value: selectedMonth }" :business-id="businessId" :show-only="'gastos'" />
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SupplierPaymentsSection :ctx="supplierPaymentsCtx" />
      <EmployeePaymentsSection :business-id="businessId" />
    </div>
  </template>

  <ExpenseFormModal :is-open="expensesCtx.showExpenseModal.value" :is-editing="!!expensesCtx.editingExpenseId.value" :form="expensesCtx.expenseForm.value" :save-error="expensesCtx.saveError.value" :form-errors="expensesCtx.formErrors.value" :is-saving="expensesCtx.saveMutation.isPending.value" @close="expensesCtx.closeModal" @save="handleExpenseSave" />
  <EditCobroModal :show="summaryCtx.showEditModal.value" :summary-ctx="summaryCtx" @close="summaryCtx.cancelEdit()" />
  <CobroActionsModal
    :show="cobroActionsShow"
    :cita="cobroActionsCita"
    :payment-data="cobroActionsPayment"
    :transaction-ids="cobroActionsTxIds"
    @close="cobroActionsShow = false"
    @rollback="handleRollbackCobro"
    @delete="handleDeleteCobroAction"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { usePeriodSelection } from '../composables/finanzas/usePeriodSelection'
import { resolvePeriodDates } from '../lib/periodUtils'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { useExpenses } from '../composables/finanzas/useExpenses'
import { useSupplierPayments } from '../composables/suppliers/useSuppliers'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import KpiCards from '../components/finanzas/KpiCards.vue'
import SupplierPaymentsSection from '../components/finanzas/SupplierPaymentsSection.vue'
import EmployeePaymentsSection from '../components/finanzas/EmployeePaymentsSection.vue'
import ExpenseFormModal from '../components/finanzas/ExpenseFormModal.vue'
import CurrencyBreakdown from '../components/finanzas/CurrencyBreakdown.vue'
import RecentTransactionsCard from '../components/finanzas/RecentTransactionsCard.vue'
import DetailMovimientos from '../components/finanzas/DetailMovimientos.vue'
import EditCobroModal from '../components/finanzas/EditCobroModal.vue'
import CobroActionsModal from '../components/finanzas/CobroActionsModal.vue'
import ExchangeRateCard from '../components/finanzas/ExchangeRateCard.vue'
import { useExchangeRate } from '../composables/finanzas/useExchangeRate'
import { useQueryClient } from '@tanstack/vue-query'
import { db } from '../lib/api'
import { APPOINTMENT_SELECT } from '../services/agendaService'
import { type Cita, type PaymentEditContext } from '../types/cita'
import { mapAppointmentToCita } from '../mappers/agendaMapper'
import { translateError } from '../lib/errors'
import { formatMethod } from '../lib/formatters'
import { useNotification } from '../composables/common/useNotification'
import { isEncargado } from '../constants/roles'
import { useBusinessStore } from '../store/business'
import { DollarIcon, ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const { formatUSD, formatVESInline } = useCurrency()
const router = useRouter()
const rateCtx = useExchangeRate()
const businessStore = useBusinessStore()
const hideFinancialDashboard = computed(() => authStore.role !== 'superadmin')

// Cobros de Citas has nothing to show when the business runs with agenda/calendario/
// servicios all off (tienda niche) — there's no appointment flow to have collected income
// from. Superadmin can re-enable any of the three independently, so all three are checked
// rather than assuming they stay bundled.
const ingresosHideTabs = computed(() => {
  const tabs = ['gastos', 'servicios']
  const { agenda, calendario, servicios } = businessStore.features
  if (!agenda && !calendario && !servicios) tabs.push('cobros')
  return tabs
})

const { selectedPeriod, selectedMonth, customFrom, customTo, resetToCurrent, goPrev, goNext, displayLabel, periods } = usePeriodSelection()
const businessId = computed(() => authStore.businessId)

function onDayChange(e: Event) {
  selectedMonth.value = (e.target as HTMLInputElement).value
}
function onCustomFromChange(e: Event) {
  customFrom.value = (e.target as HTMLInputElement).value
}
function onCustomToChange(e: Event) {
  customTo.value = (e.target as HTMLInputElement).value
}

const activeTab = ref<'resumen' | 'ingresos' | 'egresos'>('resumen')
const mainTabs = [
  { key: 'resumen' as const, label: 'Resumen' },
  { key: 'ingresos' as const, label: 'Ingresos' },
  { key: 'egresos' as const, label: 'Egresos' },
]

const periodDates = computed(() => {
  const key = selectedPeriod.value === 'custom' ? customFrom.value : selectedMonth.value
  return resolvePeriodDates(selectedPeriod.value, key, customTo.value)
})

const expensesCtx = useExpenses(businessId, selectedPeriod, selectedMonth, customFrom, customTo)
const expenses = expensesCtx.expenses
const supplierPaymentsCtx = useSupplierPayments(businessId, selectedPeriod, selectedMonth, customFrom, customTo)
const employeePaymentsCtx = useEmployeePayments(businessId, periodDates)
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, expenses, selectedMonth, customTo)

const incomeTotal = summaryCtx.incomeTotal
const localIncomeTotal = summaryCtx.localIncomeTotal
const vesIncomeTotal = summaryCtx.vesIncomeTotal
const employeePaymentTotal = computed(() => {
  return (employeePaymentsCtx.paymentsMade.value ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
})
const expenseTotal = computed(() => expensesCtx.expenseTotal.value + supplierPaymentsCtx.paymentTotal.value + employeePaymentTotal.value)
const netTotal = computed(() => incomeTotal.value - expenseTotal.value)
const marginTotal = computed(() => (incomeTotal.value > 0 ? (netTotal.value / incomeTotal.value) * 100 : 0))

const activeCard = ref<'income' | 'expense' | 'net' | null>(null)
const toggleCard = (card: 'income' | 'expense' | 'net') => { activeCard.value = activeCard.value === card ? null : card }

const incomeBreakdown = computed(() => {
  const usdByMethod: Record<string, number> = {}
  const vesByMethod: Record<string, number> = {}
  let totalUSD = 0
  let totalVES = 0

  const addIncome = (method: string, usdAmt: number, vesAmt: number) => {
    if (usdAmt > 0) { totalUSD += usdAmt; usdByMethod[method] = (usdByMethod[method] ?? 0) + usdAmt }
    if (vesAmt > 0) { totalVES += vesAmt; vesByMethod[method] = (vesByMethod[method] ?? 0) + vesAmt }
  }

  for (const tx of summaryCtx.transactionsAll.value) {
    if (tx.breakdown && tx.breakdown.length > 0) {
      for (const item of tx.breakdown) {
        if (item.currency === 'VES') addIncome(item.method, 0, item.inputAmount)
        else addIncome(item.method, item.amount, 0)
      }
    } else {
      const method = tx.rawMethod as string
      const isVesMethod = ['cash_ves', 'transfer', 'pago_movil', 'punto_venta'].includes(method)
      if (isVesMethod) {
        addIncome(tx.rawMethod, 0, tx.amount * (tx.exchangeRateUsed || 1))
      } else {
        addIncome(tx.rawMethod, tx.amount, 0)
      }
    }
  }

  return {
    title: 'Desglose de Ingresos', usdTotal: totalUSD, vesTotal: totalVES,
    usdItems: Object.entries(usdByMethod).map(([method, amount]) => ({ label: formatMethod(method), amount })).sort((a, b) => b.amount - a.amount),
    vesItems: Object.entries(vesByMethod).map(([method, amount]) => ({ label: formatMethod(method), amount })).sort((a, b) => b.amount - a.amount),
    usdLabel: 'Método de pago', vesLabel: 'Método de pago',
  }
})

const expenseBreakdown = computed(() => {
  let totalUSD = 0
  let totalVES = 0
  const usdItems: { label: string; amount: number }[] = []
  const vesItems: { label: string; amount: number }[] = []

  let opUSD = 0, opVES = 0
  for (const exp of expenses.value) {
    if (exp.currency === 'VES') { opVES += exp.originalAmount; totalVES += exp.originalAmount }
    else { opUSD += exp.amount; totalUSD += exp.amount }
  }

  let supUSD = 0, supVES = 0
  for (const pay of supplierPaymentsCtx.payments.value) {
    if (pay.currency === 'VES') { supVES += pay.originalAmount; totalVES += pay.originalAmount }
    else { supUSD += pay.amount; totalUSD += pay.amount }
  }

  let empUSD = 0, empVES = 0
  for (const p of employeePaymentsCtx.paymentsMade.value) {
    if (p.currency === 'VES') { empVES += p.originalAmount; totalVES += p.originalAmount }
    else { empUSD += p.amount; totalUSD += p.amount }
  }

  if (opUSD > 0) usdItems.push({ label: 'Gastos Operativos (USD)', amount: opUSD })
  if (supUSD > 0) usdItems.push({ label: 'Abonos a Proveedores (USD)', amount: supUSD })
  if (empUSD > 0) usdItems.push({ label: 'Pagos de Nómina (USD)', amount: empUSD })

  if (opVES > 0) vesItems.push({ label: 'Gastos Operativos (Bs)', amount: opVES })
  if (supVES > 0) vesItems.push({ label: 'Abonos a Proveedores (Bs)', amount: supVES })
  if (empVES > 0) vesItems.push({ label: 'Pagos de Nómina (Bs)', amount: empVES })

  return {
    title: 'Desglose de Gastos', usdTotal: totalUSD, vesTotal: totalVES,
    usdItems, vesItems,
    usdLabel: 'Categoría de Egreso', vesLabel: 'Categoría de Egreso',
  }
})

const netBreakdown = computed(() => {
  const usdNetByMethod: Record<string, number> = {}
  const vesNetByMethod: Record<string, number> = {}

  for (const item of incomeBreakdown.value.usdItems) {
    usdNetByMethod[item.label] = (usdNetByMethod[item.label] ?? 0) + item.amount
  }
  for (const item of incomeBreakdown.value.vesItems) {
    vesNetByMethod[item.label] = (vesNetByMethod[item.label] ?? 0) + item.amount
  }

  const usdExpense = expenseBreakdown.value.usdTotal
  const vesExpense = expenseBreakdown.value.vesTotal
  if (usdExpense > 0) usdNetByMethod['Gastos'] = (usdNetByMethod['Gastos'] ?? 0) - usdExpense
  if (vesExpense > 0) vesNetByMethod['Gastos'] = (vesNetByMethod['Gastos'] ?? 0) - vesExpense

  const usdTotal = Object.values(usdNetByMethod).reduce((s, v) => s + v, 0)
  const vesTotal = Object.values(vesNetByMethod).reduce((s, v) => s + v, 0)

  return {
    title: 'Desglose de Ganancia Neta',
    usdTotal: Math.max(0, usdTotal),
    vesTotal: Math.max(0, vesTotal),
    usdItems: Object.entries(usdNetByMethod)
      .filter(([, a]) => a !== 0)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount),
    vesItems: Object.entries(vesNetByMethod)
      .filter(([, a]) => a !== 0)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount),
    usdLabel: 'Concepto',
    vesLabel: 'Concepto',
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
    openCobroActions(tx)
  } else {
    originalStartEdit(tx)
  }
}

const cobroActionsShow = ref(false)
const cobroActionsCita = ref<Cita | null>(null)
const cobroActionsPayment = ref<PaymentEditContext | null>(null)
const cobroActionsTxIds = ref<string[]>([])

const queryClientFin = useQueryClient()
const { success: successFin, error: showErrorFin } = useNotification()

const openCobroActions = async (tx: any) => {
  const appointmentId = tx.appointmentId || tx.appointment_id
  const { data: citaRaw } = await db
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .maybeSingle()
  if (!citaRaw) return

  const cita = mapAppointmentToCita(citaRaw)
  const hasMixed = tx.breakdown && tx.breakdown.length > 1
  const paymentData: PaymentEditContext = {
    transactionId: tx.id,
    method: hasMixed ? 'mixed' : (tx.rawMethod || tx.method),
    amount: tx.amount,
    currency: hasMixed ? 'USD' : (tx.primaryCurrency || 'USD'),
    exchangeRate: tx.exchangeRateUsed || 1,
    tipAmount: tx.tipAmount || 0,
    notes: tx.notes || undefined,
    breakdown: tx.breakdown || undefined,
    appointmentId,
  }

  cobroActionsCita.value = cita
  cobroActionsPayment.value = paymentData
  cobroActionsTxIds.value = tx.transactionIds && tx.transactionIds.length > 0 ? tx.transactionIds : [tx.id]
  cobroActionsShow.value = true
}

const handleRollbackCobro = async (payload: { transactionIds: string[]; appointmentId: string; prefill: any }) => {
  cobroActionsShow.value = false
  try {
    await Promise.all(payload.transactionIds.map(id =>
      summaryCtx.deleteTransactionMutation.mutateAsync({ transactionId: id }),
    ))
    await Promise.allSettled([
      queryClientFin.invalidateQueries({ queryKey: ['pos-pending'], exact: false }),
    ])
    if (payload.prefill) {
      sessionStorage.setItem('posPrefill', JSON.stringify(payload.prefill))
    }
    router.push({ name: 'admin-pos', query: { appointmentId: payload.appointmentId } })
  } catch (err) {
    showErrorFin(translateError(err, 'Error al eliminar cobro'))
  }
}

const handleDeleteCobroAction = async (transactionIds: string[]) => {
  cobroActionsShow.value = false
  try {
    await Promise.all(transactionIds.map(id =>
      summaryCtx.deleteTransactionMutation.mutateAsync({ transactionId: id }),
    ))
  } catch (err) {
    showErrorFin(translateError(err, 'Error al eliminar cobro'))
  }
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
