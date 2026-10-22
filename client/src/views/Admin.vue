<template>
  <div>

      <!-- Header -->
      <header class="mb-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <CalendarIcon class="h-4 w-4 shrink-0 text-primary" />
            <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">Agenda</h1>
          </div>
          <p class="mt-0.5 truncate text-sm text-text-muted">{{ todayLabel }}</p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <ShareLinkButton :employees="shareLinkEmployees" />
          <button
            @click="handleNewCita"
            class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover sm:gap-2 sm:px-4"
            :aria-label="`Nueva ${(businessStore.terminology.appointment || 'cita').toLowerCase()}`"
          >
            <AddCircleIcon class="h-4 w-4" />
            <span class="hidden sm:inline">Nueva {{ (businessStore.terminology.appointment || 'cita').toLowerCase() }}</span>
          </button>
        </div>
      </header>

      <section class="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AgendaSummaryStrip
          :stats="stats"
          :status-filter="statusFilter"
          :period-label="periodLabel"
          :plural="businessStore.terminology.appointmentPlural || 'Citas'"
          @toggle="toggleStatusFilter"
        />

        <div class="flex gap-1 border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Vista de la agenda">
          <button
            v-for="m in VIEW_MODES"
            :key="m.value"
            type="button"
            role="tab"
            :aria-selected="viewMode === m.value"
            class="relative px-3 py-2.5 text-sm font-medium transition-colors"
            :class="viewMode === m.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
            @click="viewMode = m.value"
          >
            {{ m.label }}
            <span v-if="viewMode === m.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
          </button>
        </div>

        <AgendaFilters
          v-model:employee="employeeFilter"
          v-model:service="serviceFilter"
          :search-query="searchQuery"
          :search-hint="`Buscar por ${businessStore.terminology.client?.toLowerCase() || 'cliente'}, ${businessStore.terminology.service?.toLowerCase() || 'servicio'} o ${businessStore.terminology.employee?.toLowerCase() || 'empleado'}`"
          :employee-options="employeeOptions"
          :service-options="serviceOptions"
          :employee-label="businessStore.terminology.employee || 'Empleado'"
          :service-label="businessStore.terminology.service || 'Servicio'"
          :show-date-controls="viewMode === 'active'"
          :is-searching="isSearching"
          :date-filter-mode="dateFilterMode"
          :filter-date="filterDate"
          :range-start="rangeStart"
          :range-end="rangeEnd"
          :today-label="todayLabel"
          :is-today="isToday"
          :is-this-week="isThisWeek"
          :has-active-filters="hasActiveFilters"
          @search="setSearchQuery"
          @step-day="stepDay"
          @step-week="stepWeek"
          @set-filter-date="setFilterDate"
          @set-custom-range="setCustomRange"
          @today="goToToday"
          @week="setWeekMode"
          @range="openRangeMode"
          @all="showAll"
          @reset="resetFilters"
        />

        <AgendaListView
           :citas="filteredCitas"
           :loading="isLoading"
           :t="(businessStore.terminology.appointment || 'cita').toLowerCase()"
           :t-plural="(businessStore.terminology.appointmentPlural || 'Citas').toLowerCase()"
           :labels="businessStore.terminology"
          @edit="handleEditCita"
          @delete="handleDeleteCita"
        >
          <template #summary>
            <span class="font-semibold text-text">{{ viewMode === 'historial' ? 'Historial' : (businessStore.terminology.appointmentPlural || 'Citas') }}</span>
            <template v-if="filteredCitas.length > 0"> · {{ filteredCitas.length }} {{ filteredCitas.length === 1 ? (businessStore.terminology.appointment || 'cita').toLowerCase() : (businessStore.terminology.appointmentPlural || 'Citas').toLowerCase() }}</template>
          </template>
        </AgendaListView>
      </section>

    <!-- Modals -->
    <CitaFormModal
      ref="citaModalRef"
      :servicios="serviciosList"
      :empleados="empleadosList"
      @save="handleSaveCita"
      @delete="handleDeleteCita"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useAdminAgenda } from '../composables/agenda/useAdminAgenda'
