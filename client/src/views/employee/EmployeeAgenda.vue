<template>
  <AppLayout>
    <template #header-actions>
      <button
        @click="handleNewCita"
        :aria-label="`Nueva ${t.appointment?.toLowerCase() || 'cita'}`"
        class="flex items-center gap-1 rounded-lg bg-primary px-2 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover sm:gap-2 sm:px-4"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="hidden sm:inline">Nueva {{ t.appointment?.toLowerCase() || 'cita' }}</span>
      </button>
    </template>

    <div class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <header>
          <h2 class="text-lg font-bold text-text">Mis {{ t.appointment || 'cita' }}s</h2>
          <p v-if="citas.length > 0" class="text-sm text-text-muted">{{ citas.length }} {{ t.appointment?.toLowerCase() || 'cita' }}{{ citas.length !== 1 ? 's' : '' }}</p>
        </header>
        <div class="flex items-center gap-2 shrink-0">
          <input
            type="date"
            :value="toISODate(selectedDate)"
            @change="selectedDate = new Date(($event.target as HTMLInputElement).value + 'T12:00:00')"
            class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            v-if="!isToday"
            @click="goToToday"
            class="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong"
          >
            Hoy
          </button>
        </div>
      </div>

      <AgendaListView
        :citas="citas"
        :loading="isLoading"
        :error="citasError"
        :t="(t.appointment || 'cita').toLowerCase()"
        @edit="handleEditCita"
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
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useAppointmentMutations } from '../../composables/agenda/useAppointmentMutations'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import { listCitas, agendaKeys } from '../../services/agendaService'
import { toISODate } from '../../lib/formatters'
import AppLayout from '../../components/layout/AppLayout.vue'
import AgendaListView from '../../components/agenda/AgendaListView.vue'
import { CitaFormModal } from '../../components/modals'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const businessStore = useBusinessStore()

const t = computed(() => businessStore.terminology)
const businessId = computed(() => authStore.businessId)

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const editingCita = ref<Cita | null>(null)

const selectedDate = ref<Date>(new Date())

const dateRange = computed(() => {
  const start = new Date(selectedDate.value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 1)
  return { start, end }
})

const isToday = computed(() => toISODate(selectedDate.value) === toISODate(new Date()))

const goToToday = () => {
  selectedDate.value = new Date()
}

const currentBranchId = computed(() => businessStore.currentBranchId)

const { data: citasData, isLoading, error: citasError } = useQuery({
  queryKey: computed(() => [...agendaKeys.appointments(businessId.value, currentBranchId.value), 'employee', authStore.profile?.id, toISODate(selectedDate.value)]),
  queryFn: () => listCitas(businessId.value!, dateRange.value, authStore.profile?.id, currentBranchId.value),
  enabled: computed(() => !!businessId.value && !!authStore.profile?.id),
  staleTime: 0,
})

const citas = computed<Cita[]>(() => citasData.value ?? [])

const { data: serviciosData } = useQuery({
  queryKey: computed(() => serviciosKeys.all(businessId.value, currentBranchId.value)),
  queryFn: () => listServicios(businessId.value!, currentBranchId.value),
  enabled: computed(() => !!businessId.value),
})

const { data: empleadosData } = useQuery({
  queryKey: computed(() => equipoKeys.all(businessId.value, currentBranchId.value)),
  queryFn: () => listEquipo(businessId.value!, currentBranchId.value),
  enabled: computed(() => !!businessId.value),
})

const serviciosList = computed(() => (serviciosData.value ?? []).map(s => ({
  id: s.id, name: s.name, price: s.price, duration: s.duration,
})))

const empleadosList = computed(() => (empleadosData.value ?? []).map(e => ({
  id: e.id, name: e.name, payType: e.payType, payPercentage: e.payPercentage, disableAgenda: e.disableAgenda,
})))

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

const handleEditCita = (cita: Cita) => {
  editingCita.value = cita
  citaModalRef.value?.open(cita)
}
</script>
