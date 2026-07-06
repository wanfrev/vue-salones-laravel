<template>
  <AppLayout>
    <div class="space-y-4">
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
              <th class="px-4 py-3 text-right font-medium text-text-muted">Precio servicio</th>
              <th class="px-4 py-3 text-center font-medium text-text-muted">Comisión</th>
              <th class="px-4 py-3 text-right font-medium text-text-muted">Ganancia</th>
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
              <td class="px-4 py-3 text-right text-text">${{ appt.servicePrice }}</td>
              <td class="px-4 py-3 text-center text-text-secondary">
                <template v-if="payInfo?.type === 'salary'">—</template>
                <template v-else>{{ appt.percentage }}%</template>
              </td>
              <td class="px-4 py-3 text-right font-semibold" :class="appt.earnings > 0 ? 'text-success' : 'text-text-secondary'">
                <template v-if="payInfo?.type === 'salary'">Sueldo base</template>
                <template v-else>${{ appt.earnings.toFixed(2) }}</template>
              </td>
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

      <div v-if="payInfo" class="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-muted">
        <span class="font-medium text-text">Tipo de pago:</span>
        {{ payInfo.typeLabel }}
        <template v-if="payInfo.type !== 'salary'">
          · <span class="font-medium text-text">Comisión:</span> {{ payInfo.percentage }}%
        </template>
        <template v-if="payInfo.baseSalary > 0">
          · <span class="font-medium text-text">Sueldo base:</span> ${{ payInfo.baseSalary.toFixed(2) }}
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getStatusLabel, getStatusColor } from '../../lib/formatters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { dashboardKeys, listEmployeeAppointments } from '../../services/employeeDashboardService'
import type { EmployeeAppointmentRecord } from '../../services/employeeDashboardService'
import AppLayout from '../../components/layout/AppLayout.vue'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const employeeId = computed(() => authStore.profile?.id ?? '')

const payInfo = computed(() => {
  const profile = authStore.profile
  if (!profile) return null
  const type = (profile as any).pay_type ?? 'percentage'
  const percentage = Number((profile as any).pay_percentage ?? 50)
  const baseSalary = Number((profile as any).base_salary ?? 0)
  const typeLabel = type === 'salary' ? 'Sueldo base' : type === 'mixed' ? 'Sueldo + %' : 'Porcentaje'
  return { type, percentage, baseSalary, typeLabel }
})

const { data: historyData, isLoading: loadingHistory } = useQuery({
  queryKey: dashboardKeys.history(businessId.value, employeeId.value, branchId.value),
  queryFn: () => listEmployeeAppointments(businessId.value!, employeeId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
})

type HistoryRow = EmployeeAppointmentRecord & {
  percentage: number
  earnings: number
}

const historyAppointments = computed<HistoryRow[]>(() => {
  const raw = historyData.value ?? []
  const info = payInfo.value
  if (!info || info.type === 'salary') {
    return raw.map(r => ({
      ...r,
      percentage: 0,
      earnings: 0,
    }))
  }
  const isPaidOrCompleted = (r: EmployeeAppointmentRecord) =>
    r.status === 'completed' || r.paymentStatus === 'paid'
  return raw.map(r => ({
    ...r,
    percentage: info.percentage,
    earnings: isPaidOrCompleted(r) ? r.servicePrice * (info.percentage / 100) : 0,
  }))
})
</script>
