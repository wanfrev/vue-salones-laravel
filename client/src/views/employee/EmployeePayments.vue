<template>
  <AppLayout>
    <div class="space-y-4">
      <header class="rounded-xl border border-border bg-surface p-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
            @click="goBack"
            title="Volver"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-primary">Comisiones</p>
            <h1 class="text-xl font-bold text-text">Pagos recibidos</h1>
            <p class="text-sm text-text-muted">Historial completo de tus pagos</p>
          </div>
        </div>
      </header>

      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="border-b border-border bg-bg-secondary px-4 py-3">
          <h3 class="text-sm font-semibold text-text">Todos los pagos</h3>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        <div v-else-if="paymentsWithCurrency.length === 0" class="p-8 text-center text-sm text-text-muted">
          Aún no tienes pagos registrados.
        </div>

        <template v-else>
          <!-- Desktop -->
          <div class="hidden overflow-x-auto sm:block">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-bg-secondary">
                  <th class="px-4 py-2.5 text-left font-medium text-text-muted">Fecha</th>
                  <th class="px-4 py-2.5 text-right font-medium text-text-muted">Monto</th>
                  <th class="px-4 py-2.5 text-left font-medium text-text-muted">Método</th>
                  <th v-if="hasNotes" class="px-4 py-2.5 text-left font-medium text-text-muted">Notas</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="p in paymentsWithCurrency" :key="p.id" class="transition-colors hover:bg-bg-secondary/50">
                  <td class="px-4 py-2.5 text-text-secondary whitespace-nowrap">{{ formatDate(p.payment_date) }}</td>
                  <td class="px-4 py-2.5 text-right font-semibold text-text">{{ p.displayAmount }}</td>
                  <td class="px-4 py-2.5 text-text-secondary">{{ formatMethod(p.payment_method) }}</td>
                  <td v-if="hasNotes" class="px-4 py-2.5 text-text-secondary">{{ p.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile -->
          <div class="divide-y divide-border sm:hidden">
            <div v-for="p in paymentsWithCurrency" :key="p.id" class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-text-secondary">{{ formatDate(p.payment_date) }}</p>
                  <p class="text-sm text-text-secondary">{{ formatMethod(p.payment_method) }}</p>
                </div>
                <p class="text-base font-semibold text-text">{{ p.displayAmount }}</p>
              </div>
              <p v-if="p.notes" class="mt-2 text-xs text-text-muted">{{ p.notes }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { formatMethod, formatDate } from '../../lib/formatters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useCurrency } from '../../composables/useCurrency'
import { dashboardKeys, listEmployeePayments } from '../../services/employeeDashboardService'
import AppLayout from '../../components/layout/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const employeeId = computed(() => authStore.profile?.id ?? '')

const { data: paymentsData, isLoading } = useQuery({
  queryKey: dashboardKeys.payments(businessId.value, employeeId.value, branchId.value),
  queryFn: () => listEmployeePayments(businessId.value!, employeeId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && !!employeeId.value),
})

const { formatUSD, formatVESEs } = useCurrency()

const paymentsWithCurrency = computed(() => {
  return (paymentsData.value ?? []).map((p: any) => {
    let currency: 'USD' | 'VES' = 'USD'
    let originalAmount = Number(p.amount)
    const notes = p.notes ?? ''
    const vesMatch = notes.match(/^\[VES:(\d+(?:\.\d+)?)\]/)
    if (vesMatch) {
      currency = 'VES'
      originalAmount = Number(vesMatch[1])
    }
    const usdMatch = !vesMatch && notes.match(/^\[USD:(\d+(?:\.\d+)?)\]/)
    if (usdMatch) {
      currency = 'USD'
      originalAmount = Number(usdMatch[1])
    }
    return {
      ...p,
      currency,
      originalAmount,
      displayAmount: currency === 'VES' ? formatVESEs(originalAmount) : formatUSD(Number(p.amount)),
    }
  })
})

const hasNotes = computed(() => paymentsWithCurrency.value.some(p => p.notes))

function goBack() {
  router.push({ name: 'employee-comisiones' })
}
</script>
