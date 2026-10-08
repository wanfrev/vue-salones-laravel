<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div v-if="!showForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Sesiones conjuntas <span class="font-normal text-text-muted">({{ notes.length }})</span></p>
        <button @click="openNew()" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nueva sesión conjunta
        </button>
      </div>

      <p class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-text-secondary">
        Estas notas pertenecen al caso: las ven todos los integrantes en su ficha (solo lectura). Lo que se hable en sesiones individuales debe ir en el expediente de cada uno.
      </p>

      <section v-if="pendingAppointments.length > 0" class="rounded-xl border border-warning/30 bg-warning/5 p-3 sm:p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-warning">Citas vinculadas sin nota ({{ pendingAppointments.length }})</p>
        <ul class="mt-2 divide-y divide-border-subtle">
          <li v-for="a in pendingAppointments" :key="a.id" class="flex flex-wrap items-center justify-between gap-2 py-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">{{ a.start_time ? formatDateTime(a.start_time) : 'Sin fecha' }}<span v-if="a.service_name" class="font-normal text-text-muted"> — {{ a.service_name }}</span></p>
              <p class="text-xs text-text-muted">{{ APPOINTMENT_STATUS_LABELS[a.status] ?? a.status }}</p>
            </div>
            <button @click="openNew(a.id)" class="rounded-lg border border-primary/30 bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/5">Escribir nota</button>
          </li>
        </ul>
      </section>

      <div v-if="notes.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        <template v-if="pendingAppointments.length > 0">Aún no hay notas escritas. Las citas vinculadas aparecen arriba para documentarlas.</template>
        <template v-else>
          Este caso todavía no tiene sesiones conjuntas registradas. Para que una cita cuente como sesión del caso, ábrela en el calendario y usa «Vincular a un caso».
        </template>
      </div>

      <SessionNoteCard v-for="note in notes" :key="note.id" :note="note" :can-edit="canEditNote(note)" @edit="openEdit(note)" />
    </div>

    <SessionNoteForm
      v-else
      :key="editing?.id ?? 'new'"
      :initial="initialForm"
      :appointments="appointments"
      :saving="isSaving"
      :is-editing="!!editing"
      :sync-date="!editing && !!initialForm.appointment_id"
      @save="handleSave"
      @cancel="closeForm"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useCaseSessions } from '../composables/clinical/useCaseRecords'
import { useSessionsScreen } from '../composables/clinical/useSessionsScreen'
import SessionNoteCard from '../components/clinical/SessionNoteCard.vue'
import SessionNoteForm from '../components/clinical/SessionNoteForm.vue'
import { APPOINTMENT_STATUS_LABELS, appointmentsWithoutNote } from '../components/clinical/cases'
import { formatDateTime } from '../lib/formatters'

const route = useRoute()
const caseId = computed(() => route.params.caseId as string)

// Las citas del caso se piden siempre: la lista muestra las que aún no tienen nota.
const showForm = ref(false)
const sessions = useCaseSessions(() => caseId.value, () => true)
const { notes, appointments, isLoading } = sessions
const pendingAppointments = computed(() => appointmentsWithoutNote(appointments.value, notes.value))

const { editing, initialForm, isSaving, canEditNote, openNew, openEdit, closeForm, handleSave } = useSessionsScreen({
  notes: sessions.notes,
  isLoading: sessions.isLoading,
  createMutation: sessions.createMutation,
  updateMutation: sessions.updateMutation,
}, showForm)
</script>
