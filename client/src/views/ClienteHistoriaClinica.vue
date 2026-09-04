<template>
  <header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
    <div>
      <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
        <ClipboardIcon class="h-4 w-4" />
        <span class="font-medium uppercase tracking-wider">Historia clínica</span>
      </div>
      <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || terminology.client || 'Paciente' }}</p>
    </div>
    <button
      @click="goBack"
      class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
    >
      <ArrowLeftIcon class="h-4 w-4" />
      Volver
    </button>
  </header>

  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Folio</label>
      <select
        :value="selectedId ?? '__new__'"
        @change="onSelectFolio(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
      >
        <option v-if="isCreatingNew" value="__new__">Folio nuevo (sin guardar)</option>
        <option v-for="h in histories" :key="h.id" :value="h.id">
          Folio {{ h.folio_number }} — {{ formatDate(h.created_at) }}
        </option>
      </select>
    </div>
    <button
      @click="startNewFolio"
      class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
    >
      <AddCircleIcon class="h-4 w-4" />
      Nueva historia clínica
    </button>
  </div>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div class="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-theme"
        :class="activeTab === tab.key ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-bg-secondary'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <!-- A. ANAMNESIS -->
      <div v-if="activeTab === 'anamnesis'" class="space-y-5">
        <FormTextarea v-model="form.anamnesis.motivo_consulta" label="Motivo de la consulta" :rows="2" />
        <FormTextarea v-model="form.anamnesis.historia_motivo_consulta" label="Historia del motivo de consulta" :rows="4" />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormToggle v-model="form.anamnesis.asistio_consulta_ultimo_anio" label="¿Asistió a consulta odontológica el último año?" />
          <FormToggle v-model="form.anamnesis.motivo_ultima_consulta_urgencia" label="¿La última consulta fue por dolor/urgencia?" />
          <FormToggle v-model="form.anamnesis.atendido_en_esta_clinica_previamente" label="¿Atendido en esta clínica previamente?" />
        </div>

        <FormInput v-model="form.anamnesis.grupo_sanguineo" label="Grupo sanguíneo" placeholder="Ej: O+" class="max-w-xs" />

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Antecedentes médicos y personales</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SystemReviewField
              v-for="key in MEDICAL_SYSTEMS"
              :key="key"
              :label="MEDICAL_SYSTEM_LABELS[key]"
              v-model="form.anamnesis.antecedentes_medicos[key]!"
            />
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Antecedentes odontológicos patológicos y de tratamiento</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SystemReviewField
              v-for="key in DENTAL_HISTORY_SPECIALTIES"
              :key="key"
              :label="DENTAL_HISTORY_LABELS[key]"
              v-model="form.anamnesis.antecedentes_odontologicos[key]!"
            />
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Desórdenes temporomandibulares</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FormToggle v-model="form.anamnesis.tmd.dolor_cara_mandibula_ultimo_mes" label="¿Dolor de cara/mandíbula/sienes/oídos el último mes?" />
            <FormToggle v-model="form.anamnesis.tmd.mandibula_bloqueada" label="¿Mandíbula bloqueada o dificultad para abrir/cerrar?" />
            <FormToggle v-model="form.anamnesis.tmd.ruido_articulacion" label="¿Ruido (traqueo) en la articulación?" />
            <FormToggle v-model="form.anamnesis.tmd.mordida_incomoda" label="¿Mordida incómoda o diferente?" />
            <FormToggle v-model="form.anamnesis.tmd.traumatismo_reciente" label="¿Traumatismo reciente en cara o mandíbula?" />
            <FormToggle v-model="form.anamnesis.tmd.dolores_cabeza_6meses" label="¿Dolores de cabeza o migraña en 6 meses?" />
          </div>
          <FormTextarea v-model="form.anamnesis.tmd.dolor_orofacial" label="Dolor orofacial" :rows="2" class="mt-2" />
          <FormTextarea v-model="form.anamnesis.tmd.observaciones" label="Observaciones TMD" :rows="2" class="mt-2" />
        </div>

        <FormTextarea v-model="form.anamnesis.observaciones" label="Observaciones generales de anamnesis" :rows="3" />
      </div>

      <!-- B. EXAMEN FÍSICO -->
      <div v-if="activeTab === 'examen_fisico'" class="space-y-5">
        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Signos vitales</p>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <FormInput v-model="form.examen_fisico.signos_vitales.pulso" label="Pulso (x min)" />
            <FormInput v-model="form.examen_fisico.signos_vitales.tension_arterial" label="Tensión (mmHg)" />
            <FormInput v-model="form.examen_fisico.signos_vitales.temperatura" label="Temperatura (°C)" />
            <FormInput v-model="form.examen_fisico.signos_vitales.frecuencia_respiratoria" label="Frec. respiratoria" />
            <FormInput v-model="form.examen_fisico.signos_vitales.peso" label="Peso (Kg)" />
            <FormInput v-model="form.examen_fisico.signos_vitales.talla" label="Talla (m)" />
          </div>
          <p class="mt-1 text-xs text-text-muted">IMC: {{ imc }}</p>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Examen extraoral</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormTextarea
              v-for="f in EXAMEN_EXTRAORAL_FIELDS"
              :key="f.key"
              v-model="form.examen_fisico.examen_extraoral[f.key]"
              :label="f.label"
              :rows="2"
            />
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Examen intraoral</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormTextarea
              v-for="f in EXAMEN_INTRAORAL_FIELDS"
              :key="f.key"
              v-model="form.examen_fisico.examen_intraoral[f.key]"
              :label="f.label"
              :rows="2"
            />
          </div>
          <div class="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p class="mb-1 text-xs font-semibold text-text-muted">Índice C.O.P. (dientes permanentes)</p>
              <div class="grid grid-cols-3 gap-2">
                <FormInput v-model="form.examen_fisico.cop.c" label="Cariado" />
                <FormInput v-model="form.examen_fisico.cop.o" label="Obturado" />
                <FormInput v-model="form.examen_fisico.cop.p" label="Perdido" />
              </div>
            </div>
            <div>
              <p class="mb-1 text-xs font-semibold text-text-muted">Índice ceo (dientes temporales)</p>
              <div class="grid grid-cols-3 gap-2">
                <FormInput v-model="form.examen_fisico.ceo.c" label="Cariado" />
                <FormInput v-model="form.examen_fisico.ceo.e" label="Exfoliado" />
                <FormInput v-model="form.examen_fisico.ceo.o" label="Obturado" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- C. EXÁMENES COMPLEMENTARIOS -->
      <div v-if="activeTab === 'examenes_complementarios'" class="space-y-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Hallazgos radiológicos</p>
        <FormTextarea
          v-for="f in HALLAZGOS_RADIOLOGICOS_FIELDS"
          :key="f.key"
          v-model="form.examenes_complementarios.hallazgos_radiologicos[f.key]"
          :label="f.label"
          :rows="2"
        />
      </div>

      <!-- D. DIAGNÓSTICO Y PLAN -->
      <div v-if="activeTab === 'diagnostico'" class="space-y-4">
        <FormInput v-model="form.diagnostico.codigo_cie10" label="Código CIE-10" placeholder="Ej: K046" class="max-w-xs" />
        <FormTextarea v-model="form.diagnostico.diagnostico" label="Diagnóstico" :rows="4" />
        <FormTextarea v-model="form.diagnostico.pronostico" label="Pronóstico" :rows="2" />

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Plan de tratamiento por fases</p>
          <div class="space-y-2">
            <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_urgencias" label="Fase de urgencias" :rows="2" />
            <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_sistemica" label="Fase sistémica" :rows="2" />
            <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_higienica" label="Fase higiénica / reevaluación" :rows="2" />
            <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_correctiva" label="Fase correctiva / reevaluación" :rows="2" />
            <FormTextarea v-model="form.diagnostico.plan_tratamiento.fase_mantenimiento" label="Fase de mantenimiento" :rows="2" />
          </div>
        </div>
      </div>

      <!-- E. OBSERVACIONES -->
      <div v-if="activeTab === 'observaciones'" class="space-y-4">
        <FormToggle
          v-model="form.certificado_veracidad"
          label="Certificado de veracidad"
          hint="El paciente declara que la información suministrada para esta historia clínica es cierta."
        />
        <FormTextarea v-model="observacionesGenerales" label="Observaciones generales" :rows="4" />
      </div>

      <div class="mt-6 flex justify-end border-t border-border pt-4">
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
        >
          {{ isSaving ? 'Guardando...' : isCreatingNew ? 'Crear historia clínica' : `Guardar folio ${selectedFolio?.folio_number ?? ''}` }}
        </button>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, ClipboardIcon, AddCircleIcon } from '@solar-icons/vue/linear'
