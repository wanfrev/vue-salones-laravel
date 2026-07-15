<template>
  <AppLayout>
    <div id="recibo-content" class="max-w-2xl mx-auto">
      <div class="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <!-- Header -->
        <div class="text-center border-b border-border pb-6 mb-6">
          <h2 class="text-xl font-bold text-text">{{ businessName || 'Salón' }}</h2>
          <p class="text-sm text-text-muted mt-1">Recibo de pago</p>
        </div>

        <!-- Employee Info -->
        <div class="flex items-center gap-4 mb-6">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {{ initials }}
          </div>
          <div>
            <p class="font-semibold text-text text-lg">{{ authStore.profile?.full_name }}</p>
            <p v-if="payInfo" class="text-sm text-text-muted">
              {{ payInfo.typeLabel }}
              <template v-if="payInfo.type === 'percentage'"> · {{ payInfo.percentage }}% comisión</template>
              <template v-else-if="payInfo.type === 'mixed'"> · {{ payInfo.percentage }}% comisión + ${{ payInfo.baseSalary.toFixed(2) }} base {{ payInfo.frequencyLabel }}</template>
              <template v-else-if="payInfo.type === 'salary'"> · ${{ payInfo.baseSalary.toFixed(2) }} {{ payInfo.frequencyLabel }}</template>
            </p>
          </div>
        </div>

        <div class="rounded-lg bg-bg-secondary/50 border border-border px-3 py-2 mb-5 text-center">
          <p class="text-xs text-text-muted">{{ rateLabel }}</p>
        </div>

        <div v-if="loadingEarnings" class="flex items-center justify-center py-8">
          <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <template v-else>
          <!-- Period Selector -->
          <div class="mb-5">
            <SegmentedTabs
              :tabs="periodTabs"
              :model-value="selectedPeriod"
              @update:model-value="onPeriodChange"
            />
            <div v-if="selectedPeriod !== 'all'" class="flex items-center justify-center gap-2 mt-3">
              <button
                @click="previousPeriod"
                class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text transition-colors"
                title="Anterior"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-sm font-semibold text-text min-w-[140px] text-center">{{ periodLabel }}</span>
              <button
                @click="nextPeriod"
                :disabled="isCurrentPeriod"
                class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Siguiente"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                v-if="!isCurrentPeriod"
                @click="goToToday"
                class="ml-1 rounded-lg px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Hoy
              </button>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Servicios</p>
              <p class="text-xl font-bold text-text mt-0.5">{{ earnings.length }}</p>
            </div>
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Total facturado</p>
              <p class="text-xl font-bold text-text mt-0.5">${{ totalBilled }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ totalBilledVES }}</p>
            </div>
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Monto pagado</p>
              <p class="text-xl font-bold text-success mt-0.5">${{ totalPaymentsOnlyFormatted }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ totalPaidVES }}</p>
            </div>
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Total a cobrar</p>
              <p class="text-xl font-bold text-primary mt-0.5">${{ totalEarned }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ totalEarnedVES }}</p>
            </div>
          </div>

          <!-- Earnings Breakdown Table -->
          <EmployeeEarningsTable
            :earnings="earningsWithVESComputed"
            :show-all="showAllServices"
            :has-more="hasMoreServices"
            :visible-limit="VISIBLE_SERVICES"
            @toggle="showAllServices = !showAllServices"
          />

          <!-- Totals -->
          <div class="space-y-2 mb-6">
            <div class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Total facturado en servicios</span>
              <div class="text-right">
                <span class="font-medium text-text">${{ totalBilled }}</span>
                <p class="text-xs text-text-muted">{{ totalBilledVES }}</p>
              </div>
            </div>
            <div v-if="payInfo && payInfo.baseSalary > 0" class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Sueldo base</span>
              <div class="text-right">
                <span class="font-medium text-text">${{ payInfo.baseSalary.toFixed(2) }}</span>
                <p class="text-xs text-text-muted">{{ formatEmployeeVES(payInfo.baseSalary) }}</p>
              </div>
            </div>
            <div v-if="payInfo && payInfo.type !== 'salary'" class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Comisión del empleado</span>
              <span class="font-medium text-text">{{ payInfo.percentage }}%</span>
            </div>
            <div v-if="payInfo && payInfo.type === 'percentage' && earningsWithVESComputed.length > 0" class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Ganancia por comisión</span>
              <div class="text-right">
                <span class="font-medium text-text">${{ totalVariableEarned }}</span>
              </div>
            </div>
            <div v-if="totalTip > 0" class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Propinas recibidas</span>
              <div class="text-right">
                <span class="font-medium text-primary">${{ totalTip.toFixed(2) }}</span>
                <p class="text-xs text-text-muted">{{ formatEmployeeVES(totalTip) }}</p>
              </div>
            </div>
            <div class="border-t border-border pt-3 flex justify-between">
              <span class="font-semibold text-text text-base">Total a cobrar</span>
              <div class="text-right">
                <span class="font-bold text-primary text-lg">${{ totalEarned }}</span>
                <p class="text-xs text-text-muted">{{ totalEarnedVES }}</p>
              </div>
            </div>
          </div>

          <!-- Debt Summary -->
          <div class="rounded-lg border border-border bg-bg-secondary p-4 mb-6">
            <h3 class="text-sm font-semibold text-text mb-3">Resumen de deuda</h3>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-text-muted">Total a cobrar</span>
                <div class="text-right">
                  <span class="font-medium text-text">${{ totalEarned }}</span>
                  <p class="text-xs text-text-muted">{{ totalEarnedVES }}</p>
                </div>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-text-muted">Monto pagado</span>
                <div class="text-right">
                  <span class="font-medium text-success">${{ totalPaymentsOnlyFormatted }}</span>
                  <p class="text-xs text-text-muted">{{ totalPaidVES }}</p>
                </div>
              </div>
              <div v-if="filteredConsumptions.length > 0" class="flex justify-between text-sm">
                <span class="text-text-muted">Consumido (debitado)</span>
                <div class="text-right">
                  <span class="font-medium text-warning">${{ totalConsumedFormatted }}</span>
                </div>
              </div>
              <div class="border-t border-border pt-2 flex justify-between">
                <span class="font-semibold text-sm text-text">Deuda pendiente</span>
                <div class="text-right">
                  <span :class="['font-bold text-sm', pendingDebt > 0 ? 'text-danger' : 'text-success']">
                    ${{ pendingDebtFormatted }}
                  </span>
                  <p class="text-xs" :class="pendingDebt > 0 ? 'text-danger/70' : 'text-success/70'">{{ pendingDebtVES }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Payments Received + Consumptions -->
          <EmployeePaymentsList
            :payments="filteredPaymentsWithCurrency"
            :consumptions="filteredConsumptions"
            :show-all="showAllPayments"
            :has-more="hasMorePayments"
            :total-payments="totalPaymentsOnlyFormatted"
            :total-consumed="totalConsumedFormatted"
            :total-net="totalPaidFormatted"
            @toggle="showAllPayments = !showAllPayments"
          />

          <!-- Historial de recibos pasados -->
          <div class="border-t border-border pt-4 mb-4">
            <button
              @click="showHistory = !showHistory"
              class="flex w-full items-center justify-between text-left"
            >
              <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Historial de recibos
              </span>
              <svg
                :class="['h-4 w-4 text-text-muted transition-transform', showHistory ? 'rotate-180' : '']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-if="showHistory" class="mt-3 space-y-2">
              <div v-if="historyMonths.length === 0" class="text-center text-sm text-text-muted py-3">
                No hay recibos anteriores.
              </div>
              <button
                v-for="month in historyMonths"
                :key="month.key"
                @click="goToMonth(month.key)"
                class="flex w-full items-center justify-between rounded-lg border border-border bg-bg-secondary/50 p-3 text-left transition-colors hover:bg-bg-secondary"
              >
                <div>
                  <p class="text-sm font-semibold text-text">{{ month.label }}</p>
                  <p class="text-xs text-text-muted">{{ month.serviceCount }} servicios · Facturado ${{ month.billed.toFixed(2) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold" :class="month.pending > 0 ? 'text-danger' : 'text-success'">
                    ${{ month.earned.toFixed(2) }}
                  </p>
                  <p class="text-xs text-text-muted">
                    {{ month.pending > 0 ? `Pendiente $${month.pending.toFixed(2)}` : 'Pagado' }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <button
            @click="windowPrint"
            class="no-print mt-2 w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text flex items-center justify-center gap-2"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir recibo
          </button>
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { getInitials } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'
import { dashboardKeys, listEmployeeTransactions, listEmployeePayments } from '../../services/employeeDashboardService'
import AppLayout from '../../components/layout/AppLayout.vue'
import SegmentedTabs from '../../components/common/SegmentedTabs.vue'
import EmployeeEarningsTable from './EmployeeEarningsTable.vue'
import EmployeePaymentsList from './EmployeePaymentsList.vue'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const employeeId = computed(() => authStore.profile?.id ?? '')
const branchId = computed(() => businessStore.currentBranchId)
const businessName = computed(() => businessStore.business?.name ?? '')

const selectedPeriod = ref<'all' | 'day' | 'week' | 'month'>('all')
const selectedDate = ref(new Date())
const showHistory = ref(false)
const showAllServices = ref(false)
const showAllPayments = ref(false)
const VISIBLE_SERVICES = 8
const VISIBLE_PAYMENTS = 5

const periodTabs = [
  { key: 'all', label: 'Todo' },
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
]

function dayStart(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function dayEnd(d: Date): Date {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c
}

function weekStart(d: Date): Date {
  const c = dayStart(d)
  const day = (c.getDay() + 6) % 7
  c.setDate(c.getDate() - day)
  return c
}

const periodStart = computed<Date>(() => {
  if (selectedPeriod.value === 'all') return new Date(2000, 0, 1)
  if (selectedPeriod.value === 'day') return dayStart(selectedDate.value)
  if (selectedPeriod.value === 'week') return weekStart(selectedDate.value)
  return new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1)
})

const periodEnd = computed<Date>(() => {
  if (selectedPeriod.value === 'all') return new Date(2099, 11, 31, 23, 59, 59, 999)
  if (selectedPeriod.value === 'day') return dayEnd(selectedDate.value)
  if (selectedPeriod.value === 'week') {
    const end = weekStart(selectedDate.value)
    end.setDate(end.getDate() + 6)
    return dayEnd(end)
  }
  const lastDay = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth() + 1, 0)
  const today = new Date()
  const isCurrentMonth = selectedDate.value.getFullYear() === today.getFullYear() && selectedDate.value.getMonth() === today.getMonth()
  return isCurrentMonth ? dayEnd(today) : dayEnd(lastDay)
})

const periodLabel = computed(() => {
  if (selectedPeriod.value === 'all') return 'Todos los recibos'
  const d = selectedDate.value
  if (selectedPeriod.value === 'day') {
    return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
  }
  if (selectedPeriod.value === 'week') {
    const ws = weekStart(d)
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    const sameMonth = ws.getMonth() === we.getMonth()
    if (sameMonth) {
      return `${ws.getDate()}-${we.getDate()} ${MONTHS_ES[ws.getMonth()]} ${ws.getFullYear()}`
    }
    return `${ws.getDate()} ${MONTHS_ES[ws.getMonth()]} - ${we.getDate()} ${MONTHS_ES[we.getMonth()]} ${we.getFullYear()}`
  }
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
})

const isCurrentPeriod = computed(() => {
  if (selectedPeriod.value === 'all') return true
  const now = new Date()
  if (selectedPeriod.value === 'day') {
    return dayStart(selectedDate.value).getTime() >= dayStart(now).getTime()
  }
  if (selectedPeriod.value === 'week') {
    const currentWeekStart = weekStart(now)
    return weekStart(selectedDate.value).getTime() >= currentWeekStart.getTime()
  }
  return selectedDate.value.getFullYear() > now.getFullYear() ||
    (selectedDate.value.getFullYear() === now.getFullYear() && selectedDate.value.getMonth() >= now.getMonth())
})

function onPeriodChange(value: string) {
  selectedPeriod.value = value as 'all' | 'day' | 'week' | 'month'
  if (value !== 'all') selectedDate.value = new Date()
}

function previousPeriod() {
  if (selectedPeriod.value === 'all') return
  const d = new Date(selectedDate.value)
  if (selectedPeriod.value === 'day') d.setDate(d.getDate() - 1)
  else if (selectedPeriod.value === 'week') d.setDate(d.getDate() - 7)
  else d.setMonth(d.getMonth() - 1)
  selectedDate.value = d
}

function nextPeriod() {
  if (selectedPeriod.value === 'all') return
  if (isCurrentPeriod.value) return
  const d = new Date(selectedDate.value)
  if (selectedPeriod.value === 'day') d.setDate(d.getDate() + 1)
  else if (selectedPeriod.value === 'week') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  selectedDate.value = d
}

function goToToday() {
  selectedDate.value = new Date()
}

function goToMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  selectedPeriod.value = 'month'
  selectedDate.value = new Date(y, m - 1, 1)
  showHistory.value = false
}

const payInfo = computed(() => {
  const profile = authStore.profile
  if (!profile) return null
  const type = (profile as any).pay_type ?? 'percentage'
  const percentage = Number((profile as any).pay_percentage ?? 50)
  const baseSalary = Number((profile as any).base_salary ?? 0)
  const typeLabel = type === 'salary' ? 'Sueldo base' : type === 'mixed' ? 'Sueldo + %' : 'Porcentaje'
  const freq = (profile as any).salary_frequency ?? 'monthly'
  const freqMap: Record<string, string> = { weekly: 'semanal', biweekly: 'quincenal', monthly: 'mensual' }
  const frequencyLabel = freqMap[freq] ?? 'mensual'
  return { type, percentage, baseSalary, typeLabel, frequencyLabel }
})

const initials = computed(() => getInitials(authStore.profile?.full_name))

const toYmdString = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const dateParams = computed(() => selectedPeriod.value !== 'all'
  ? { start: toYmdString(periodStart.value), end: toYmdString(periodEnd.value) }
  : { start: undefined, end: undefined }
)

const { data: earningsData, isLoading: loadingEarnings, refetch: refetchEarnings } = useQuery({
  queryKey: computed(() => dashboardKeys.earnings(businessId.value, employeeId.value, branchId.value, dateParams.value.start, dateParams.value.end)),
  queryFn: () => listEmployeeTransactions(businessId.value!, employeeId.value!, branchId.value, dateParams.value.start, dateParams.value.end),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
  staleTime: 0,
})
const earnings = computed(() => earningsData.value ?? [])

const earningsWithVES = computed(() =>
  earnings.value.map(row => {
    const rate = row.exchangeRateUsed || employeeRate.value
    const isVES = row.currency === 'VES'
    const vesTotal = isVES ? row.totalAmount * row.exchangeRateUsed : row.totalAmount * rate
    const vesEarnings = isVES ? row.employeeEarnings * row.exchangeRateUsed : row.employeeEarnings * rate
    return { ...row, vesTotal, vesEarnings }
  })
)

const earningsWithVESComputed = computed(() => earningsWithVES.value)

const hasMoreServices = computed(() => earningsWithVESComputed.value.length > VISIBLE_SERVICES)

const totalBilled = computed(() =>
  earnings.value.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)
)

const totalBilledVES = computed(() =>
  formatEmployeeVES(Number(totalBilled.value))
)

const totalVariableEarned = computed(() =>
  earnings.value.reduce((sum, r) => sum + r.employeeEarnings, 0).toFixed(2)
)

const totalTip = computed(() =>
  earnings.value.reduce((sum, r) => sum + (r.tipAmount ?? 0), 0)
)

const totalEarned = computed(() => {
  const info = payInfo.value
  let total = 0
  for (const r of earnings.value) {
    total += r.employeeEarnings
  }
  if (info && (info.type === 'salary' || info.type === 'mixed')) {
    total += info.baseSalary
  }
  return total.toFixed(2)
})

const totalEarnedVES = computed(() =>
  formatEmployeeVES(Number(totalEarned.value))
)

const { data: paymentsData, refetch: refetchPayments } = useQuery({
  queryKey: computed(() => dashboardKeys.payments(businessId.value, employeeId.value, branchId.value, dateParams.value.start, dateParams.value.end)),
  queryFn: () => listEmployeePayments(businessId.value!, employeeId.value!, branchId.value, dateParams.value.start, dateParams.value.end),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
  staleTime: 0,
})
const payments = computed(() => paymentsData.value ?? [])
const { formatUSD, formatVESEs, employeeRate } = useCurrency()

const rateLabel = computed(() => {
  if (businessStore.employeeExchangeRate != null) {
    return `Tasa empleados: ${businessStore.employeeExchangeRate.toLocaleString('es-VE')} Bs/USD`
  }
  return `Tasa global: ${employeeRate.value.toLocaleString('es-VE')} Bs/USD`
})

const formatEmployeeVES = (usdValue: number): string => {
  return formatVESEs(usdValue * employeeRate.value)
}

const filteredPayments = computed(() => {
  if (selectedPeriod.value === 'all') return payments.value
  return payments.value.filter(p => {
    const d = new Date(p.payment_date)
    return d >= periodStart.value && d <= periodEnd.value
  })
})

const paymentsWithCurrency = computed(() => {
  return filteredPayments.value.map((p: any) => {
    let currency: 'USD' | 'VES' = p.currency === 'VES' ? 'VES' : 'USD'
    let originalAmount = currency === 'VES' ? Number(p.original_amount ?? 0) : Number(p.amount)
    if (currency === 'USD' && p.notes) {
      const notes = p.notes
      const vesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?)\]/)
      if (vesMatch) {
        currency = 'VES'
        originalAmount = Number(vesMatch[1])
      }
      const usdMatch = !vesMatch && notes.match(/^\[USD:(\d+(?:\.\d+)?)\]/)
      if (usdMatch) {
        originalAmount = Number(usdMatch[1])
      }
    }
    const usdAmount = Number(p.amount)
    // Use historical exchange rate if available, otherwise use current employee rate or global rate
    const historicalRate = p.exchange_rate_used
    const rateToUse = historicalRate || employeeRate.value
    const displayVES = currency === 'VES' ? formatVESEs(originalAmount) : `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdAmount * rateToUse)} Bs`
    const displayAmount = currency === 'VES' ? formatVESEs(originalAmount) : formatUSD(usdAmount)
    return {
      ...p,
      currency,
      originalAmount,
      displayAmount,
      displayVES: currency === 'VES' ? formatUSD(usdAmount) : displayVES,
    }
  })
})

