<template>
  <DirectoryHeader :title="plural" :total="team.length" :singular="singular" :plural="pluralLower">
    <button v-if="canEditEmployeeRate && !businessStore.isSingleCurrency" @click="showEmployeeRateModal = true"
      class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-text shadow-sm transition-theme hover:bg-bg-secondary">
      <DollarIcon class="h-4 w-4" />
      <span class="hidden sm:inline">Tasa empleados</span>
      <span v-if="businessStore.employeeExchangeRate" class="ml-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning tabular-nums">{{ businessStore.employeeExchangeRate }}</span>
    </button>
    <button @click="handleNewEmpleado"
      class="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
      <AddCircleIcon class="h-4 w-4" />
      <span>Nuevo<span class="hidden sm:inline"> {{ businessStore.terminology.employee || 'Empleado' }}</span></span>
    </button>
  </DirectoryHeader>

  <TeamDirectory
    v-model:search="searchQuery" v-model:status="employeeActiveFilter"
    :employees="visibleTeam" :stats="{ percentage: empleadosPorcentaje, salaryBase: empleadosSueldoBase, mixed: empleadosMixto }"
    :is-staffing="isStaffing" :show-agenda="showAgenda"
    :has-more="hasMoreThanDefault" :show-all="showAll" :total-count="team.length"
    :hidden-count="hiddenTeamCount" :page-size="TEAM_PAGE" @show-more="teamShown += TEAM_PAGE"
    @toggle-show-all="showAll = !showAll"
    @edit="handleEditEmpleado" @view-info="handleViewEmpleado" @view-agenda="handleViewAgenda" @view-recibo="handleOpenRecibo"
    @toggle-active="handleToggleActive"
  />

  <!--
    Staffing has no commissions, no VES, no schedules in the agenda sense — the whole
    commission-oriented GestionTabs (nomina/pagos/deuda/horarios) doesn't apply here. Hours used
    to be editable from this page too, but that duplicated Nómina and the two views could drift
    out of sync — hours now live only in Nómina (see /admin/nomina).
  -->
  <section v-if="isStaffing" class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm lg:p-5">
    <div>
      <p class="text-sm font-semibold text-text">Horas y pago de la semana</p>
      <p class="text-xs text-text-muted">Carga y calcula las horas trabajadas desde el módulo de Nómina.</p>
    </div>
    <router-link to="/admin/nomina"
      class="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover">
      Ir a Nómina
    </router-link>
  </section>

  <GestionTabs
    v-else
    :summary-ctx="summaryCtx" :payments-ctx="paymentsCtx"
    :team-schedule="teamSchedule"
    :total-comisiones="totalComisiones" :total-nomina-pagada="totalNominaPagada" :total-consumido="totalConsumido"
    :total-deuda-pendiente="totalDeudaPendiente"
    :deuda-con-saldo="deudaConSaldo"
    :selected-month="selectedMonth" :selected-period="selectedPeriod"
    @update:selected-period="selectedPeriod = $event"
    @update:selected-month="selectedMonth = $event"
    @update:debt-dates="debtDates = $event"
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
import { ref, computed, watch } from 'vue'
import { useCrud } from '../composables/empleados/useCrud'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { usePeriodSelection } from '../composables/finanzas/usePeriodSelection'
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado, type EmployeeActiveFilter } from '../services/equipoService'
import { adminUpdateEmployee } from '../services/adminService'
import { useBusinessStore } from '../store/business'
import { resolvePeriodDates } from '../lib/periodUtils'
import { EmpleadoFormModal } from '../components/modals'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import { useQueryClient } from '@tanstack/vue-query'
import { employeePaymentKeys } from '../services/employeePaymentsService'
import DirectoryHeader from '../components/common/DirectoryHeader.vue'
import TeamDirectory from '../components/equipo/TeamDirectory.vue'
import EmployeePaymentModal from '../components/equipo/EmployeePaymentModal.vue'
import EmployeeConsumptionModal from '../components/equipo/EmployeeConsumptionModal.vue'
import EmployeeReciboModal from '../components/equipo/EmployeeReciboModal.vue'
import EmployeeRateModal from '../components/equipo/EmployeeRateModal.vue'
import GestionTabs from '../components/equipo/GestionTabs.vue'
import type { ScheduleRow } from '../components/equipo/HorariosPanel.vue'
import type { DebtRow } from '../components/equipo/DeudaPanel.vue'
import type { Empleado, EmpleadoFormData } from '../types/empleado'
import { DollarIcon, AddCircleIcon } from '@solar-icons/vue/linear'

