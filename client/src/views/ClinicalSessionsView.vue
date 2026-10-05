<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div v-if="!showForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Notas de sesión <span class="font-normal text-text-muted">({{ notes.length }})</span></p>
        <button @click="openNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
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
    </div>

    <SessionNoteForm
      v-else
      :key="editing?.id ?? 'new'"
      :initial="initialForm"
      :appointments="appointments"
      :saving="isSaving"
      :is-editing="!!editing"
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
import { useAuthStore } from '../store/auth'
import { isAdminPanelRole } from '../constants/roles'
import SessionNoteCard from '../components/clinical/SessionNoteCard.vue'
import SessionNoteForm from '../components/clinical/SessionNoteForm.vue'
import { emptySessionNoteForm, formFromNote, type SessionNoteForm as SessionNoteFormState } from '../components/clinical/sessionNotes'
import type { SessionNotePayload } from '../services/clinical/sessionNoteService'
import type { SessionNote } from '../types/database'

const route = useRoute()
const authStore = useAuthStore()
const clienteId = computed(() => route.params.id as string)

const showForm = ref(false)
const editing = ref<SessionNote | null>(null)
const initialForm = ref<SessionNoteFormState>(emptySessionNoteForm())

// Las citas recientes solo se piden mientras el formulario está abierto.
const { notes, appointments, isLoading, createMutation, updateMutation } = useSessionNotes(() => clienteId.value, () => showForm.value)

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

// Mismo criterio que el servidor: la nota la corrige su autor o un administrador.
const currentUserId = computed(() => authStore.user?.id ?? authStore.profile?.id ?? null)
const canEditNote = (note: SessionNote) =>
  isAdminPanelRole(authStore.role ?? undefined) || (!!note.created_by && note.created_by === currentUserId.value)

function openNew() {
  editing.value = null
  initialForm.value = emptySessionNoteForm()
  showForm.value = true
}

function openEdit(note: SessionNote) {
  editing.value = note
  initialForm.value = formFromNote(note)
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

async function handleSave(payload: SessionNotePayload) {
  try {
    if (editing.value) {
      await updateMutation.mutateAsync({ id: editing.value.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    closeForm()
  } catch {
    // El toast de error ya lo muestra onError; el formulario queda abierto para no perder lo escrito.
  }
}
</script>