import { useBusinessStore } from '../store/business'
import { getClienteById } from '../services/clientesService'
import { useClinicalHistories } from '../composables/dental/useClinicalHistories'
import SystemReviewField from '../components/dental/SystemReviewField.vue'
import { FormInput, FormTextarea, FormToggle } from '../components/forms'
import {
  MEDICAL_SYSTEMS, DENTAL_HISTORY_SPECIALTIES,
  type ClinicalHistory, type ClinicalHistoryAnamnesis, type ClinicalHistoryExamenFisico,
  type ClinicalHistoryExamenesComplementarios, type ClinicalHistoryDiagnostico, type SystemReview,
} from '../types/database'
import type { ClinicalHistorySections } from '../services/dental/clinicalHistoryService'

const MEDICAL_SYSTEM_LABELS: Record<string, string> = {
  sistema_nervioso: 'Sistema Nervioso', sistema_endocrino: 'Sistema Endocrino',
  sistema_osteomuscular: 'Sistema Osteomuscular', sistema_cardiovascular: 'Sistema Cardiovascular',
  sistema_respiratorio: 'Sistema Respiratorio', sistema_inmunologico: 'Sistema Inmunológico',
  sistema_dermatologico: 'Sistema Dermatológico', ginecobstetricos: 'Ginecobstétricos',
  sistema_hematologico: 'Sistema Hematológico', sistema_digestivo: 'Sistema Digestivo',
  sistema_renal: 'Sistema Renal', hereditarios: 'Hereditarios', perinatales: 'Perinatales',
  toxico_alergicos: 'Tóxico-Alérgicos', farmacologicos: 'Farmacológicos', quirurgicos: 'Quirúrgicos',
  hospitalarios: 'Hospitalarios', familiares: 'Familiares', psicosociales: 'Psicosociales', otros: 'Otros',
}

