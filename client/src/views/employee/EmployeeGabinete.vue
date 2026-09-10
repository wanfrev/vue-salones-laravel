<template>
  <AppLayout>
    <div class="space-y-4">
      <header>
        <h2 class="text-base font-bold text-text sm:text-lg">Tablero de Gabinete</h2>
        <p class="text-xs text-text-muted sm:text-sm">Pacientes en sala de espera hoy</p>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>

      <div v-else-if="waitingCitas.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No hay pacientes en sala de espera en este momento.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="cita in waitingCitas"
          :key="cita.id"
          @click="openRecord(cita)"
          class="group rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/10">
              {{ getInitials(cita.clientName) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-text">{{ cita.clientName }}</p>
              <p class="truncate text-xs text-text-muted">{{ cita.service }}</p>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-text-muted">
            <span>Hora de la cita: {{ cita.time }}</span>
            <span v-if="cita.checkedInAt" class="font-medium text-warning">En espera desde {{ formatTime(cita.checkedInAt) }}</span>
          </div>
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { listCitas, agendaKeys } from '../../services/agendaService'
import { getInitials, toISODate } from '../../lib/formatters'
import AppLayout from '../../components/layout/AppLayout.vue'
import type { Cita } from '../../types/cita'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const router = useRouter()

const businessId = computed(() => authStore.businessId)
const currentBranchId = computed(() => businessStore.currentBranchId)

const dateRange = computed(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
})

const { data: citasData, isLoading } = useQuery({
  queryKey: computed(() => [...agendaKeys.appointments(businessId.value, currentBranchId.value), 'employee', authStore.profile?.id, 'gabinete', toISODate(new Date())]),
  queryFn: () => listCitas(businessId.value!, dateRange.value, authStore.profile?.id, currentBranchId.value),
  enabled: computed(() => !!businessId.value && !!authStore.profile?.id),
  staleTime: 15000,
  refetchInterval: 30000,
})

const waitingCitas = computed<Cita[]>(() => {
  const seenGroups = new Set<string>()
  return (citasData.value ?? [])
    .filter(c => !!c.checkedInAt)
    .filter(c => {
      // A visit with several services shares one group_id and gets checked in together
      // (see setAppointmentCheckedIn) — show it once, not once per service.
      if (!c.groupId) return true
      if (seenGroups.has(c.groupId)) return false
      seenGroups.add(c.groupId)
      return true
    })
    .sort((a, b) => new Date(a.checkedInAt!).getTime() - new Date(b.checkedInAt!).getTime())
})

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function openRecord(cita: Cita) {
  if (!cita.clientId) return
  router.push(`/dashboard/clientes/${cita.clientId}/expediente/historia-clinica`)
}
</script>
