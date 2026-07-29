<template>
  <AppLayout>
    <template #header-actions>
      <div class="flex items-center gap-2">
        <button
          v-if="canManageInvitations"
          @click="openInvitations"
          class="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span class="hidden sm:inline">Invitaciones</span>
        </button>
        <button
          @click="copyShareLink"
          class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          title="Compartir link de reserva"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span class="hidden sm:inline">Compartir link</span>
        </button>
      </div>
    </template>
    <div class="h-[calc(100dvh-120px)] max-md:h-[calc(100dvh-180px)] min-h-[500px]">
        <AgendaCalendar
          @event-click="handleEventClick"
          @status-change="handleStatusChange"
          @event-change="handleEventChange"
          @slot-select="handleSlotSelect"
          @checkout="handleCheckout"
          @delete="handleDeleteCita"
        />
    </div>
  </AppLayout>

    <CitaFormModal
    ref="citaModalRef"
    :servicios="serviciosList"
    :empleados="empleadosList"
    @save="handleSaveCita"
    @delete="handleDeleteCita"
  />
  <PendingInvitationsModal ref="invitationsModalRef" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useNotification } from '../../composables/common/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useAppointmentMutations } from '../../composables/agenda/useAppointmentMutations'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import AppLayout from '../../components/layout/AppLayout.vue'
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue'
import { toISODate, dateToHHmm } from '../../lib/formatters'
import { CitaFormModal } from '../../components/modals'
import PendingInvitationsModal from '../../components/agenda/PendingInvitationsModal.vue'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const router = useRouter()
const { success } = useNotification()
const businessStore = useBusinessStore()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const canManageInvitations = computed(() => (authStore.profile as any)?.can_create_appointments !== false)

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const invitationsModalRef = ref<InstanceType<typeof PendingInvitationsModal> | null>(null)

const { data: serviciosData } = useQuery({
  queryKey: computed(() => serviciosKeys.all(businessId.value, branchId.value)),
  queryFn: () => listServicios(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const { data: empleadosData } = useQuery({
  queryKey: computed(() => equipoKeys.all(businessId.value, branchId.value)),
  queryFn: () => listEquipo(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const serviciosList = computed(() => (serviciosData.value ?? []).map(s => ({
  id: s.id, name: s.name, price: s.price, duration: s.duration, is_fixed_commission: s.is_fixed_commission, fixed_commission_amount: s.fixed_commission_amount, fixed_commission_assistant_amount: s.fixed_commission_assistant_amount,
})))

const empleadosList = computed(() => (empleadosData.value ?? []).map(e => ({
  id: e.id, name: e.name, payType: e.payType, payPercentage: e.payPercentage, disableAgenda: e.disableAgenda,
})))

const handleSlotSelect = ({ start, employeeId }: { start: Date; employeeId?: string }) => {
  const date = toISODate(start)
  const time = dateToHHmm(start)
  const empName = employeeId ? empleadosData.value?.find(e => e.id === employeeId)?.name ?? '' : ''
  citaModalRef.value?.open({ id: '', clientName: '', service: '', employee: empName, employeeId: employeeId || '', date, time, duration: 30, price: 0, status: 'pending' })
}

const handleEventClick = (event: { id: string; title: string; start: Date; end: Date; citaData?: Cita }) => {
  if (event.citaData) {
    citaModalRef.value?.open(event.citaData)
  }
}

const handleCheckout = (appointmentId: string) => {
  router.push({ name: 'admin-pos', query: { appointment: appointmentId } })
}

const {
  handleSaveCita,
  handleStatusChange,
  handleEventChange,
  handleDeleteCita,
} = useAppointmentMutations({
  businessId,
  createdBy: computed(() => authStore.profile?.id),
  modalRef: citaModalRef,
})

const shareLink = computed(() => {
  const origin = window.location.origin
  const slug = businessStore.business?.slug || 'salon'
  const empId = authStore.profile?.id
  return `${origin}/reservar/${slug}?empleado=${empId}`
})

function copyShareLink() {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    success('Link copiado al portapapeles')
  }).catch(() => {
    prompt('Copia este link:', shareLink.value)
  })
}

function openInvitations() {
  invitationsModalRef.value?.open()
}
</script>