const DENTAL_HISTORY_LABELS: Record<string, string> = {
  patologia_cirugia_bucal: 'Patología y Cirugía Bucal', cirugia_maxilofacial: 'Cirugía Maxilofacial',
  ortodoncia: 'Ortodoncia', endodoncia: 'Endodoncia', rehabilitacion_oral: 'Rehabilitación Oral',
  periodoncia: 'Periodoncia', odontopediatria: 'Odontopediatría',
}

const EXAMEN_EXTRAORAL_FIELDS = [
  { key: 'apariencia_general', label: 'Apariencia general' },
  { key: 'simetria_facial', label: 'Simetría facial' },
  { key: 'perfil', label: 'Perfil' },
  { key: 'tipo_cara', label: 'Tipo de cara' },
  { key: 'linea_sonrisa', label: 'Línea de sonrisa' },
  { key: 'desviacion_mandibular', label: 'Desviación mandibular' },
  { key: 'ojos', label: 'Ojos' },
  { key: 'nariz', label: 'Nariz' },
  { key: 'labios', label: 'Labios' },
  { key: 'piel_anexos', label: 'Piel y/o anexos' },
  { key: 'sistema_linfatico', label: 'Sistema linfático' },
  { key: 'atm_musculos_masticatorios', label: 'ATM / Músculos masticatorios' },
  { key: 'pares_craneales', label: 'Pares craneales' },
]

