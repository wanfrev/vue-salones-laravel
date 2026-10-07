<template>
  <article class="rounded-xl border border-border bg-surface p-4 shadow-sm" :class="note.risk_level === 'high' ? 'border-danger/40' : ''">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-bold text-text">Sesión {{ note.session_number }}</span>
          <span class="text-xs text-text-muted">{{ formatDateHuman(note.session_date) }}</span>
          <span v-if="note.duration_minutes" class="text-xs text-text-muted">· {{ note.duration_minutes }} min</span>
          <span v-if="note.appointment_id" class="rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Con cita</span>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="RISK_TONE[note.risk_level]">{{ RISK_LABELS[note.risk_level] }}</span>
          <span v-if="note.mood_rating" class="rounded-full bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">Ánimo {{ note.mood_rating }}/10</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="canEdit" @click="$emit('edit')" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:text-primary">
          Editar
        </button>
        <button @click="expanded = !expanded" class="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
          {{ expanded ? 'Ocultar nota' : 'Ver nota' }}
        </button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="expanded" class="mt-4 space-y-3 border-t border-border-subtle pt-4">
        <template v-for="field in SOAP_FIELDS" :key="field.key">
          <div v-if="note.content?.[field.key]">
            <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ field.label }}</p>
            <p class="mt-1 whitespace-pre-line text-sm text-text-secondary">{{ note.content[field.key] }}</p>
          </div>
        </template>
        <div v-if="note.tasks">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Tareas</p>
          <p class="mt-1 whitespace-pre-line text-sm text-text-secondary">{{ note.tasks }}</p>
        </div>
      </div>
    </Transition>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatDateHuman } from '../../lib/formatters'
import { RISK_LABELS, RISK_TONE, SOAP_FIELDS } from './sessionNotes'
import type { SessionNote } from '../../types/database'

defineProps<{ note: SessionNote; canEdit: boolean }>()
defineEmits<{ edit: [] }>()

const expanded = ref(false)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
