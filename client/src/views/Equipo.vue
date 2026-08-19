<template>
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <UsersGroupRoundedIcon class="h-3.5 w-3.5" />
        <span>{{ businessStore.terminology.employee || 'Empleado' }}s</span>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="canEditEmployeeRate && !businessStore.isSingleCurrency" @click="showEmployeeRateModal = true"
          class="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-theme hover:bg-bg-secondary">
          <DollarIcon class="h-4 w-4" />
          <span class="hidden sm:inline">Tasa empleados</span>
          <span v-if="businessStore.employeeExchangeRate" class="ml-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning tabular-nums">{{ businessStore.employeeExchangeRate }}</span>
        </button>
        <button @click="handleNewEmpleado"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover">
          <AddCircleIcon class="h-4 w-4" />
          <span>Nuevo {{ businessStore.terminology.employee || 'Empleado' }}</span>
        </button>
      </div>
    </div>
  </header>

  <div class="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-8" :class="isStaffing ? 'lg:grid-cols-1' : 'lg:grid-cols-4'">
    <StatCard icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" icon-color="primary" :value="totalEmpleados" label="Total" />
    <template v-if="!isStaffing">
      <StatCard icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="info" :value="empleadosPorcentaje" label="Con %" />
      <StatCard icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="warning" :value="empleadosSueldoBase" label="Sueldo base" />
      <StatCard icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" icon-color="success" :value="empleadosMixto" label="Sueldo + %" />
    </template>
  </div>

  <div v-if="isStaffing" class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <SegmentedTabs :tabs="employeeStatusTabs" :model-value="employeeActiveFilter" @update:model-value="employeeActiveFilter = $event as EmployeeActiveFilter" />
    <div class="relative flex-1 sm:max-w-xs">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="`Buscar ${(businessStore.terminology.employee || 'empleado').toLowerCase()}...`"
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <MagnifierIcon class="h-4 w-4" />
      </div>
    </div>
  </div>

  <p v-if="isStaffing && searchQuery.trim() && filteredTeam.length === 0" class="mb-5 rounded-xl border border-border bg-surface p-4 text-center text-sm text-text-muted">
    Ningún {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }} coincide con "{{ searchQuery.trim() }}".
  </p>

  <EmployeeGrid
    :employees="visibleTeam" :show-all="showAll" :has-more="hasMoreThanDefault" :total-count="team.length"
    :get-initials="getInitials" :is-staffing="isStaffing" :show-agenda="showAgenda"
    @edit="handleEditEmpleado" @view-agenda="handleViewAgenda" @view-recibo="handleOpenRecibo"
    @toggle-active="handleToggleActive" @toggle-show-all="showAll = !showAll"
  />

  <!--
    Staffing has no commissions, no VES, no schedules in the agenda sense — the whole
    commission-oriented GestionTabs (nomina/pagos/deuda/horarios) doesn't apply here. Hours used
    to be editable from this page too, but that duplicated Nómina and the two views could drift
    out of sync — hours now live only in Nómina (see /admin/nomina).
  -->
  <section v-if="isStaffing" class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 lg:p-6">
    <div>
      <p class="text-sm font-semibold text-text">Horas y pago de la semana</p>
      <p class="text-xs text-text-muted">Carga y calcula las horas trabajadas desde el módulo de Nómina.</p>
    </div>
    <router-link to="/admin/nomina"
      class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover">
      Ir a Nómina
    </router-link>
  </section>

  <GestionTabs
    v-else
    :summary-ctx="summaryCtx" :payments-ctx="paymentsCtx" :business-store="businessStore"
    :team-schedule="teamSchedule"
    :total-comisiones="totalComisiones" :total-nomina-pagada="totalNominaPagada"
    :total-consumido="totalConsumido" :total-deuda-pendiente="totalDeudaPendiente"
    :deuda-con-saldo="deudaConSaldo"
    :format-u-s-d="formatUSD" :format-secondary="formatSecondary" :format-v-e-s-es="formatVESEs"
    :format-method="formatMethod"
    :format-time24to12="formatTime24to12"
    :selected-month="selectedMonth" :selected-period="selectedPeriod"
    @update:selected-period="selectedPeriod = $event"
    @update:selected-month="selectedMonth = $event"
    @reset-current-month="resetToCurrent"
    @open-payment="paymentsCtx.openPaymentModal()"
    @open-consumption="paymentsCtx.openConsumptionModal()"
    @open-edit-payment="(ep) => paymentsCtx.openEditPayment(ep)"
    @delete-payment="(id) => paymentsCtx.handleDelete(id)"
    @open-recibo="handleOpenRecibo"
  />

  <EmployeePaymentModal
    :payments-ctx="paymentsCtx" :business-id="authStore.businessId"
    :branch-id="businessStore.currentBranchId"
    :employees="teamForPayroll"
    @close="paymentsCtx.closePaymentModal()"
    @payment-saved="onPaymentSaved"
  />

  <EmployeeConsumptionModal
    :payments-ctx="paymentsCtx" :business-id="authStore.businessId"
    :branch-id="businessStore.currentBranchId"
    :employees="teamForPayroll"
    @close="paymentsCtx.closeConsumptionModal()"
    @consumption-saved="onPaymentSaved"
  />

  <EmployeeReciboModal
    :is-open="showReciboModal"
    :employee="selectedReciboEmployee"
    @close="showReciboModal = false"
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
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado, type EmployeeActiveFilter } from '../services/equipoService'
import { adminUpdateEmployee } from '../services/adminService'
import { useBusinessStore } from '../store/business'
import { getInitials, formatMethod, formatTime24to12 } from '../lib/formatters'
import { resolvePeriodDates } from '../lib/periodUtils'
import { EmpleadoFormModal } from '../components/modals'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import { useQueryClient } from '@tanstack/vue-query'
import { employeePaymentKeys } from '../services/employeePaymentsService'
import { StatCard } from '../components/common'
import SegmentedTabs from '../components/common/SegmentedTabs.vue'
import EmployeeGrid from '../components/common/EmployeeGrid.vue'
import EmployeePaymentModal from '../components/equipo/EmployeePaymentModal.vue'
import EmployeeConsumptionModal from '../components/equipo/EmployeeConsumptionModal.vue'
import EmployeeReciboModal from '../components/equipo/EmployeeReciboModal.vue'
import EmployeeRateModal from '../components/equipo/EmployeeRateModal.vue'
import GestionTabs from '../components/equipo/GestionTabs.vue'
import type { Empleado, EmpleadoFormData } from '../types/empleado'
import { UsersGroupRoundedIcon, DollarIcon, AddCircleIcon, MagnifierIcon } from '@solar-icons/vue/linear'

