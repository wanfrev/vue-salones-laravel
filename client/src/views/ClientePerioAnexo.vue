<template>
  <header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
    <div>
      <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
        <ClipboardIcon class="h-4 w-4" />
        <span class="font-medium uppercase tracking-wider">Anexo de periodoncia</span>
      </div>
      <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || terminology.client || 'Paciente' }}</p>
    </div>
    <button @click="goBack" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
      <ArrowLeftIcon class="h-4 w-4" />
      Volver
    </button>
  </header>

  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Anexo</label>
      <select :value="selectedId ?? '__new__'" @change="onSelect(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary">
        <option v-if="isCreatingNew" value="__new__">Anexo nuevo (sin guardar)</option>
        <option v-for="a in annexes" :key="a.id" :value="a.id">
          {{ formatDate(a.created_at) }}
        </option>
      </select>
    </div>
    <button @click="startNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
      <AddCircleIcon class="h-4 w-4" />
      Nuevo anexo
    </button>
  </div>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6 space-y-6">
    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">A. Condiciones clínicas periodontales</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormToggle v-model="form.condiciones_clinicas.aspecto_liso_brillante" label="Liso y brillante" />
        <FormToggle v-model="form.condiciones_clinicas.color_rojo" label="Color rojo" />
        <FormToggle v-model="form.condiciones_clinicas.consistencia_blanda" label="Consistencia blanda" />
        <FormToggle v-model="form.condiciones_clinicas.frenillos_sobreinsertados" label="Frenillos / inserciones sobreinsertados" />
        <FormToggle v-model="form.condiciones_clinicas.fremitus" label="Fremitus" />
        <FormToggle v-model="form.condiciones_clinicas.condiciones_mucogingivales" label="Condiciones mucogingivales" />
      </div>
      <FormInput v-model="form.condiciones_clinicas.fenotipo_gingival" label="Fenotipo gingival" placeholder="Ej: Grueso plano" class="max-w-xs" />
    </section>

    <section>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">B. Factores de riesgo</p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SystemReviewField
          v-for="key in PERIO_RISK_FACTORS"
          :key="key"
          :label="PERIO_RISK_LABELS[key]"
          v-model="form.factores_riesgo[key]!"
        />
      </div>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">D. Diagnóstico, pronóstico y plan de tratamiento</p>
      <FormInput v-model="form.diagnostico.codigo_cie10" label="Código CIE-10" class="max-w-xs" />
      <FormTextarea v-model="form.diagnostico.impresion_diagnostica_individual" label="Impresión diagnóstica individual (por diente/grupo)" :rows="3" />
      <FormTextarea v-model="form.diagnostico.diagnostico_caso" label="Diagnóstico del caso" :rows="2" />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormTextarea v-model="form.diagnostico.pronostico_general" label="Pronóstico general" :rows="2" />
        <FormTextarea v-model="form.diagnostico.pronostico_individual" label="Pronóstico individual (por diente)" :rows="2" />
      </div>
      <div class="space-y-2">
        <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_urgencias" label="Fase de urgencias" :rows="2" />
        <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_sistemica" label="Fase sistémica" :rows="2" />
        <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_higienica" label="Fase higiénica / reevaluación" :rows="2" />
        <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_correctiva" label="Fase correctiva / reevaluación" :rows="2" />
        <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_mantenimiento" label="Fase de mantenimiento" :rows="2" />
      </div>
    </section>

    <section>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Observaciones generales</p>
      <FormTextarea v-model="observacionesGenerales" :rows="3" />
    </section>

    <div class="flex justify-end border-t border-border pt-4">
      <button @click="handleSave" :disabled="isSaving"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
        {{ isSaving ? 'Guardando...' : isCreatingNew ? 'Crear anexo' : 'Guardar anexo' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, ClipboardIcon, AddCircleIcon } from '@solar-icons/vue/linear'
import { useBusinessStore } from '../store/business'
import { getClienteById } from '../services/clientesService'
import { usePerioAnnexes } from '../composables/dental/usePerioAnnexes'
import SystemReviewField from '../components/dental/SystemReviewField.vue'
import { FormInput, FormTextarea, FormToggle } from '../components/forms'
import {
  PERIO_RISK_FACTORS, type PerioAnnex, type PerioAnnexCondicionesClinicas,
  type PerioAnnexDiagnostico, type SystemReview,
} from '../types/database'
import type { PerioAnnexSections } from '../services/dental/perioAnnexService'

const PERIO_RISK_LABELS: Record<string, string> = {
  factores_anatomicos: 'Factores anatómicos',
  restauraciones_subgingivales: 'Restauraciones subgingivales',
  restauraciones_sobrecontorneadas: 'Restauraciones sobrecontorneadas',
  aparatologia_ortodontica: 'Aparatología ortodóntica',
  provisionales_desadaptadas: 'Provisionales desadaptadas',
  calculos_dentales: 'Cálculos dentales',
  malposiciones_dentales: 'Malposiciones dentales',
  fuerzas_oclusales_excesivas: 'Fuerzas oclusales excesivas',
  factores_sistemicos: 'Posibles factores sistémicos',
  medicamentos: 'Medicamentos',
}

const route = useRoute()
const router = useRouter()
const businessStore = useBusinessStore()

const clienteId = computed(() => route.params.id as string)
const terminology = computed(() => businessStore.terminology)

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})
const cliente = computed(() => clienteData.value ?? null)