const EXAMEN_INTRAORAL_FIELDS = [
  { key: 'lengua', label: 'Lengua' },
  { key: 'paladar', label: 'Paladar' },
  { key: 'mucosas', label: 'Mucosas' },
  { key: 'orofaringe', label: 'Orofaringe (incl. Mallampati)' },
  { key: 'piso_boca', label: 'Piso de boca' },
  { key: 'inserciones_musculares_frenillos', label: 'Inserciones musculares / frenillos' },
  { key: 'rebordes_alveolares_edentulos', label: 'Rebordes alveolares edéntulos' },
  { key: 'presencia_protesis', label: 'Presencia de prótesis' },
  { key: 'ortodoncia_previa_actual', label: 'Tratamiento de ortodoncia previo o actual' },
]

const HALLAZGOS_RADIOLOGICOS_FIELDS = [
  { key: 'periapicales_permanentes', label: 'Radiografías periapicales (dientes permanentes)' },
  { key: 'periapicales_temporales', label: 'Radiografías periapicales (dientes temporales)' },
  { key: 'panoramica', label: 'Radiografía panorámica' },
  { key: 'coronales', label: 'Radiografías coronales' },
  { key: 'cbct', label: 'Tomografía CBCT' },
  { key: 'otras_radiografias', label: 'Otras radiografías' },
  { key: 'reportes_examenes_complementarios', label: 'Reportes de exámenes complementarios (labs, interconsultas, biopsias...)' },
]

const TABS = [
  { key: 'anamnesis', label: 'A. Anamnesis' },
  { key: 'examen_fisico', label: 'B. Examen físico' },
  { key: 'examenes_complementarios', label: 'C. Exámenes complementarios' },
  { key: 'diagnostico', label: 'D. Diagnóstico y plan' },
  { key: 'observaciones', label: 'E. Observaciones' },
] as const
type TabKey = typeof TABS[number]['key']

const route = useRoute()
const router = useRouter()
const businessStore = useBusinessStore()

const clienteId = computed(() => route.params.id as string)
const terminology = computed(() => businessStore.terminology)
const activeTab = ref<TabKey>('anamnesis')

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})
const cliente = computed(() => clienteData.value ?? null)

const { histories, isLoading, createMutation, updateMutation } = useClinicalHistories(() => clienteId.value)

function emptySystemReview(): SystemReview {
  return { refiere: false, observaciones: '' }
}

function emptyAnamnesis(): ClinicalHistoryAnamnesis {
  return {
    motivo_consulta: '', historia_motivo_consulta: '',
    asistio_consulta_ultimo_anio: false, motivo_ultima_consulta_urgencia: false,
    atendido_en_esta_clinica_previamente: false, grupo_sanguineo: '',
    antecedentes_medicos: Object.fromEntries(MEDICAL_SYSTEMS.map(k => [k, emptySystemReview()])) as any,
    antecedentes_odontologicos: Object.fromEntries(DENTAL_HISTORY_SPECIALTIES.map(k => [k, emptySystemReview()])) as any,
    tmd: {
      dolor_cara_mandibula_ultimo_mes: false, mandibula_bloqueada: false, ruido_articulacion: false,
      mordida_incomoda: false, traumatismo_reciente: false, dolores_cabeza_6meses: false,
      dolor_orofacial: '', otros: '', observaciones: '',
    },
    observaciones: '',
  }
}

function emptyExamenFisico(): ClinicalHistoryExamenFisico {
  return {
    signos_vitales: { pulso: '', tension_arterial: '', temperatura: '', frecuencia_respiratoria: '', peso: '', talla: '' },
    examen_extraoral: Object.fromEntries(EXAMEN_EXTRAORAL_FIELDS.map(f => [f.key, ''])),
    examen_intraoral: Object.fromEntries(EXAMEN_INTRAORAL_FIELDS.map(f => [f.key, ''])),
    cop: { c: '', o: '', p: '' },
    ceo: { c: '', e: '', o: '' },
  }
}