const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const empleadoModalRef = ref<InstanceType<typeof EmpleadoFormModal> | null>(null)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const isStaffing = computed(() => businessStore.hasCapability('staffing.timesheets'))
const showAgenda = computed(() => businessStore.hasFeature('agenda'))

const employeeActiveFilter = ref<EmployeeActiveFilter>('active')
const employeeStatusTabs = [
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'all', label: 'Todos' },
]

const selectedReciboEmployee = ref<any>(null)
const showReciboModal = ref(false)

const handleOpenRecibo = (e: any) => {
  const empId = e.id || e.employeeId
  const member = team.value.find(t => t.id === empId) || {
    id: empId,
    name: e.name || e.employeeName || 'Empleado',
    payType: e.payType || e.pay_type || 'percentage',
    payPercentage: Number(e.payPercentage ?? e.pay_percentage ?? 50),
    baseSalary: Number(e.baseSalary ?? e.base_salary ?? 0),
  }
  selectedReciboEmployee.value = member
  showReciboModal.value = true
}

const { selectedPeriod, selectedMonth, resetToCurrent } = usePeriodSelection()
const canEditEmployeeRate = computed(() => {
  const role = authStore.role
  if (role === 'admin' || role === 'superadmin') return true
  if (role === 'encargado' && businessStore.hasFeature('encargados_change_employee_rate')) return true
  return false
})
const periodDates = computed(() => resolvePeriodDates(selectedPeriod.value, selectedMonth.value))
const emptyExpenses = ref<{ date: string; amount: number }[]>([])
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, emptyExpenses, selectedMonth)
const paymentsCtx = useEmployeePayments(businessId, periodDates)

const onPaymentSaved = async () => {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value], exact: false }),
  ])
  await queryClient.refetchQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false })
}

