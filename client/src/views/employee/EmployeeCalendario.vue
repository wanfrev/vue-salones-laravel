<template>
  <AppLayout>
    <template #header-actions>
      <div class="flex items-center gap-2">
        <button
          v-if="businessStore.hasFeature('enable_public_booking')"
          @click="copyShareLink"
          class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 sm:px-3"
          title="Compartir link de reserva"
        >
          <LinkIcon class="h-3.5 w-3.5" />
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
import { LinkIcon } from '@solar-icons/vue/linear'
import { CitaFormModal } from '../../components/modals'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const router = useRouter()
const { success } = useNotification()
const businessStore = useBusinessStore()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)

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

</script>