import { useBusinessStore } from '../store/business'
import { useAppointmentMutations } from '../composables/agenda/useAppointmentMutations'
import { CitaFormModal } from '../components/modals'
import { db } from '../lib/api'
import AgendaListView from '../components/agenda/AgendaListView.vue'
import ShareLinkButton from '../components/agenda/ShareLinkButton.vue'
import AgendaSummaryStrip from '../components/agenda/AgendaSummaryStrip.vue'
import AgendaFilters from '../components/agenda/AgendaFilters.vue'
import type { Cita, PaymentEditContext } from '../types/cita'
import type { PaymentMethod } from '../types/database'
import { CalendarIcon, AddCircleIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const editingCita = ref<Cita | null>(null)
const businessId = computed(() => authStore.businessId)
const viewMode = ref<'active' | 'historial'>('active')

const displayedCitas = computed(() =>
  viewMode.value === 'historial' ? historialCitas.value : activeCitas.value
)

const VIEW_MODES = [
  { value: 'active' as const, label: 'Activas' },
  { value: 'historial' as const, label: 'Historial' },
]

const employeeFilter = ref('all')
const serviceFilter = ref('all')
const statusFilter = ref<'all' | 'pending' | 'confirmed'>('all')

function toggleStatusFilter(status: 'all' | 'pending' | 'confirmed') {
  if (status === 'all') { statusFilter.value = 'all'; return }
  statusFilter.value = statusFilter.value === status ? 'all' : status
  if (statusFilter.value !== 'all') viewMode.value = 'active'
}

const filteredCitas = computed(() => {
  let list = displayedCitas.value
  if (employeeFilter.value !== 'all') list = list.filter(c => c.employeeId === employeeFilter.value)
  if (serviceFilter.value !== 'all') list = list.filter(c => c.serviceId === serviceFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(c => c.status === statusFilter.value)
  return list
})

const {
  filterDate,
  dateFilterMode,
  rangeStart,
  rangeEnd,
  citasData,
  citas,
  activeCitas,
  historialCitas,
  isLoading,
  stats,
  serviciosList,
  empleadosList,
  todayLabel,
  isToday,
  isThisWeek,
  periodLabel,
  goToToday,
  showAll,
  setWeekMode,
  stepDay,
  stepWeek,
  setFilterDate,
  openRangeMode,
  setCustomRange,
  searchQuery,
  setSearchQuery,
  isSearching,
} = useAdminAgenda(() => authStore.businessId)

const employeeOptions = computed(() => [
  { value: 'all', label: `Todos los ${(businessStore.terminology.employeePlural || 'Empleados').toLowerCase()}` },
  ...empleadosList.value.map((e: any) => ({ value: e.id, label: e.name })),
])
const serviceOptions = computed(() => [
  { value: 'all', label: `Todos los ${(businessStore.terminology.servicePlural || 'Servicios').toLowerCase()}` },
  ...serviciosList.value.map((s: any) => ({ value: s.id, label: s.name })),
])

const hasActiveFilters = computed(() =>
  !!searchQuery.value.trim() ||
  employeeFilter.value !== 'all' ||
  serviceFilter.value !== 'all' ||
  statusFilter.value !== 'all' ||
  // La vista arranca en "Semana" (no "Hoy"), así que esa es la línea base -- no marcar
  // "Limpiar filtros" como activo solo por estar en la semana actual sin tocar nada.
  !(isToday.value || isThisWeek.value)
)

function resetFilters() {
  setSearchQuery('')
  employeeFilter.value = 'all'
  serviceFilter.value = 'all'
  statusFilter.value = 'all'
  viewMode.value = 'active'
  setWeekMode()
}

// Llegada desde "Ver cita" en una notificación (NotificationDropdown → useNotifications.ts),
// que solo sabe el appointment_id de UNA fila de servicio del grupo — la lista de aquí ya
// dedup por group_id (ver useAdminAgenda), así que hay que resolver a qué cita agrupada
// pertenece esa fila antes de poder encontrarla en `displayedCitas`.
const route = useRoute()
const router = useRouter()
const pendingAppointmentId = ref<string | null>(
  typeof route.query.appointment === 'string' ? route.query.appointment : null
)
if (pendingAppointmentId.value) {
  showAll()
}
watch([citas, isLoading], () => {
  const targetId = pendingAppointmentId.value
  if (!targetId) return
  const rawMatch = (citasData.value ?? []).find(c => c.id === targetId)
  const targetGroupId = rawMatch?.groupId ?? targetId
  const cita = citas.value.find(c => c.id === targetId || (c.groupId && c.groupId === targetGroupId))
  if (cita) {
    handleEditCita(cita)
    pendingAppointmentId.value = null
    router.replace({ query: { ...route.query, appointment: undefined } })
  } else if (!isLoading.value) {
    pendingAppointmentId.value = null
  }
}, { immediate: true })

const shareLinkEmployees = computed(() =>
  empleadosList.value
    .filter((e: any) => !e.disableAgenda && e.showInPublicBooking !== false)
    .map((e: any) => ({ id: e.id, label: e.name }))
)

const {
  handleSaveCita,
  handleDeleteCita,
} = useAppointmentMutations({
  businessId,
  createdBy: computed(() => authStore.profile?.id),
  modalRef: citaModalRef,
})

const handleNewCita = () => {
  editingCita.value = null
  citaModalRef.value?.open()
}

const handleEditCita = async (cita: Cita) => {
  editingCita.value = cita
  if (cita.paymentStatus === 'paid' || cita.status === 'paid') {
    const { data: tx } = await db
      .from('transactions')
      .select('id, total_amount, method, exchange_rate_used, payments_breakdown, notes, tip_amount')
      .eq('appointment_id', cita.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tx) {
      const paymentData: PaymentEditContext = {
        transactionId: tx.id,
        method: tx.method as PaymentMethod,
        amount: tx.total_amount,
        currency: 'USD',
        exchangeRate: tx.exchange_rate_used ?? 1,
        tipAmount: Number((tx as any).tip_amount ?? 0),
        notes: (tx as any).notes || undefined,
        breakdown: (tx as any).payments_breakdown || undefined,
      }
      const firstBreakdown = (tx as any).payments_breakdown?.[0]
      if (firstBreakdown?.currency === 'VES') {
        paymentData.currency = 'VES'
        paymentData.amount = (tx as any).payments_breakdown.reduce((sum: number, item: any) => sum + item.inputAmount, 0)
      }
      citaModalRef.value?.open(cita, paymentData)
      return
    }
  }
  citaModalRef.value?.open(cita)
}

</script>