const { annexes, isLoading, createMutation, updateMutation } = usePerioAnnexes(() => clienteId.value)

function emptySystemReview(): SystemReview {
  return { refiere: false, observaciones: '' }
}

function emptyCondicionesClinicas(): PerioAnnexCondicionesClinicas {
  return {
    aspecto_liso_brillante: false, color_rojo: false, consistencia_blanda: false,
    fenotipo_gingival: '', frenillos_sobreinsertados: false, fremitus: false, condiciones_mucogingivales: false,
  }
}

function emptyDiagnostico(): PerioAnnexDiagnostico {
  return {
    codigo_cie10: '', impresion_diagnostica_individual: '', diagnostico_caso: '',
    pronostico_general: '', pronostico_individual: '',
    plan_tratamiento: { fase_urgencias: '', fase_sistemica: '', fase_higienica: '', fase_correctiva: '', fase_mantenimiento: '' },
  }
}

const form = reactive({
  condiciones_clinicas: emptyCondicionesClinicas(),
  factores_riesgo: Object.fromEntries(PERIO_RISK_FACTORS.map(k => [k, emptySystemReview()])) as any,
  diagnostico: emptyDiagnostico(),
})
const observacionesGenerales = ref('')

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)

const selectedAnnex = computed<PerioAnnex | null>(() => annexes.value.find(a => a.id === selectedId.value) ?? null)

function loadIntoForm(annex: PerioAnnex | null) {
  form.condiciones_clinicas = annex ? { ...emptyCondicionesClinicas(), ...annex.condiciones_clinicas } : emptyCondicionesClinicas()
  form.factores_riesgo = annex
    ? { ...Object.fromEntries(PERIO_RISK_FACTORS.map(k => [k, emptySystemReview()])), ...annex.factores_riesgo }
    : Object.fromEntries(PERIO_RISK_FACTORS.map(k => [k, emptySystemReview()]))
  form.diagnostico = annex ? { ...emptyDiagnostico(), ...annex.diagnostico } : emptyDiagnostico()
  observacionesGenerales.value = annex?.observaciones_generales ?? ''
}

watch(annexes, (list) => {
  if (selectedId.value || isCreatingNew.value) return
  if (list.length > 0) {
    selectedId.value = list[0].id
    loadIntoForm(list[0])
  } else {
    isCreatingNew.value = true
    loadIntoForm(null)
  }
}, { immediate: true })

function onSelect(value: string) {
  if (value === '__new__') { startNew(); return }
  selectedId.value = value
  isCreatingNew.value = false
  loadIntoForm(selectedAnnex.value)
}

function startNew() {
  selectedId.value = null
  isCreatingNew.value = true
  loadIntoForm(null)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function buildPayload(): Partial<PerioAnnexSections> {
  return {
    condiciones_clinicas: form.condiciones_clinicas,
    factores_riesgo: form.factores_riesgo,
    diagnostico: form.diagnostico,
    observaciones_generales: observacionesGenerales.value,
  }
}

async function handleSave() {
  if (isCreatingNew.value) {
    const created = await createMutation.mutateAsync(buildPayload())
    selectedId.value = created.id
    isCreatingNew.value = false
  } else if (selectedAnnex.value) {
    await updateMutation.mutateAsync({ id: selectedAnnex.value.id, data: buildPayload() })
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function goBack() {
  router.push(`/admin/clientes/${clienteId.value}`)
}
</script>
