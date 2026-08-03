<template>
  <div>

      <!-- Header -->
      <header class="mb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              <CalendarIcon class="h-3.5 w-3.5" />
              {{ businessStore.terminology.appointment || 'Cita' }}s
            </div>
            <h1 class="text-xl font-bold tracking-tight text-text sm:text-2xl lg:text-3xl">
              {{ todayLabel }}
            </h1>
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
            <template v-if="businessStore.hasFeature('enable_public_booking')">
              <div class="relative flex" v-click-outside="() => shareDropdownOpen = false">
                <button
                  @click="copyDefaultShareLink"
                  class="flex items-center gap-1.5 rounded-l-lg border border-primary/30 bg-primary-light px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 border-r-0"
                >
                  <LinkIcon class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline">Link de reserva</span>
                </button>
                <button
                  @click="shareDropdownOpen = !shareDropdownOpen"
                  class="rounded-r-lg border border-primary/30 bg-primary-light px-1.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 border-l border-primary/20"
                >
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
                  <div v-if="shareDropdownOpen" class="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                    <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2.5 py-1.5">Selecciona empleado</p>
                    <button
                      v-for="emp in shareableEmployees"
                      :key="emp.id"
                      @click="copyShareLink(emp.id)"
                      class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg-secondary text-left"
                    >
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
                        {{ getInitials(emp.full_name) }}
                      </div>
                      <span class="truncate text-text">{{ emp.full_name }}</span>
                    </button>
                    <div v-if="shareableEmployees.length === 0" class="px-2.5 py-3 text-xs text-text-muted text-center">
                      No hay empleados disponibles
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
            <button
              v-if="canManageInvitations"
              @click="openInvitations"
              class="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-3 py-2 text-xs font-semibold text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40"
            >
              <BellIcon class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">Invitaciones</span>
            </button>
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
            <button
              v-if="canManageInvitations"
              @click="openInvitations"
              class="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40"
            >
              <BellIcon class="h-3.5 w-3.5" />
              Invitaciones
            </button>
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
    <PendingInvitationsModal ref="invitationsModalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useAdminAgenda } from '../composables/agenda/useAdminAgenda'
import { useBusinessStore } from '../store/business'
import { useNotification } from '../composables/common/useNotification'
import { useAppointmentMutations } from '../composables/agenda/useAppointmentMutations'
import { CitaFormModal } from '../components/modals'
import { db } from '../lib/api'
import AgendaListView from '../components/agenda/AgendaListView.vue'
import PendingInvitationsModal from '../components/agenda/PendingInvitationsModal.vue'
import type { Cita, PaymentEditContext } from '../types/cita'
import type { PaymentMethod } from '../types/database'
import { CalendarIcon, LinkIcon, BellIcon, AddCircleIcon, ClipboardIcon, ClockCircleIcon, CheckCircleIcon, DollarIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const { success } = useNotification()

const canManageInvitations = computed(() => {
  const role = authStore.role
  if (!role) return false
  if (role === 'admin' || role === 'superadmin') return businessStore.hasFeature('enable_public_booking')
  return (authStore.profile as any)?.can_create_appointments !== false
})

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const invitationsModalRef = ref<InstanceType<typeof PendingInvitationsModal> | null>(null)

function openInvitations() {
  invitationsModalRef.value?.open()
}
const editingCita = ref<Cita | null>(null)
const businessId = computed(() => authStore.businessId)
const viewMode = ref<'active' | 'historial'>('active')

const shareDropdownOpen = ref(false)

const displayedCitas = computed(() =>
  viewMode.value === 'historial' ? historialCitas.value : activeCitas.value
)

const {
  filterDate,
  dateFilterMode,
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

const shareableEmployees = computed(() =>
  empleadosList.value.filter((e: any) => !e.disableAgenda)
)

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

function copyShareLink(employeeId: string) {
  shareDropdownOpen.value = false
  const origin = window.location.origin
  const slug = businessStore.business?.slug || 'salon'
  const link = `${origin}/reservar/${slug}?empleado=${employeeId}`
  navigator.clipboard.writeText(link).then(() => {
    success('Link de reserva copiado al portapapeles')
  }).catch(() => {
    prompt('Copia este link:', link)
  })
}

function copyDefaultShareLink() {
  const defaultEmpId = authStore.profile?.id || shareableEmployees.value[0]?.id
  if (defaultEmpId) {
    copyShareLink(defaultEmpId)
  }
}

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