function emptyExamenesComplementarios(): ClinicalHistoryExamenesComplementarios {
  return { hallazgos_radiologicos: Object.fromEntries(HALLAZGOS_RADIOLOGICOS_FIELDS.map(f => [f.key, ''])) }
}

function emptyDiagnostico(): ClinicalHistoryDiagnostico {
  return {
    codigo_cie10: '', diagnostico: '', pronostico: '',
    plan_tratamiento: { fase_urgencias: '', fase_sistemica: '', fase_higienica: '', fase_correctiva: '', fase_mantenimiento: '' },
  }
}

const form = reactive({
  anamnesis: emptyAnamnesis(),
  examen_fisico: emptyExamenFisico(),
  examenes_complementarios: emptyExamenesComplementarios(),
  diagnostico: emptyDiagnostico(),
  certificado_veracidad: false,
})
const observacionesGenerales = ref('')

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)

const selectedFolio = computed<ClinicalHistory | null>(() => histories.value.find(h => h.id === selectedId.value) ?? null)

function loadIntoForm(history: ClinicalHistory | null) {
  form.anamnesis = history ? { ...emptyAnamnesis(), ...history.anamnesis } : emptyAnamnesis()
  form.examen_fisico = history ? { ...emptyExamenFisico(), ...history.examen_fisico } : emptyExamenFisico()
  form.examenes_complementarios = history ? { ...emptyExamenesComplementarios(), ...history.examenes_complementarios } : emptyExamenesComplementarios()
  form.diagnostico = history ? { ...emptyDiagnostico(), ...history.diagnostico } : emptyDiagnostico()
  form.certificado_veracidad = history?.certificado_veracidad ?? false
  observacionesGenerales.value = history?.observaciones_generales ?? ''
}

// Al cargar los folios por primera vez: selecciona el vigente (el primero, ya viene desc por folio_number),
// o entra en modo "nuevo" si el paciente todavía no tiene ninguna historia clínica.
watch(histories, (list) => {
  if (selectedId.value || isCreatingNew.value) return
  if (list.length > 0) {
    selectedId.value = list[0].id
    loadIntoForm(list[0])
  } else {
    isCreatingNew.value = true
    loadIntoForm(null)
  }
}, { immediate: true })

function onSelectFolio(value: string) {
  if (value === '__new__') {
    startNewFolio()
    return
  }
  selectedId.value = value
  isCreatingNew.value = false
  loadIntoForm(selectedFolio.value)
}

function startNewFolio() {
  selectedId.value = null
  isCreatingNew.value = true
  loadIntoForm(null)
}

const imc = computed(() => {
  const peso = parseFloat(form.examen_fisico.signos_vitales.peso)
  const talla = parseFloat(form.examen_fisico.signos_vitales.talla)
  if (!peso || !talla) return '—'
  return (peso / (talla * talla)).toFixed(2)
})

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function buildPayload(): Partial<ClinicalHistorySections> {
  return {
    anamnesis: form.anamnesis,
    examen_fisico: form.examen_fisico,
    examenes_complementarios: form.examenes_complementarios,
    diagnostico: form.diagnostico,
    certificado_veracidad: form.certificado_veracidad,
    observaciones_generales: observacionesGenerales.value,
  }
}

async function handleSave() {
  if (isCreatingNew.value) {
    const created = await createMutation.mutateAsync(buildPayload())
    selectedId.value = created.id
    isCreatingNew.value = false
  } else if (selectedFolio.value) {
    await updateMutation.mutateAsync({ id: selectedFolio.value.id, data: buildPayload() })
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function goBack() {
  router.push(`/admin/clientes/${clienteId.value}`)
}
</script>
