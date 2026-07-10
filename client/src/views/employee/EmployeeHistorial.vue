<template>
  <AppLayout>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-text">Historial</h2>
          <p class="text-sm text-text-muted">Servicios realizados</p>
        </div>
        <span class="text-sm font-medium text-text-muted">{{ filteredAppointments.length }} servicios</span>
      </div>

      <div class="relative max-w-md">
        <input
          v-model="search"
          type="text"
          placeholder="Buscar por cliente o servicio..."
          class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div v-if="loadingHistory" class="flex items-center justify-center py-12">
        <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else-if="filteredAppointments.length === 0" class="rounded-lg border border-border bg-surface p-8 text-center">
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
              <th class="px-4 py-3 text-center font-medium text-text-muted">% Comisión</th>
              <th class="px-4 py-3 text-right font-medium text-text-muted">Ganancia</th>
              <th class="px-4 py-3 text-center font-medium text-text-muted">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="appt in filteredAppointments" :key="appt.id" class="transition-colors hover:bg-bg-secondary/50">
              <td class="px-4 py-3 text-text">
                <span class="block text-sm">{{ formatDate(appt.date) }}</span>
                <span class="block text-xs text-text-muted">{{ formatTime(appt.time) }}</span>
              </td>
              <td class="px-4 py-3 font-medium text-text">{{ appt.client_name }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ appt.service_name }}</td>
              <td class="px-4 py-3 text-right text-text">${{ formatNum(appt.service_price) }}</td>
              <td class="px-4 py-3 text-center text-text-secondary">
                <template v-if="payInfo?.type === 'salary'">—</template>
                <template v-else>{{ appt.percentage }}%</template>
              </td>
              <td class="px-4 py-3 text-right font-semibold" :class="appt.earnings > 0 ? 'text-success' : 'text-text-secondary'">
                <template v-if="payInfo?.type === 'salary'">Sueldo base</template>
                <template v-else>${{ formatNum(appt.earnings) }}</template>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="['inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', getStatusColor(appt.status)]">
                  {{ getStatusLabel(appt.payment_status === 'paid' ? 'completed' : appt.status) }}
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
import { ref, computed } from 'vue'
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

const search = ref('')

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

const historyAppointments = computed<EmployeeAppointmentRecord[]>(() => historyData.value ?? [])

const filteredAppointments = computed(() => {
  if (!search.value) return historyAppointments.value
  const q = search.value.toLowerCase()
  return historyAppointments.value.filter(a =>
    a.client_name.toLowerCase().includes(q) || a.service_name.toLowerCase().includes(q),
  )
})

function formatDate(d: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d.slice(0, 10) }
}

function formatTime(d: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) } catch { return d.slice(11, 16) }
}

function formatNum(n: number): string {
  return n.toFixed(2)
}
</script>
