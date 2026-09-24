<template>
  <div v-if="isDentalNiche" class="mb-3 flex justify-end">
    <button
      @click="quickCitaModalRef?.open()"
      class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition-theme hover:bg-primary/10"
      title="Buscar por nombre, teléfono o cédula y agendar en segundos"
    >
      <BoltIcon class="h-4 w-4" />
      Cita rápida
    </button>
  </div>

  <section class="h-[calc(100dvh-120px)] max-md:h-[calc(100dvh-160px)] min-h-[500px]">
    <AgendaCalendar
      :initial-date="initialDate"
      @event-click="handleEventClick"
      @status-change="handleStatusChange"
      @event-change="handleEventChange"
      @slot-select="handleSlotSelect"
      @checkout="handleCheckout"
      @delete="handleDeleteCita"
      @check-in-toggle="handleCheckInToggle"
    />
  </section>

  <CitaFormModal
    ref="citaModalRef"
    :servicios="serviciosList"
    :empleados="empleadosList"
    @save="handleSaveCita"
    @delete="handleDeleteCita"
  />
  <QuickCitaModal
    v-if="isDentalNiche"
    ref="quickCitaModalRef"
    :servicios="serviciosList"
    :empleados="empleadosList"
    @save="handleSaveQuickCita"
  />
  <PendingInvitationsModal ref="invitationsModalRef" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { BoltIcon } from '@solar-icons/vue/linear'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { isDentalNiche as checkDentalNiche } from '../config/niches'
import { db } from '../lib/api'
import { equipoKeys, listEquipo } from '../services/equipoService'
import { listServicios, serviciosKeys } from '../services/serviciosService'
import { useAppointmentMutations } from '../composables/agenda/useAppointmentMutations'
import AgendaCalendar from '../components/agenda/AgendaCalendar.vue'
import { toISODate, dateToHHmm } from '../lib/formatters'
import { CitaFormModal, QuickCitaModal } from '../components/modals'
import PendingInvitationsModal from '../components/agenda/PendingInvitationsModal.vue'
import type { Cita, PaymentEditContext } from '../types/cita'
import type { PaymentMethod } from '../types/database'

const { authStore } = useAuth()
const router = useRouter()
const route = useRoute()
useNotification()
const businessStore = useBusinessStore()
const isDentalNiche = computed(() => checkDentalNiche(businessStore.nicheType))

const citaModalRef = ref<InstanceType<typeof CitaFormModal> | null>(null)
const quickCitaModalRef = ref<InstanceType<typeof QuickCitaModal> | null>(null)
const invitationsModalRef = ref<InstanceType<typeof PendingInvitationsModal> | null>(null)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const initialDate = computed(() => (route.query.fecha as string) || undefined)

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

const {
  handleSaveCita,
  handleStatusChange,
  handleEventChange,
  handleCheckInToggle,
  handleDeleteCita,
} = useAppointmentMutations({
  businessId,
  createdBy: computed(() => authStore.profile?.id),
  modalRef: citaModalRef,
})

// Separate mutation instance so its onSuccess/onError close & reset the QUICK modal specifically
// — reusing handleSaveCita above would call citaModalRef's close()/onSaveComplete() instead.
const { handleSaveCita: handleSaveQuickCita } = useAppointmentMutations({
  businessId,
  createdBy: computed(() => authStore.profile?.id),
  modalRef: quickCitaModalRef,
})

const serviciosList = computed(() => (serviciosData.value ?? []).map(service => ({
  id: service.id,
  name: service.name,
  price: service.price,
  duration: service.duration,
  is_fixed_commission: service.is_fixed_commission,
  fixed_commission_amount: service.fixed_commission_amount,
  fixed_commission_assistant_amount: service.fixed_commission_assistant_amount,
})))

const empleadosList = computed(() => {
  const list = (empleadosData.value ?? []).map(employee => ({
    id: employee.id,
    name: employee.name,
    payType: employee.payType,
    payPercentage: employee.payPercentage,
    disableAgenda: employee.disableAgenda,
  }))
  // Solo-doctor setup (dental only): listEquipo excludes the admin role, so a doctor who is the
  // business admin with no staff would have nobody to assign the consulta to. Offer them themselves.
  const me = authStore.profile
  if (isDentalNiche.value && authStore.role === 'admin' && me?.id && !list.some(e => e.id === me.id)) {
    list.unshift({ id: me.id, name: me.full_name || 'Yo', payType: 'salary' as const, payPercentage: undefined, disableAgenda: false })
  }
  return list
})

const handleSlotSelect = ({ start, employeeId }: { start: Date; employeeId?: string }) => {
  const date = toISODate(start)
  const time = dateToHHmm(start)
  const empName = employeeId ? empleadosData.value?.find(e => e.id === employeeId)?.name ?? '' : ''
  citaModalRef.value?.open({ id: '', clientName: '', service: '', employee: empName, employeeId: employeeId || '', date, time, duration: 30, price: 0, status: 'pending' })
}

const handleEventClick = async (event: { id: string; title: string; start: Date; end: Date; citaData?: Cita }) => {
  if (event.citaData) {
    const cita = event.citaData
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
}

const handleCheckout = (appointmentId: string) => {
  router.push({ name: 'admin-pos', query: { appointmentId } })
}

function openInvitations() {
  invitationsModalRef.value?.open()
}
</script>
