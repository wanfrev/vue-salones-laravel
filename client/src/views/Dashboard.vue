<template>
  <AppLayout>
    <template #header-actions>
    </template>

    <!-- Tabs -->
    <div class="mb-6 border-b border-border">
      <nav class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-strong'
          ]"
        >
          <span v-html="tab.icon" class="h-4 w-4"></span>
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab: Historial -->
    <div v-if="activeTab === 'historial'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-text">Servicios realizados</h2>
          <p class="text-sm text-text-muted">Historial de servicios que has completado</p>
        </div>
        <span class="text-sm font-medium text-text-muted">{{ historyAppointments.length }} servicios</span>
      </div>

      <div v-if="loadingHistory" class="flex items-center justify-center py-12">
        <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else-if="historyAppointments.length === 0" class="rounded-lg border border-border bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">Aún no tienes servicios realizados.</p>
      </div>

      <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary">
              <th class="px-4 py-3 text-left font-medium text-text-muted">Fecha</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Cliente</th>
              <th class="px-4 py-3 text-left font-medium text-text-muted">Servicio</th>
              <th class="px-4 py-3 text-right font-medium text-text-muted">Precio</th>
              <th class="px-4 py-3 text-center font-medium text-text-muted">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="appt in historyAppointments" :key="appt.id" class="transition-colors hover:bg-bg-secondary/50">
              <td class="px-4 py-3 text-text">
                <span class="block text-sm">{{ appt.date }}</span>
                <span class="block text-xs text-text-muted">{{ appt.time }}</span>
              </td>
              <td class="px-4 py-3 font-medium text-text">{{ appt.clientName }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ appt.serviceName }}</td>
              <td class="px-4 py-3 text-right font-medium text-text">${{ appt.servicePrice }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    getStatusColor(appt.status)
                  ]"
                >
                  {{ getStatusLabel(appt.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Comisiones -->
    <div v-if="activeTab === 'comisiones'" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Servicios realizados</p>
          <p class="mt-1 text-2xl font-bold text-text">{{ earnings.length }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Total facturado</p>
          <p class="mt-1 text-2xl font-bold text-text">${{ totalBilled }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-text-muted">Tus ganancias</p>
          <p class="mt-1 text-2xl font-bold text-primary">${{ totalEarned }}</p>
          <p v-if="payInfo" class="mt-0.5 text-xs text-text-muted">
            Comisión: {{ payInfo.percentage }}%
          </p>
        </div>
      </div>

      <!-- Earnings Table -->
      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="border-b border-border bg-bg-secondary px-4 py-3">
          <h3 class="text-sm font-semibold text-text">Detalle de ganancias</h3>
        </div>

        <div v-if="loadingEarnings" class="flex items-center justify-center py-8">
          <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <div v-else-if="earnings.length === 0" class="p-8 text-center text-sm text-text-muted">
          Aún no tienes transacciones registradas.
        </div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary">
              <th class="px-4 py-2.5 text-left font-medium text-text-muted">Fecha</th>
              <th class="px-4 py-2.5 text-left font-medium text-text-muted">Cliente</th>
              <th class="px-4 py-2.5 text-left font-medium text-text-muted">Servicio</th>
              <th class="px-4 py-2.5 text-right font-medium text-text-muted">Total</th>
              <th class="px-4 py-2.5 text-right font-medium text-text-muted">%</th>
              <th class="px-4 py-2.5 text-right font-medium text-text-muted">Ganancia</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="row in earnings" :key="row.id" class="transition-colors hover:bg-bg-secondary/50">
              <td class="px-4 py-2.5 text-text-secondary">{{ row.date }}</td>
              <td class="px-4 py-2.5 font-medium text-text">{{ row.clientName }}</td>
              <td class="px-4 py-2.5 text-text-secondary">{{ row.serviceName }}</td>
              <td class="px-4 py-2.5 text-right text-text">${{ row.totalAmount }}</td>
              <td class="px-4 py-2.5 text-right text-text-secondary">{{ row.employeePercentage }}%</td>
              <td class="px-4 py-2.5 text-right font-semibold text-success">${{ row.employeeEarnings.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment Records -->
      <div v-if="payments.length > 0" class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="border-b border-border bg-bg-secondary px-4 py-3">
          <h3 class="text-sm font-semibold text-text">Pagos recibidos</h3>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary">
              <th class="px-4 py-2.5 text-left font-medium text-text-muted">Fecha</th>
              <th class="px-4 py-2.5 text-right font-medium text-text-muted">Monto</th>
              <th class="px-4 py-2.5 text-left font-medium text-text-muted">Método</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="p in payments" :key="p.id" class="transition-colors hover:bg-bg-secondary/50">
              <td class="px-4 py-2.5 text-text-secondary">{{ formatDate(p.payment_date) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-text">${{ Number(p.amount).toFixed(2) }}</td>
              <td class="px-4 py-2.5 text-text-secondary">{{ formatMethod(p.payment_method) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Recibo -->
    <div v-if="activeTab === 'recibo'" class="max-w-2xl mx-auto">
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
              {{ payInfo.typeLabel }} · {{ payInfo.percentage }}% comisión
            </p>
          </div>
        </div>

        <div v-if="loadingEarnings" class="flex items-center justify-center py-8">
          <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <template v-else>
          <!-- Summary -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Servicios</p>
              <p class="text-xl font-bold text-text mt-0.5">{{ earnings.length }}</p>
            </div>
            <div class="rounded-lg bg-bg-secondary p-3">
              <p class="text-xs text-text-muted uppercase tracking-wider">Total facturado</p>
              <p class="text-xl font-bold text-text mt-0.5">${{ totalBilled }}</p>
            </div>
          </div>

          <!-- Earnings Breakdown -->
          <div class="space-y-2 mb-6">
            <div class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Total facturado en servicios</span>
              <span class="font-medium text-text">${{ totalBilled }}</span>
            </div>
            <div class="flex justify-between py-2 text-sm">
              <span class="text-text-muted">Comisión del empleado</span>
              <span class="font-medium text-text">{{ payInfo?.percentage || 0 }}%</span>
            </div>
            <div class="border-t border-border pt-3 flex justify-between">
              <span class="font-semibold text-text text-base">Total a cobrar</span>
              <span class="font-bold text-primary text-lg">${{ totalEarned }}</span>
            </div>
          </div>

          <!-- Payments Received -->
          <div v-if="payments.length > 0" class="border-t border-border pt-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Pagos realizados</p>
            <div v-for="p in payments" :key="p.id" class="flex justify-between items-center py-2 border-b border-border last:border-b-0">
              <div>
                <p class="text-sm font-medium text-text">${{ Number(p.amount).toFixed(2) }}</p>
                <p class="text-xs text-text-muted">{{ formatDate(p.payment_date) }} · {{ formatMethod(p.payment_method) }}</p>
              </div>
              <span class="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Pagado</span>
            </div>
          </div>

          <div v-if="payments.length === 0" class="border-t border-border pt-4 text-center text-sm text-text-muted">
            No hay pagos registrados aún.
          </div>

          <!-- Print Button -->
          <button
            @click="windowPrint"
            class="mt-6 w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text flex items-center justify-center gap-2"
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
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useNotification } from '../composables/common/useNotification'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { getInitials, getStatusLabel, getStatusColor, formatMethod, formatDate, formatNumber } from '../lib/formatters'
import { listEmployeeAppointments, listEmployeeTransactions, listEmployeePayments, dashboardKeys } from '../services/employeeDashboardService'
import AppLayout from '../components/layout/AppLayout.vue'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
useNotification()

const businessId = computed(() => authStore.businessId)
const employeeId = computed(() => authStore.profile?.id ?? '')
const branchId = computed(() => businessStore.currentBranchId)
const businessName = computed(() => businessStore.business?.name ?? '')

type TabId = 'historial' | 'comisiones' | 'recibo'
const activeTab = ref<TabId>('historial')

const tabs = [
  { id: 'historial' as const, label: 'Mi Historial', icon: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>' },
  { id: 'comisiones' as const, label: 'Mis Comisiones', icon: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
  { id: 'recibo' as const, label: 'Mi Recibo', icon: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
]

// Pay info from profile
const payInfo = computed(() => {
  const profile = authStore.profile
  if (!profile) return null
  const type = profile.pay_type ?? 'percentage'
  const percentage = Number(profile.pay_percentage ?? 50)
  const baseSalary = Number(profile.base_salary ?? 0)
  const typeLabel = type === 'salary' ? 'Sueldo base' : type === 'mixed' ? 'Sueldo + %' : 'Porcentaje'
  return { type, percentage, baseSalary, typeLabel }
})

// History
const { data: historyData, isLoading: loadingHistory } = useQuery({
  queryKey: dashboardKeys.history(businessId.value, employeeId.value, branchId.value),
  queryFn: () => listEmployeeAppointments(businessId.value!, employeeId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
})
const historyAppointments = computed(() => historyData.value ?? [])

// Earnings
const { data: earningsData, isLoading: loadingEarnings } = useQuery({
  queryKey: dashboardKeys.earnings(businessId.value, employeeId.value, branchId.value),
  queryFn: () => listEmployeeTransactions(businessId.value!, employeeId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
})
const earnings = computed(() => earningsData.value ?? [])

const totalBilled = computed(() =>
  formatNumber(earnings.value.reduce((sum, r) => sum + r.totalAmount, 0))
)
const totalEarned = computed(() =>
  earnings.value.reduce((sum, r) => sum + r.employeeEarnings, 0).toFixed(2)
)

// Payments (employee_payments)
const { data: paymentsData } = useQuery({
  queryKey: dashboardKeys.payments(businessId.value, employeeId.value, branchId.value),
  queryFn: () => listEmployeePayments(businessId.value!, employeeId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
})
const payments = computed(() => paymentsData.value ?? [])

// Initials
const initials = computed(() => getInitials(authStore.profile?.full_name))

// Print receipt
const windowPrint = () => {
  window.print()
}
</script>
