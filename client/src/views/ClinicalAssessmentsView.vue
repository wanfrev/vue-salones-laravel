<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <AssessmentForm
      v-if="applying"
      :key="applying"
      :instrument="applying"
      :saving="createMutation.isPending.value"
      @save="handleSave"
      @cancel="applying = null"
    />

    <div v-else class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-semibold text-text">Cuestionarios aplicados <span class="font-normal text-text-muted">({{ assessments.length }})</span></p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="id in ASSESSMENT_IDS"
            :key="id"
            @click="applying = id"
            class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
          >
            <AddCircleIcon class="h-4 w-4" />
            Aplicar {{ ASSESSMENTS[id].label }}
          </button>
        </div>
      </div>

      <div v-if="assessments.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este paciente todavía no tiene cuestionarios aplicados. El PHQ-9 mide síntomas depresivos y el GAD-7 ansiedad; repetirlos permite ver la evolución.
      </div>

      <section v-for="group in groups" :key="group.id" class="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-text">{{ ASSESSMENTS[group.id].title }}</p>
            <p class="text-xs text-text-muted">{{ group.items.length }} aplicación{{ group.items.length === 1 ? '' : 'es' }}</p>
          </div>
          <AssessmentTrend :scores="group.trend" :max="ASSESSMENTS[group.id].maxScore" />
        </div>
        <ul class="divide-y divide-border-subtle">
          <li v-for="a in group.items" :key="a.id" class="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span class="text-text-secondary">{{ formatDateTime(a.assessed_at) }}</span>
            <span class="flex flex-wrap items-center gap-2">
              <span v-if="a.risk_flag" class="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">Ideación +</span>
              <span class="font-bold text-text">{{ a.total_score }}<span class="font-normal text-text-muted"> / {{ ASSESSMENTS[group.id].maxScore }}</span></span>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="SEVERITY_TONE[a.severity]">{{ SEVERITY_LABELS[a.severity] }}</span>
            </span>
            <p v-if="a.notes" class="w-full whitespace-pre-line text-xs text-text-muted">{{ a.notes }}</p>
          </li>
        </ul>
      </section>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useAssessments } from '../composables/clinical/useAssessments'
import { formatDateTime } from '../lib/formatters'
import AssessmentForm from '../components/clinical/AssessmentForm.vue'
import AssessmentTrend from '../components/clinical/AssessmentTrend.vue'
import { ASSESSMENTS, ASSESSMENT_IDS, SEVERITY_LABELS, SEVERITY_TONE } from '../components/clinical/assessments'
import type { AssessmentPayload } from '../services/clinical/assessmentService'
import type { AssessmentInstrumentId } from '../types/database'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)

const { assessments, isLoading, createMutation } = useAssessments(() => clienteId.value)

const applying = ref<AssessmentInstrumentId | null>(null)

// Una sola pasada O(N) por instrumento — el backend ya devuelve más reciente primero.
const groups = computed(() => {
  const byInstrument = new Map<AssessmentInstrumentId, typeof assessments.value>()
  for (const a of assessments.value) {
    const list = byInstrument.get(a.instrument)
    if (list) list.push(a)
    else byInstrument.set(a.instrument, [a])
  }
  return ASSESSMENT_IDS
    .filter(id => byInstrument.has(id))
    .map(id => {
      const items = byInstrument.get(id)!
      return { id, items, trend: items.map(a => a.total_score).reverse() }
    })
})

async function handleSave(payload: AssessmentPayload) {
  try {
    await createMutation.mutateAsync(payload)
    applying.value = null
  } catch {
    // El toast de error ya lo muestra onError; el cuestionario queda abierto para no perder las respuestas.
  }
}
</script>
