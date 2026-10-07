<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="space-y-4">
    <p v-if="!intake" class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-text-secondary">
      Este paciente todavía no tiene historia clínica. Completa lo que tengas de la primera entrevista y guarda.
    </p>

    <div v-for="section in INTAKE_TEXT_SECTIONS" :key="section.key" class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ section.title }}</p>
      <p class="mb-4 mt-1 text-xs text-text-muted">{{ section.description }}</p>
      <div class="space-y-4">
        <FormTextarea
          v-for="field in section.fields"
          :key="field.key"
          :model-value="getIntakeText(form, section.key, field.key)"
          @update:model-value="setIntakeText(form, section.key, field.key, $event)"
          :label="field.label"
          :rows="field.rows"
          :placeholder="field.placeholder"
          :show-char-count="false"
        />
      </div>
    </div>

    <div class="rounded-xl border border-danger/30 bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-danger">Evaluación de riesgo</p>
      <p class="mb-4 mt-1 text-xs text-text-muted">Lo que se marque aquí aparece como alerta en el encabezado del expediente.</p>
      <div class="space-y-4">
        <FormSelect v-model="form.riesgo.ideacion_suicida" label="Ideación suicida" :options="IDEATION_OPTIONS" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormToggle v-model="form.riesgo.intentos_previos" label="Intentos suicidas previos" />
          <FormToggle v-model="form.riesgo.autolesiones" label="Autolesiones" />
          <FormToggle v-model="form.riesgo.riesgo_hacia_otros" label="Riesgo hacia otros" />
        </div>
        <FormTextarea v-model="form.riesgo.factores_proteccion" label="Factores de protección" :rows="2" :show-char-count="false" />
        <FormTextarea v-model="form.riesgo.observaciones" label="Observaciones de riesgo" :rows="2" :show-char-count="false" />
      </div>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Impresión diagnóstica</p>
      <div class="mt-4 space-y-4">
        <FormTextarea v-model="form.impresion.hipotesis" label="Hipótesis clínica / formulación inicial" :rows="3" :show-char-count="false" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <FormInput v-model="form.impresion.diagnostico" label="Diagnóstico presuntivo" placeholder="Ej: Trastorno de ansiedad generalizada" />
          <FormInput v-model="form.impresion.codigo_cie10" label="Código CIE-10 / CIE-11" placeholder="Ej: F41.1" />
        </div>
      </div>
    </div>

    <div class="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
      <span v-if="dirty" class="mr-auto text-xs font-medium text-warning">Cambios sin guardar</span>
      <button
        @click="handleSave"
        :disabled="!dirty || isSaving"
        class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        {{ isSaving ? 'Guardando...' : 'Guardar historia clínica' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useClinicalIntake } from '../composables/clinical/useClinicalIntake'
import { FormInput, FormTextarea, FormSelect, FormToggle } from '../components/forms'
import { emptyIntakeData, intakeFromRecord, IDEATION_OPTIONS } from '../components/clinical/intakeDefaults'
import { INTAKE_TEXT_SECTIONS, getIntakeText, setIntakeText } from '../components/clinical/intakeSections'
import type { ClinicalIntakeData } from '../types/database'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)

const { intake, intakeQuery, isLoading, saveMutation } = useClinicalIntake(() => clienteId.value)

const form = ref<ClinicalIntakeData>(emptyIntakeData())
const savedSnapshot = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== savedSnapshot.value)
const isSaving = computed(() => saveMutation.isPending.value)

function hydrate(data: ClinicalIntakeData) {
  form.value = data
  savedSnapshot.value = JSON.stringify(data)
}

// Un refetch en segundo plano (foco de ventana, staleTime 0) nunca pisa lo que la persona está escribiendo.
watch(() => intakeQuery.data.value, record => {
  if (!dirty.value) hydrate(intakeFromRecord(record))
}, { immediate: true })

// Al cambiar de paciente el formulario siempre se reinicia con sus datos, aunque hubiera cambios sin guardar.
watch(clienteId, () => hydrate(intakeFromRecord(intake.value)))

async function handleSave() {
  if (!dirty.value || isSaving.value) return
  try {
    const saved = await saveMutation.mutateAsync(form.value)
    hydrate(intakeFromRecord(saved))
  } catch {
    // El toast de error ya lo muestra onError; el formulario conserva lo escrito.
  }
}
</script>