const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const empleadoModalRef = ref<InstanceType<typeof EmpleadoFormModal> | null>(null)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const isStaffing = computed(() => businessStore.hasCapability('staffing.timesheets'))
const showAgenda = computed(() => businessStore.hasFeature('agenda'))

const plural = computed(() => businessStore.terminology.employeePlural || 'Empleados')
const pluralLower = computed(() => plural.value.toLowerCase())
const singular = computed(() => (businessStore.terminology.employee || 'empleado').toLowerCase())

// Negocios de personal: activos / inactivos lo decide el servidor.
const employeeActiveFilter = ref<EmployeeActiveFilter>('active')

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
    salaryFrequency: e.salaryFrequency || e.salary_frequency || 'monthly',
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
const debtDates = ref<{ start: string; end: string } | null>(null)
const paymentsCtx = useEmployeePayments(businessId, periodDates, debtDates)

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
    // A staffing worker's company/role assignments are saved alongside the profile, but the
    // Nómina roster (useTimesheets) is keyed by its own query — without this it silently keeps
    // showing the stale roster for up to 5min after adding/editing an assignment.
    (id) => ['staffing-company-employees', id],
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
// With a big team (staffing can have hundreds) «Ver todos» and a broad search draw them TEAM_PAGE at a
// time; the total in «Ver todos (N)» is still the real one. Under TEAM_PAGE people nothing changes.
const TEAM_PAGE = 50
const teamShown = ref(TEAM_PAGE)
watch([searchQuery, employeeActiveFilter, showAll], () => { teamShown.value = TEAM_PAGE })
const showingEveryone = computed(() => !!searchQuery.value.trim() || showAll.value)
const visibleTeam = computed(() => {
  if (showingEveryone.value) return filteredTeam.value.slice(0, teamShown.value)
  return filteredTeam.value.slice(0, DEFAULT_VISIBLE)
})
const hiddenTeamCount = computed(() => showingEveryone.value ? Math.max(0, filteredTeam.value.length - teamShown.value) : 0)

const teamSchedule = computed<ScheduleRow[]>(() => team.value.filter(m => m.schedule).map(m => ({
  id: m.id, name: m.name, start: m.schedule?.start ?? '', end: m.schedule?.end ?? '',
  break: (m.schedule?.breakStart && m.schedule?.breakEnd)
    ? `${m.schedule.breakStart} - ${m.schedule.breakEnd}`
    : 'Sin descanso registrado',
  appointments: 0, available: true,
})))

const empleadosPorcentaje = computed(() => team.value.filter(e => e.payType === 'percentage' || e.payType === 'mixed').length)
const empleadosSueldoBase = computed(() => team.value.filter(e => e.payType === 'salary' || e.payType === 'mixed').length)
const empleadosMixto = computed(() => team.value.filter(e => e.payType === 'mixed').length)

const handleNewEmpleado = () => empleadoModalRef.value?.open()
const handleEditEmpleado = (e: Empleado) => empleadoModalRef.value?.open(e)
const handleViewEmpleado = (e: Empleado) => empleadoModalRef.value?.open(e, { readOnly: true })
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

const employeeDebtSummary = computed<DebtRow[]>(() => {
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
  })).filter((d: DebtRow) => d.totalEarned > 0 || d.totalPaid > 0 || d.totalConsumed > 0)
})

const deudaConSaldo = computed(() => employeeDebtSummary.value.filter(r => r.pendingBalance > 0))
const totalComisiones = computed(() => summaryCtx.employeePayments.value.reduce((acc: number, p: { earnings: number }) => acc + p.earnings, 0))
const totalNominaPagada = computed(() => paymentsCtx.payments.value.filter((p: { type?: string }) => p.type !== 'consumption').reduce((acc: number, p: { amount: number }) => acc + p.amount, 0))
const totalConsumido = computed(() => paymentsCtx.payments.value.filter((p: { type?: string }) => p.type === 'consumption').reduce((acc: number, p: { amount: number }) => acc + p.amount, 0))
const totalDeudaPendiente = computed(() => deudaConSaldo.value.reduce((acc, r) => acc + r.pendingBalance, 0))
</script>
