<template>
  <div>

      <!-- Header -->
      <header class="mb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              <CalendarIcon class="h-3.5 w-3.5" />
              Agenda
            </div>
            <p class="text-sm font-semibold text-text sm:text-base">{{ todayLabel }}</p>
          </div>

          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-lg border border-border bg-bg-secondary/50 p-0.5">
              <button
                @click="viewMode = 'active'"
                class="rounded-md px-3 py-1.5 text-xs font-semibold transition-theme sm:px-4 sm:py-2 sm:text-sm"
                :class="viewMode === 'active' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
              >
                Activas
              </button>
              <button
                @click="viewMode = 'historial'"
                class="rounded-md px-3 py-1.5 text-xs font-semibold transition-theme sm:px-4 sm:py-2 sm:text-sm"
                :class="viewMode === 'historial' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
              >
                Historial
              </button>
            </div>
            <ShareLinkButton :employees="shareLinkEmployees" />
            <button
              @click="handleNewCita"
              class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover sm:gap-2 sm:px-4"
              :aria-label="`Nueva ${(businessStore.terminology.appointment || 'cita').toLowerCase()}`"
            >
              <AddCircleIcon class="h-4 w-4" />
              <span class="hidden sm:inline">Nueva {{ (businessStore.terminology.appointment || 'cita').toLowerCase() }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div class="rounded-lg border border-border bg-surface p-2.5 transition-theme hover:border-border-strong sm:rounded-xl sm:p-4">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
              <ClipboardIcon class="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold tabular-nums text-text sm:text-2xl">{{ stats.citasHoy }}</p>
              <p class="text-[10px] text-text-muted sm:text-xs truncate">{{ businessStore.terminology.appointment || 'Cita' }}s {{ periodLabel }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-surface p-2.5 transition-theme hover:border-border-strong sm:rounded-xl sm:p-4">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning sm:h-9 sm:w-9">
              <ClockCircleIcon class="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold tabular-nums text-text sm:text-2xl">{{ stats.pendientes }}</p>
              <p class="text-[10px] text-text-muted sm:text-xs">Pendientes</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-surface p-2.5 transition-theme hover:border-border-strong sm:rounded-xl sm:p-4">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success sm:h-9 sm:w-9">
              <CheckCircleIcon class="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold tabular-nums text-text sm:text-2xl">{{ stats.confirmadas }}</p>
              <p class="text-[10px] text-text-muted sm:text-xs">Confirmadas</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-surface p-2.5 transition-theme hover:border-border-strong sm:rounded-xl sm:p-4">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info sm:h-9 sm:w-9">
              <DollarIcon class="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-lg font-bold tabular-nums text-text sm:text-2xl">${{ stats.estimadoHoy }}</p>
              <p class="text-[10px] text-text-muted sm:text-xs">Estimado</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Agenda List -->
      <section class="mb-4">
        <header class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-bold text-text lg:text-lg">{{ viewMode === 'historial' ? 'Historial' : (businessStore.terminology.appointment || 'Cita') + 's' }}</h2>
            <p v-if="displayedCitas.length > 0" class="text-xs text-text-muted">{{ displayedCitas.length }} {{ (businessStore.terminology.appointment || 'cita').toLowerCase() }}{{ displayedCitas.length !== 1 ? 's' : '' }}</p>
          </div>
          <div v-if="viewMode === 'active'" class="flex flex-wrap items-center gap-2">
            <input
              type="date"
              :value="filterDate ?? ''"
              @change="setFilterDate(($event.target as HTMLInputElement).value || null)"
              :disabled="dateFilterMode === 'week'"
              class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-40"
            />
            <div class="inline-flex rounded-lg border border-border bg-bg-secondary/50 p-0.5">
              <button
                @click="goToToday"
                class="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-theme sm:px-3 sm:text-xs"
                :class="isToday ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
              >
                Hoy
              </button>
              <button
                @click="setWeekMode"
                class="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-theme sm:px-3 sm:text-xs"
                :class="isThisWeek ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
              >
                Semana
              </button>
              <button
                @click="showAll"
                class="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-theme sm:px-3 sm:text-xs"
                :class="dateFilterMode === 'all' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
              >
                Todas
              </button>
            </div>
          </div>
        </header>

        <AgendaListView
          :citas="displayedCitas"
          :loading="isLoading"
          :t="(businessStore.terminology.appointment || 'cita').toLowerCase()"
          @edit="handleEditCita"
          @delete="handleDeleteCita"
        />
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
import type { Cita, PaymentEditContext } from '../types/cita'
import type { PaymentMethod } from '../types/database'
import { CalendarIcon, AddCircleIcon, ClipboardIcon, ClockCircleIcon, CheckCircleIcon, DollarIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const editingCita = ref<Cita | null>(null)
const businessId = computed(() => authStore.businessId)
const viewMode = ref<'active' | 'historial'>('active')

const displayedCitas = computed(() =>
  viewMode.value === 'historial' ? historialCitas.value : activeCitas.value
)

const {
  filterDate,
  dateFilterMode,
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
  setFilterDate,
} = useAdminAgenda(() => authStore.businessId)

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
  empleadosList.value.filter((e: any) => !e.disableAgenda).map((e: any) => ({ id: e.id, label: e.name }))
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
