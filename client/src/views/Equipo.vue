<template>
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>{{ businessStore.terminology.employee || 'Empleado' }}s</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Gestión de {{ (businessStore.terminology.employee || 'Empleado').toLowerCase() }}s</h1>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showEmployeeRateModal = true"
          class="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-theme hover:bg-bg-secondary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="hidden sm:inline">Tasa empleados</span>
          <span v-if="businessStore.employeeExchangeRate" class="ml-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning tabular-nums">{{ businessStore.employeeExchangeRate }}</span>
        </button>
        <button @click="handleNewEmpleado"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          <span>Nuevo {{ businessStore.terminology.employee || 'Empleado' }}</span>
        </button>
      </div>
    </div>
  </header>

  <div class="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-8 lg:grid-cols-4">
    <StatCard icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" icon-color="primary" :value="totalEmpleados" label="Total" />
    <StatCard icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="info" :value="empleadosPorcentaje" label="Con %" />
    <StatCard icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="warning" :value="empleadosSueldoBase" label="Sueldo base" />
    <StatCard icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="success" :value="empleadosMixto" label="Sueldo + %" />
  </div>

  <EmployeeGrid
    :employees="visibleTeam" :show-all="showAll" :has-more="hasMoreThanDefault" :total-count="team.length"
    :get-initials="getInitials"
    @edit="handleEditEmpleado" @view-agenda="handleViewAgenda" @toggle-show-all="showAll = !showAll"
  />

  <GestionTabs
    :summary-ctx="summaryCtx" :payments-ctx="paymentsCtx" :business-store="businessStore"
    :team-schedule="teamSchedule"
    :total-comisiones="totalComisiones" :total-nomina-pagada="totalNominaPagada"
    :total-consumido="totalConsumido" :total-deuda-pendiente="totalDeudaPendiente"
    :deuda-con-saldo="deudaConSaldo"
    :format-u-s-d="formatUSD" :format-v-e-s-inline="formatVESInline" :format-v-e-s-es="formatVESEs"
    :format-method="formatMethod"
    :format-time24to12="formatTime24to12"
    :selected-month="selectedMonth" :selected-period="selectedPeriod"
    @update:selected-period="selectedPeriod = $event"
    @update:selected-month="selectedMonth = $event"
    @reset-current-month="resetToCurrent"
    @open-payment="paymentsCtx.openModal()"
    @open-consumption="paymentsCtx.openConsumptionModal()"
    @open-edit-payment="(ep) => paymentsCtx.openEditModal(ep)"
    @delete-payment="(id) => paymentsCtx.handleDelete(id)"
  />

  <EmployeePaymentModal
    :payments-ctx="paymentsCtx" :business-id="authStore.businessId"
    :branch-id="businessStore.currentBranchId"
    @close="paymentsCtx.closeModal()"
    @payment-saved="onPaymentSaved"
  />

  <EmployeeConsumptionModal
    :payments-ctx="paymentsCtx" :business-id="authStore.businessId"
    :branch-id="businessStore.currentBranchId"
    @close="paymentsCtx.closeConsumptionModal()"
    @consumption-saved="onPaymentSaved"
  />

  <EmployeeRateModal :show="showEmployeeRateModal" @close="showEmployeeRateModal = false" />

  <EmpleadoFormModal ref="empleadoModalRef" :is-saving="isSaving" @save="handleSaveEmpleado" @delete="handleDeleteEmpleado" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCrud } from '../composables/empleados/useCrud'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { useCurrency } from '../composables/common/useCurrency'
import { usePeriodSelection } from '../composables/finanzas/usePeriodSelection'
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado } from '../services/equipoService'
import { useBusinessStore } from '../store/business'
import { getInitials, formatMethod, formatTime24to12 } from '../lib/formatters'
import { resolvePeriodDates } from '../lib/periodUtils'
import { EmpleadoFormModal } from '../components/modals'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import { useQueryClient } from '@tanstack/vue-query'
import { employeePaymentKeys } from '../services/employeePaymentsService'
import { StatCard } from '../components/common'
import EmployeeGrid from '../components/common/EmployeeGrid.vue'
import EmployeePaymentModal from '../components/equipo/EmployeePaymentModal.vue'
import EmployeeConsumptionModal from '../components/equipo/EmployeeConsumptionModal.vue'
import EmployeeRateModal from '../components/equipo/EmployeeRateModal.vue'
import GestionTabs from '../components/equipo/GestionTabs.vue'
import type { Empleado, EmpleadoFormData } from '../types/empleado'

