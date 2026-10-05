<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ definition.title }}</p>
      <p class="mb-4 mt-1 text-xs text-text-muted">{{ definition.description }}</p>

      <ol class="space-y-4">
        <li v-for="(item, index) in definition.items" :key="index" class="border-b border-border-subtle pb-4 last:border-b-0 last:pb-0">
          <p class="mb-2 text-sm font-medium text-text">{{ index + 1 }}. {{ item }}</p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" :aria-label="`Pregunta ${index + 1}`">
            <button
              v-for="option in RESPONSE_OPTIONS"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="answers[index] === option.value"
              @click="answers[index] = option.value"
              class="rounded-lg border px-2 py-2 text-xs font-medium transition-theme"
              :class="answers[index] === option.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-secondary hover:border-primary/30 hover:bg-primary/5'"
            >
              {{ option.label }}
            </button>
          </div>
        </li>
      </ol>

      <FormTextarea v-model="notes" label="Observaciones (opcional)" :rows="2" class="mt-4" :show-char-count="false" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm text-text-muted">Puntaje <span class="text-lg font-bold text-text">{{ score.total }}</span> / {{ definition.maxScore }}</span>
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="SEVERITY_TONE[score.severity]">{{ SEVERITY_LABELS[score.severity] }}</span>
        <span v-if="score.riskFlag" class="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">Ítem de ideación positivo</span>
      </div>
      <div class="flex gap-3">
        <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
          Cancelar
        </button>
        <button
          @click="handleSave"
          :disabled="!score.complete || saving"
          class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
        >
          {{ saving ? 'Guardando...' : score.complete ? 'Guardar resultado' : `Faltan ${pending} respuestas` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FormTextarea } from '../forms'
import { ASSESSMENTS, RESPONSE_OPTIONS, SEVERITY_LABELS, SEVERITY_TONE, scoreAssessment } from './assessments'
import type { AssessmentPayload } from '../../services/clinical/assessmentService'
import type { AssessmentInstrumentId } from '../../types/database'

const props = defineProps<{
  instrument: AssessmentInstrumentId
  saving: boolean
}>()

const emit = defineEmits<{ save: [payload: AssessmentPayload]; cancel: [] }>()

const definition = computed(() => ASSESSMENTS[props.instrument])
// El padre monta este componente con :key=instrument, así que cada instrumento arranca en blanco.
const answers = ref<Array<number | null>>(Array<number | null>(ASSESSMENTS[props.instrument].items.length).fill(null))
const notes = ref('')

// Vista previa: el backend recalcula y es la fuente de verdad de lo que se guarda.
const score = computed(() => scoreAssessment(props.instrument, answers.value))
const pending = computed(() => answers.value.filter(a => a === null).length)

function handleSave() {
  if (!score.value.complete || props.saving) return
  emit('save', {
    instrument: props.instrument,
    answers: answers.value as number[],
    notes: notes.value.trim() || null,
  })
}
</script>
