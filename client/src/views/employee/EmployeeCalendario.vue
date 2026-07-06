<template>
  <AppLayout>
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
import { useNotification } from '../../composables/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useAppointmentMutations } from '../../composables/useAppointmentMutations'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import AppLayout from '../../components/layout/AppLayout.vue'
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue'
import { toISODate, dateToHHmm } from '../../lib/formatters'
import { CitaFormModal } from '../../components/modals'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const router = useRouter()
useNotification()
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
  id: s.id, name: s.name, price: s.price, duration: s.duration,
})))

const empleadosList = computed(() => (empleadosData.value ?? []).map(e => ({
  id: e.id, name: e.name, payType: e.payType, payPercentage: e.payPercentage,
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
</script>