const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const empleadoModalRef = ref<InstanceType<typeof EmpleadoFormModal> | null>(null)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const { selectedPeriod, selectedMonth, resetToCurrent } = usePeriodSelection()
const periodDates = computed(() => resolvePeriodDates(selectedPeriod.value, selectedMonth.value))
const emptyExpenses = ref<{ date: string; amount: number }[]>([])
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, emptyExpenses, selectedMonth)
const paymentsCtx = useEmployeePayments(businessId, periodDates)

const onPaymentSaved = async () => {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value) }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value] }),
  ])
  await queryClient.refetchQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false })
}

const { items: team, handleSave: handleSaveEmpleado, handleDelete: handleDeleteEmpleado, isSaving } = useCrud<Empleado, EmpleadoFormData>({
  businessId, branchId,
  queryKey: (id, brId) => equipoKeys.all(id, brId),
  queryFn: (id, brId) => listEquipo(id, brId),
  saveFn: (id, data, brId) => saveEmpleado(data, id, brId),
  deleteFn: (id) => deleteEmpleado(id),
  entityName: 'Empleado', modalRef: empleadoModalRef,
  extraInvalidations: [
    (id) => ['appointments', id, branchId.value],
    (id) => ['dashboard-services', id],
    (id) => ['dashboard-payments', id],
    (id) => ['dashboard-history', id],
  ],
})

const showEmployeeRateModal = ref(false)

const DEFAULT_VISIBLE = 4
const showAll = ref(false)
const hasMoreThanDefault = computed(() => team.value.length > DEFAULT_VISIBLE)
const visibleTeam = computed(() => showAll.value ? team.value : team.value.slice(0, DEFAULT_VISIBLE))

const teamSchedule = computed(() => team.value.filter(m => m.schedule).map(m => ({
  id: m.id, name: m.name, start: m.schedule?.start ?? '', end: m.schedule?.end ?? '',
  break: m.schedule?.break || 'Sin descanso registrado', appointments: 0, available: true,
})))

const totalEmpleados = computed(() => team.value.length)
const empleadosPorcentaje = computed(() => team.value.filter(e => e.payType === 'percentage' || e.payType === 'mixed').length)
const empleadosSueldoBase = computed(() => team.value.filter(e => e.payType === 'salary' || e.payType === 'mixed').length)
const empleadosMixto = computed(() => team.value.filter(e => e.payType === 'mixed').length)

const handleNewEmpleado = () => empleadoModalRef.value?.open()
const handleEditEmpleado = (e: Empleado) => empleadoModalRef.value?.open(e)
const handleViewAgenda = (e: Empleado) => { router.push('/admin?employee=' + e.id) }

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()
const employeeDebtSummary = computed(() => {
  return (summaryCtx.employeeEarningsByEmployee.value ?? []).map(s => {
    const payments = paymentsCtx.paymentsMade.value.filter(p => p.employeeId === s.employeeId)
    const totalPaid = payments.filter(p => p.type !== 'consumption').reduce((sum, p) => sum + p.amount, 0)
    const totalConsumed = payments.filter(p => p.type === 'consumption').reduce((sum, p) => sum + p.amount, 0)
    return { ...s, totalPaid, totalConsumed, pendingBalance: Math.max(0, s.totalEarned - totalPaid - totalConsumed) }
  }).filter(s => s.totalEarned > 0 || s.totalPaid > 0 || s.totalConsumed > 0)
})

const deudaConSaldo = computed(() => employeeDebtSummary.value.filter(r => r.pendingBalance > 0))
const totalComisiones = computed(() => summaryCtx.employeePayments.value.reduce((acc, p) => acc + p.earnings, 0))
const totalNominaPagada = computed(() => paymentsCtx.paymentsMade.value.filter(p => p.type !== 'consumption').reduce((acc, p) => acc + p.amount, 0))
const totalConsumido = computed(() => paymentsCtx.paymentsMade.value.filter(p => p.type === 'consumption').reduce((acc, p) => acc + p.amount, 0))
const totalDeudaPendiente = computed(() => deudaConSaldo.value.reduce((acc, r) => acc + r.pendingBalance, 0))
</script>
