<template>
  <div v-if="linkedCase || linkableCases.length > 0" class="mb-2">
    <div v-if="linkedCase" class="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs">
      <span class="min-w-0 truncate font-semibold text-primary">Sesión del caso: {{ linkedCase.name }}</span>
      <button type="button" @click="unlinkMutation.mutate(linkedCase.id)" :disabled="unlinkMutation.isPending.value"
        class="shrink-0 font-semibold text-text-muted transition-colors hover:text-danger disabled:opacity-50">Quitar</button>
    </div>

    <div v-else class="flex items-center gap-2">
      <select v-model="chosen" aria-label="Caso" class="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-primary">
        <option value="" disabled>Vincular a un caso...</option>
        <option v-for="c in linkableCases" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button type="button" @click="link" :disabled="!chosen || linkMutation.isPending.value"
        class="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50">Vincular</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppointmentCase } from '../../composables/clinical/useAppointmentCase'
import type { CaseOfAppointment } from '../../types/database'

/**
 * Vincula la cita abierta en el calendario a un caso (pareja/familia/grupo) del paciente de la cita.
 * La cita sigue siendo una cita normal para todo lo demás (agenda, cobro); el vínculo solo le dice al
 * módulo clínico que fue una sesión conjunta. Avisa al padre del caso vinculado para que el botón
 * «Nota de sesión» abra la nota del caso en vez de la individual.
 */
const props = defineProps<{ appointmentId: string; clientId: string | null }>()
const emit = defineEmits<{ linked: [value: CaseOfAppointment | null] }>()

const { linkedCase, linkableCases, linkMutation, unlinkMutation } = useAppointmentCase(
  () => props.appointmentId,
  () => props.clientId,
  () => true,
)

const chosen = ref('')

watch(linkedCase, v => emit('linked', v), { immediate: true })

function link() {
  if (!chosen.value) return
  linkMutation.mutate(chosen.value, { onSuccess: () => { chosen.value = '' } })
}
</script>
