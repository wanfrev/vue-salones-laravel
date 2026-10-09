<template>
  <div v-if="program" class="mb-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs">
    <p class="truncate font-semibold text-primary">
      Programa: {{ program.program_name }}<span v-if="program.position"> · sesión {{ program.position }} de {{ program.sessions_total }}</span>
    </p>
    <p class="mt-0.5 text-text-muted">
      {{ program.used }} de {{ program.sessions_total }} realizadas · {{ program.is_paid ? 'pagado' : 'por cobrar en el POS' }}
      <span v-if="program.status === 'expired'" class="font-semibold text-warning"> · vencido</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAppointmentProgram } from '../../composables/clinical/usePrograms'

/**
 * Si la cita abierta en el calendario es una sesión de un programa, dice cuál y cuántas lleva.
 * Solo informa: la cita sigue siendo una cita normal (se mueve, se marca y se edita igual).
 */
const props = defineProps<{ appointmentId: string }>()
const { program } = useAppointmentProgram(() => props.appointmentId, () => true)
</script>
