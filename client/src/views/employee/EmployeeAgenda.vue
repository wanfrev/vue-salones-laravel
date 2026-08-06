<template>
  <AppLayout>
    <template #header-actions>
      <div class="flex items-center gap-2">
        <button
          @click="handleNewCita"
          :aria-label="`Nueva ${t.appointment?.toLowerCase() || 'cita'}`"
          class="flex items-center gap-1 rounded-lg bg-primary px-2 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover sm:gap-2 sm:px-4"
        >
          <AddCircleIcon class="h-4 w-4" />
          <span class="hidden sm:inline">Nueva {{ t.appointment?.toLowerCase() || 'cita' }}</span>
        </button>
        <button
          v-if="canManageInvitations"
          @click="openInvitations"
          class="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/40"
        >
          <BellIcon class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Invitaciones</span>
        </button>
        <button
          v-if="businessStore.hasFeature('enable_public_booking')"
          @click="copyShareLink"
          class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          title="Compartir link de reserva"
        >
          <LinkIcon class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Link de reserva</span>
        </button>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h2 class="text-base font-bold text-text sm:text-lg">Mis {{ t.appointment || 'cita' }}s</h2>
          <p v-if="citas.length > 0" class="text-xs text-text-muted sm:text-sm">{{ citas.length }} {{ t.appointment?.toLowerCase() || 'cita' }}{{ citas.length !== 1 ? 's' : '' }}</p>
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
  <PendingInvitationsModal ref="invitationsModalRef" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AddCircleIcon, BellIcon, LinkIcon } from '@solar-icons/vue/linear'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useAppointmentMutations } from '../../composables/agenda/useAppointmentMutations'
import { useNotification } from '../../composables/common/useNotification'
import { listServicios, serviciosKeys } from '../../services/serviciosService'
import { listEquipo, equipoKeys } from '../../services/equipoService'
import { listCitas, agendaKeys } from '../../services/agendaService'
import { toISODate } from '../../lib/formatters'
import AppLayout from '../../components/layout/AppLayout.vue'
import AgendaListView from '../../components/agenda/AgendaListView.vue'
import { CitaFormModal } from '../../components/modals'
import PendingInvitationsModal from '../../components/agenda/PendingInvitationsModal.vue'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const businessStore = useBusinessStore()

const t = computed(() => businessStore.terminology)
const businessId = computed(() => authStore.businessId)

const canManageInvitations = computed(() => (authStore.profile as any)?.can_create_appointments !== false && businessStore.hasFeature('enable_public_booking'))

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const invitationsModalRef = ref<InstanceType<typeof PendingInvitationsModal> | null>(null)
const editingCita = ref<Cita | null>(null)

const selectedDate = ref<Date>(new Date())

const dateRange = computed(() => {
  const start = new Date(selectedDate.value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
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

const citas = computed<Cita[]>(() => {
  const all = citasData.value ?? []
  const seen = new Set<string>()
  return all.filter(c => {
    if (c.groupId) {
      if (seen.has(c.groupId)) return false
      seen.add(c.groupId)
    }
    return true
  })
})

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
  id: s.id, name: s.name, price: s.price, duration: s.duration, is_fixed_commission: s.is_fixed_commission, fixed_commission_amount: s.fixed_commission_amount, fixed_commission_assistant_amount: s.fixed_commission_assistant_amount,
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

const { success } = useNotification()

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

const handleNewCita = () => {
  editingCita.value = null
  citaModalRef.value?.open()
}

function openInvitations() {
  invitationsModalRef.value?.open()
}

const handleEditCita = (cita: Cita) => {
  editingCita.value = cita
  citaModalRef.value?.open(cita)
}
</script>