const { items: rawTeam, handleSave: handleSaveEmpleado, handleDelete: handleDeleteEmpleado, isSaving } = useCrud<Empleado, EmpleadoFormData>({
  businessId, branchId,
  queryKey: (id, brId) => equipoKeys.all(id, brId, isStaffing.value ? employeeActiveFilter.value : undefined),
  queryFn: (id, brId) => listEquipo(id, brId, isStaffing.value ? employeeActiveFilter.value : 'active'),
  saveFn: (id, data, brId) => saveEmpleado(data, id, brId),
  deleteFn: (id) => deleteEmpleado(id),
  entityName: 'Empleado', modalRef: empleadoModalRef,
  extraInvalidations: [
    (id) => ['appointments', id, branchId.value],
    (id) => ['dashboard-services', id],
    (id) => ['dashboard-payments', id],
    (id) => ['dashboard-history', id],
    (id) => ['employees', id, branchId.value],
  ],
})

// Staffing workers placed at client companies belong in the main list for staffing businesses.
// For other business types, we filter them out so they don't pollute the generic team list.
const team = computed(() => isStaffing.value ? rawTeam.value : rawTeam.value.filter(e => !e.staffingAssignments?.length))

const teamForPayroll = computed(() => team.value.filter(e => !e.isCajero))

const showEmployeeRateModal = ref(false)

const searchQuery = ref('')
const filteredTeam = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return team.value
  return team.value.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.role || '').toLowerCase().includes(q) ||
    (e.email || '').toLowerCase().includes(q) ||
    (e.phone || '').toLowerCase().includes(q) ||
    (e.staffingAssignments || []).some(a => (a.companyName || '').toLowerCase().includes(q))
  )
})

const DEFAULT_VISIBLE = 4
const showAll = ref(false)
// Searching shows every match at once — hiding a result the admin just searched for behind
// "ver todos" would defeat the point of the search bar.
const hasMoreThanDefault = computed(() => !searchQuery.value.trim() && team.value.length > DEFAULT_VISIBLE)
const visibleTeam = computed(() => {
  if (searchQuery.value.trim() || showAll.value) return filteredTeam.value
  return filteredTeam.value.slice(0, DEFAULT_VISIBLE)
})

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

const { success: notifySuccess, error: notifyError } = useNotification()
const handleToggleActive = async (e: Empleado) => {
  const nextActive = e.active === false
  try {
    await adminUpdateEmployee(e.id, { active: nextActive })
    await queryClient.invalidateQueries({ queryKey: equipoKeys.all(businessId.value, branchId.value, isStaffing.value ? employeeActiveFilter.value : undefined), exact: false })
    notifySuccess(nextActive ? 'Empleado activado' : 'Empleado desactivado')
  } catch {
    notifyError('No se pudo actualizar el estado del empleado')
  }
}

const { formatUSD, formatSecondary, formatVESEs } = useCurrency()
const employeeDebtSummary = computed(() => {
  return (paymentsCtx.debt.value ?? []).map((d: any) => ({
    employeeId: d.employee_id,
    employeeName: d.employee_name,
    payType: d.pay_type,
    payPercentage: Number(d.pay_percentage ?? 0),
    baseSalary: Number(d.base_salary ?? 0),
    commissionTotal: Number(d.commission ?? 0) + Number(d.tips ?? 0),
    totalEarned: Number(d.total ?? 0),
    totalPaid: Number(d.paid ?? 0),
    totalConsumed: Number(d.consumed ?? 0),
    pendingBalance: Math.max(0, Number(d.total ?? 0) - Number(d.paid ?? 0) - Number(d.consumed ?? 0)),
  })).filter(d => d.totalEarned > 0 || d.totalPaid > 0 || d.totalConsumed > 0)
})

const deudaConSaldo = computed(() => employeeDebtSummary.value.filter(r => r.pendingBalance > 0))
const totalComisiones = computed(() => summaryCtx.employeePayments.value.reduce((acc, p) => acc + p.earnings, 0))
const totalNominaPagada = computed(() => paymentsCtx.payments.value.filter(p => p.type !== 'consumption').reduce((acc, p) => acc + p.amount, 0))
const totalConsumido = computed(() => paymentsCtx.payments.value.filter(p => p.type === 'consumption').reduce((acc, p) => acc + p.amount, 0))
const totalDeudaPendiente = computed(() => deudaConSaldo.value.reduce((acc, r) => acc + r.pendingBalance, 0))
</script>