const filteredPaymentsWithCurrency = computed(() => paymentsWithCurrency.value)

const hasMorePayments = computed(() => filteredPaymentsWithCurrency.value.length > VISIBLE_PAYMENTS)

const totalPaid = computed(() =>
  filteredPayments.value.reduce((sum, p) => sum + Number(p.amount), 0)
)

const totalPaymentsOnly = computed(() =>
  filteredPayments.value
    .filter(p => (p as any).type !== 'consumption')
    .reduce((sum, p) => sum + Number(p.amount), 0)
)

const totalPaymentsOnlyFormatted = computed(() =>
  totalPaymentsOnly.value.toFixed(2)
)

const filteredConsumptions = computed(() =>
  filteredPayments.value.filter(p => (p as any).type === 'consumption')
)

const totalConsumed = computed(() =>
  filteredConsumptions.value.reduce((sum, p) => sum + Number(p.amount), 0)
)

const totalConsumedFormatted = computed(() =>
  totalConsumed.value.toFixed(2)
)

const totalPaidFormatted = computed(() => totalPaid.value.toFixed(2))

const pendingDebt = computed(() =>
  Math.max(0, Number(totalEarned.value) - totalPaid.value)
)

const pendingDebtFormatted = computed(() => pendingDebt.value.toFixed(2))

