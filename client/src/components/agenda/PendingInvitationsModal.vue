<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[200] flex items-start justify-center pt-4 px-4 sm:pt-16">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close"></div>
      <div class="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[80vh] rounded-2xl border border-border bg-surface shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
             <h2 class="text-base font-bold text-text">Invitaciones de {{ businessStore.terminology.appointmentPlural.toLowerCase() }}</h2>
            <p class="text-xs text-text-muted mt-0.5">{{ invitations.length }} solicitud{{ invitations.length !== 1 ? 'es' : '' }} pendiente{{ invitations.length !== 1 ? 's' : '' }}</p>
          </div>
          <button @click="close" class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary transition-colors">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- List -->
        <div v-if="invitations.length === 0" class="flex-1 flex items-center justify-center py-12 text-text-muted text-sm">
          No hay invitaciones pendientes.
        </div>
        <div v-else class="flex-1 overflow-y-auto divide-y divide-border-subtle">
          <div v-for="inv in invitations" :key="inv.id" class="px-5 py-3.5 hover:bg-bg-secondary/50 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/30 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                    <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    Pendiente de registro
                  </span>
                  <span v-if="inv.employeeName" class="text-[11px] text-text-muted">{{ inv.employeeName }}</span>
                </div>
                <p class="text-sm font-semibold text-text">{{ inv.service }}</p>
                 <p v-if="inv.clientName" class="text-xs text-text-secondary mt-0.5">{{ businessStore.terminology.client }}: {{ inv.clientName }}</p>
                <div class="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                  <span>{{ inv.date }}</span>
                  <span>·</span>
                  <span>{{ inv.time }}</span>
                  <span>·</span>
                  <span>{{ inv.duration }} min</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  @click="openAssign(inv)"
                  class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse hover:bg-primary-hover transition-colors"
                >
                  {{ assignedMap[inv.id] ? 'Asignado ✓' : 'Registrar' }}
                </button>
                <button
                  @click="rejectInvitation(inv)"
                  class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
                  title="Rechazar solicitud"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Assign client sub-modal -->
      <AssignClientModal
        ref="assignModalRef"
        :appointment-id="assigningId"
        :appointment="assigningAppointment"
        @close="onAssignClose"
        @assigned="onAssigned"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { db } from '../../lib/api'
import { useNotification } from '../../composables/common/useNotification'
import { usePendingInvitations } from '../../composables/agenda/usePendingInvitations'
import { useBusinessStore } from '../../store/business'
import AssignClientModal from '../agenda/AssignClientModal.vue'

const queryClient = useQueryClient()
const { success } = useNotification()
const businessStore = useBusinessStore()
const visible = ref(false)

const { invitations: rawInvitations, refetch } = usePendingInvitations()

const invitations = computed(() => {
  return (rawInvitations.value ?? []).map((inv: any) => {
    const startTime = new Date(inv.start_time)
    const endTime = new Date(inv.end_time)
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    return {
      id: inv.id,
      employeeId: inv.employee_id,
      employeeName: inv.profiles?.full_name || inv.employee_profile?.full_name || '',
       service: inv.services?.name || inv.service?.name || businessStore.terminology.service,
      clientName: inv.internal_notes || '',
      date: startTime.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: startTime.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }),
      duration,
      status: inv.status,
      raw: inv,
    }
  })
})

const assignedMap = ref<Record<string, boolean>>({})

const assignModalRef = ref<InstanceType<typeof AssignClientModal> | null>(null)
const assigningId = ref<string | null>(null)
const assigningAppointment = ref<any>(null)

function open() {
  refetch()
  visible.value = true
}

function close() {
  visible.value = false
}

function openAssign(inv: any) {
  assigningId.value = inv.id
  assigningAppointment.value = inv.raw
  assignModalRef.value?.open(inv.raw)
}

function onAssignClose() {
  assigningId.value = null
  assigningAppointment.value = null
}

function onAssigned() {
  if (assigningId.value) {
    assignedMap.value[assigningId.value] = true
  }
  assigningId.value = null
  assigningAppointment.value = null
  success(`${businessStore.terminology.client} asignado correctamente`)
  refetch()
  queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
}

async function rejectInvitation(inv: any) {
  if (!confirm('¿Rechazar esta solicitud de reserva? Se cancelará la cita.')) return
  const { error } = await db.from('appointments').update({ status: 'cancelled' }).eq('id', inv.id)
  if (error) return
  success('Solicitud rechazada')
  refetch()
  queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
}

defineExpose({ open, close })
</script>
