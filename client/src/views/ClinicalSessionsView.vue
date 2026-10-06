<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div v-if="!showForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Notas de sesión <span class="font-normal text-text-muted">({{ notes.length }})</span></p>
        <button @click="openNew()" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nueva sesión
        </button>
      </div>

      <div v-if="notes.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este paciente todavía no tiene notas de sesión.
      </div>

      <SessionNoteCard
        v-for="note in notes"
        :key="note.id"
        :note="note"
        :can-edit="canEditNote(note)"
        @edit="openEdit(note)"
      />

      <!-- Sesiones conjuntas (pareja / familia / grupo): solo lectura aquí; se escriben y editan en el caso. -->
      <JointRecords :notes="jointNotes" :base-path="basePath" />
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
import { useSessionNotes } from '../composables/clinical/useSessionNotes'
import { useSessionsScreen } from '../composables/clinical/useSessionsScreen'
import { useClientCases } from '../composables/clinical/useCaseRecords'
import { useBusinessStore } from '../store/business'
import SessionNoteCard from '../components/clinical/SessionNoteCard.vue'
import SessionNoteForm from '../components/clinical/SessionNoteForm.vue'
import JointRecords from '../components/clinical/JointRecords.vue'

const route = useRoute()
const businessStore = useBusinessStore()
const clienteId = computed(() => route.params.id as string)
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

// Las citas recientes solo se piden mientras el formulario está abierto.
const showForm = ref(false)
const sessions = useSessionNotes(() => clienteId.value, () => showForm.value)
const { notes, appointments, isLoading } = sessions

const { editing, initialForm, isSaving, canEditNote, openNew, openEdit, closeForm, handleSave } = useSessionsScreen({
  notes: sessions.notes,
  isLoading: sessions.isLoading,
  createMutation: sessions.createMutation,
  updateMutation: sessions.updateMutation,
}, showForm)

// Solo en negocios con casos (no consulta nada en otros nichos).
const { jointNotes } = useClientCases(() => clienteId.value, () => businessStore.hasCapability('clinical.cases'))
</script>