const totalPaidVES = computed(() => formatEmployeeVES(totalPaymentsOnly.value))

const pendingDebtVES = computed(() => formatEmployeeVES(pendingDebt.value))

const historyMonths = computed(() => {
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const byMonth = new Map<string, { billed: number; earned: number; paid: number; serviceCount: number }>()

  for (const r of earnings.value) {
    const d = new Date(r.appointmentDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key === currentMonthKey) continue
    const entry = byMonth.get(key) || { billed: 0, earned: 0, paid: 0, serviceCount: 0 }
    entry.billed += r.totalAmount
    entry.earned += r.employeeEarnings
    entry.serviceCount++
    byMonth.set(key, entry)
  }

  for (const p of payments.value) {
    const d = new Date(p.payment_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key === currentMonthKey) continue
    const entry = byMonth.get(key)
    if (entry) entry.paid += Number(p.amount)
  }

  return Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, entry]) => {
      const [y, m] = key.split('-').map(Number)
      return {
        key,
        label: `${MONTHS_ES[m - 1]} ${y}`,
        billed: entry.billed,
        earned: entry.earned,
        paid: entry.paid,
        pending: Math.max(0, entry.earned - entry.paid),
        serviceCount: entry.serviceCount,
      }
    })
})

const windowPrint = () => {
  window.print()
}

onMounted(async () => {
  await Promise.all([
    refetchEarnings(),
    refetchPayments(),
  ])
})
</script>

<style scoped>
.no-print {
  /* scoped placeholder - overridden by global @media print */
}
</style>

<style>
@media print {
  @page { size: auto; margin: 10mm; }

  html, body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  header, aside, nav, footer {
    display: none !important;
  }

  main {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }

  main > div {
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  /* Hide mobile overlay */
  .fixed.inset-0 {
    display: none !important;
  }

  /* Hide fixed elements that aren't the receipt */
  .min-h-screen > .fixed {
    display: none !important;
  }
}
</style>
