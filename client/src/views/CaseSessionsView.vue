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

      <div v-if="notes.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este caso todavía no tiene sesiones conjuntas registradas.
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

const route = useRoute()
const caseId = computed(() => route.params.caseId as string)

// Las citas del caso solo se piden mientras el formulario está abierto.
const showForm = ref(false)
const sessions = useCaseSessions(() => caseId.value, () => showForm.value)
const { notes, appointments, isLoading } = sessions

const { editing, initialForm, isSaving, canEditNote, openNew, openEdit, closeForm, handleSave } = useSessionsScreen({
  notes: sessions.notes,
  isLoading: sessions.isLoading,
  createMutation: sessions.createMutation,
  updateMutation: sessions.updateMutation,
}, showForm)
</script>
