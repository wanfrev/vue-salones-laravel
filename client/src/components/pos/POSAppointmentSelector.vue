<template>
  <div class="rounded-xl border border-border bg-surface p-4">
    <h3 class="text-base font-semibold text-text mb-3">1. Seleccionar cita</h3>
    <div class="relative">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar cliente..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
    <div class="mt-3 space-y-2 max-h-60 overflow-y-auto">
      <button
        v-for="appt in filteredAppointments"
        :key="appt.id"
        @click="$emit('select', appt)"
        :class="[
          'w-full text-left rounded-lg border p-3 transition-theme',
          selectedId === appt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong hover:bg-bg-secondary'
        ]"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-text">{{ appt.clients?.full_name || 'Cliente' }}</p>
            <p class="text-xs text-text-muted">{{ appt.services?.name || 'Servicio' }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-text">${{ appt.groupPrice ?? appt.price_override ?? appt.services?.price ?? 0 }}</p>
            <p class="text-xs text-text-muted">{{ formatTime(appt.start_time) }}</p>
          </div>
        </div>
      </button>
      <div v-if="filteredAppointments.length === 0" class="py-6 text-center text-sm text-text-muted">
        No hay citas pendientes de pago.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '../../lib/formatters'
import { ref, computed } from 'vue'

const props = defineProps<{
  appointments: any[]
  selectedId: string | null
}>()

defineEmits<{
  select: [appt: any]
}>()

const search = ref('')

const filteredAppointments = computed(() => {
  if (!search.value) return props.appointments
  const q = search.value.toLowerCase()
  return props.appointments.filter((a: any) =>
    a.clients?.full_name?.toLowerCase().includes(q) ||
    a.clients?.phone?.includes(q)
  )
})


</script>
