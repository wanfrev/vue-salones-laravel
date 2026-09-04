<template>
  <header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
    <div>
      <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
        <ClipboardIcon class="h-4 w-4" />
        <span class="font-medium uppercase tracking-wider">Anexo de endodoncia</span>
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
          Diente {{ a.tooth_number }} — {{ formatDate(a.created_at) }}
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
    <div v-if="isCreatingNew">
      <FormSelect
        v-model="toothNumber"
        label="Diente a tratar"
        :options="toothOptions"
      />
    </div>
    <p v-else class="text-sm font-semibold text-text">Diente {{ selectedAnnex?.tooth_number }}</p>

    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">A. Historia de dolor</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormToggle v-model="form.examen.historia_dolor.dolor" label="¿Dolor?" />
        <FormInput v-model="form.examen.historia_dolor.intensidad" label="Intensidad (0-10)" />
        <FormInput v-model="form.examen.historia_dolor.tipo_dolor" label="Tipo de dolor" placeholder="Espontáneo / provocado" />
        <FormInput v-model="form.examen.historia_dolor.ubicacion" label="Ubicación" placeholder="Localizado / difuso" />
        <FormInput v-model="form.examen.historia_dolor.duracion_dolor" label="Duración" placeholder="Intermitente / continuo" />
        <FormInput v-model="form.examen.historia_dolor.tiempo_evolucion" label="Tiempo de evolución" />
      </div>
      <FormTextarea v-model="form.examen.historia_dolor.descripcion" label="Descripción" :rows="3" />
    </section>

    <section>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">B. Examen clínico</p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SystemReviewField
          v-for="key in ENDO_EXAM_ITEMS"
          :key="key"
          :label="ENDO_EXAM_LABELS[key]"
          v-model="form.examen.examen_clinico[key]!"
        />
      </div>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">C. Pruebas periapicales</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormToggle v-model="form.examen.pruebas_periapicales.se_realizan" label="¿Se realizan?" />
        <FormToggle v-model="form.examen.pruebas_periapicales.percusion" label="Percusión" />
        <FormToggle v-model="form.examen.pruebas_periapicales.palpacion" label="Palpación" />
        <FormToggle v-model="form.examen.pruebas_periapicales.masticacion" label="Masticación" />
        <FormInput v-model="form.examen.pruebas_periapicales.diente_control" label="Diente control" />
        <FormInput v-model="form.examen.pruebas_periapicales.dientes_control_adicionales" label="Dientes control adicionales" />
      </div>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">D. Pruebas de sensibilidad</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormToggle v-model="form.examen.pruebas_sensibilidad.se_realizan" label="¿Se realizan?" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.calor" label="Calor" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.frio_respuesta" label="Frío — respuesta" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.electrica" label="Eléctrica (valor por diente)" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.vitalometro" label="Vitalómetro utilizado" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.diente_control" label="Diente control" />
        <FormInput v-model="form.examen.pruebas_sensibilidad.dientes_control_adicionales" label="Dientes control adicionales" />
      </div>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">E. Examen radiográfico</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormTextarea v-model="form.examen.examen_radiografico.coronal_radiolucida" label="Coronal — zona radiolúcida" :rows="2" />
        <FormTextarea v-model="form.examen.examen_radiografico.coronal_radiopaca" label="Coronal — zona radiopaca" :rows="2" />
        <FormTextarea v-model="form.examen.examen_radiografico.radicular_radiolucida" label="Radicular — zona radiolúcida" :rows="2" />
        <FormTextarea v-model="form.examen.examen_radiografico.radicular_radiopaca" label="Radicular — zona radiopaca" :rows="2" />
        <FormTextarea v-model="form.examen.examen_radiografico.periapical_radiolucida" label="Periapical/perirradicular — zona radiolúcida" :rows="2" />
        <FormTextarea v-model="form.examen.examen_radiografico.periapical_radiopaca" label="Periapical/perirradicular — zona radiopaca" :rows="2" />
      </div>
      <FormTextarea v-model="form.examen.examen_radiografico.descripcion_final" label="Descripción radiológica final" :rows="3" />
      <FormToggle v-model="form.examen.examen_radiografico.requiere_examen_complementario" label="¿Requiere examen radiológico complementario?" />
    </section>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormInput v-model="form.examen.clasificacion_fisuras" label="F. Clasificación de fracturas dentales longitudinales" />
      <FormToggle v-model="form.examen.trauma_dentoalveolar.se_realiza_historia" label="G. ¿Se realiza historia de trauma dentoalveolar?" />
    </section>
    <FormTextarea v-if="form.examen.trauma_dentoalveolar.se_realiza_historia" v-model="form.examen.trauma_dentoalveolar.descripcion" label="Descripción del trauma" :rows="2" />

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">H-I. Diagnóstico y pronóstico</p>
      <FormInput v-model="form.diagnostico.codigo_cie10" label="Código CIE-10" class="max-w-xs" />
      <FormTextarea v-model="form.diagnostico.diagnostico_pulpar" label="Diagnóstico pulpar" :rows="2" />
      <FormTextarea v-model="form.diagnostico.diagnostico_periapical" label="Diagnóstico periapical" :rows="2" />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormToggle v-model="form.diagnostico.lesion_endo_periodontal" label="Lesión endo-periodontal" />
        <FormToggle v-model="form.diagnostico.relaciones_prosto_endo" label="Relaciones prosto-endo" />
      </div>
      <FormTextarea v-model="form.diagnostico.pronostico_general" label="Pronóstico general" :rows="2" />
      <FormTextarea v-model="form.diagnostico.pronostico_individual" label="Pronóstico individual" :rows="2" />
    </section>

    <section class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">J. Tratamiento de endodoncia</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormInput v-model="form.tratamiento.tipo" label="Tipo de tratamiento" placeholder="Conducto radicular / quirúrgico / otro" />
        <FormInput v-model="form.tratamiento.grapa_no" label="Grapa No." />
        <FormInput v-model="form.tratamiento.longitud" label="Longitud" />
      </div>
      <FormTextarea v-model="form.tratamiento.descripcion" label="Descripción" :rows="2" />

      <p class="text-xs font-semibold text-text-muted">Conductos</p>
      <ConductoListEditor v-model="form.tratamiento.conductos" />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput v-model="form.tratamiento.tecnica_instrumentacion" label="Técnica de instrumentación" placeholder="Manual / mecánica" />
        <FormInput v-model="form.tratamiento.tecnica_obturacion" label="Técnica de obturación" placeholder="Manual / termoplastificada" />
        <FormInput v-model="form.tratamiento.desobturacion_retenedor" label="Desobturación para retenedor interradicular" />
        <FormInput v-model="form.tratamiento.referencia" label="Referencia" />
      </div>
      <FormTextarea v-model="form.tratamiento.observaciones" label="Observaciones" :rows="2" />
    </section>

    <div class="flex justify-end border-t border-border pt-4">
      <button @click="handleSave" :disabled="isSaving || (isCreatingNew && !toothNumber)"
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
import { useEndoAnnexes } from '../composables/dental/useEndoAnnexes'
import SystemReviewField from '../components/dental/SystemReviewField.vue'
import ConductoListEditor from '../components/dental/ConductoListEditor.vue'
import { FormInput, FormTextarea, FormToggle, FormSelect } from '../components/forms'
import { UPPER_ARCH, LOWER_ARCH } from '../components/dental/odontogramGeometry'
import {
  ENDO_EXAM_ITEMS, type EndoAnnex, type EndoAnnexExamen, type EndoAnnexDiagnostico,
  type EndoAnnexTratamiento, type SystemReview,
} from '../types/database'
import type { EndoAnnexSections } from '../services/dental/endoAnnexService'

const ENDO_EXAM_LABELS: Record<string, string> = {
  deformacion_contorno_extraoral: 'Deformación de contorno extraoral',
  deformacion_contorno_intraoral: 'Deformación de contorno intraoral',
  cambio_color: 'Cambio de color',
  fractura_dental: 'Fractura dental',
  caries: 'Caries',
  obturaciones: 'Obturaciones',
  fistula: 'Fístula',
  bolsa_periodontal: 'Bolsa periodontal',
  movilidad: 'Movilidad',
  drenaje_por_surco: 'Drenaje por surco',
  oclusion_traumatica: 'Oclusión traumática',
  perdida_obturacion: 'Pérdida de obturación',
  camara_expuesta_cavidad_oral: 'Cámara expuesta a cavidad oral',
}

const toothOptions = [...UPPER_ARCH, ...LOWER_ARCH].map(l => ({ value: String(l.tooth), label: String(l.tooth) }))

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

const { annexes, isLoading, createMutation, updateMutation } = useEndoAnnexes(() => clienteId.value)

function emptySystemReview(): SystemReview {
  return { refiere: false, observaciones: '' }
}

function emptyExamen(): EndoAnnexExamen {
  return {
    historia_dolor: { dolor: false, intensidad: '', tipo_dolor: '', ubicacion: '', duracion_dolor: '', tiempo_evolucion: '', descripcion: '' },
    examen_clinico: Object.fromEntries(ENDO_EXAM_ITEMS.map(k => [k, emptySystemReview()])) as any,
    trauma_dentoalveolar: { se_realiza_historia: false, descripcion: '' },
    pruebas_periapicales: { se_realizan: false, percusion: false, palpacion: false, masticacion: false, diente_control: '', dientes_control_adicionales: '' },
    pruebas_sensibilidad: { se_realizan: false, calor: '', frio_respuesta: '', electrica: '', vitalometro: '', diente_control: '', dientes_control_adicionales: '' },
    examen_radiografico: {
      coronal_radiolucida: '', coronal_radiopaca: '', radicular_radiolucida: '', radicular_radiopaca: '',
      periapical_radiolucida: '', periapical_radiopaca: '', descripcion_final: '', requiere_examen_complementario: false,
    },
    clasificacion_fisuras: '',
  }
}

function emptyDiagnostico(): EndoAnnexDiagnostico {
  return {
    codigo_cie10: '', diagnostico_pulpar: '', diagnostico_periapical: '',
    lesion_endo_periodontal: false, relaciones_prosto_endo: false,
    pronostico_general: '', pronostico_individual: '',
  }
}

function emptyTratamiento(): EndoAnnexTratamiento {
  return {
    tipo: '', descripcion: '', grapa_no: '', conductos: [],
    tecnica_instrumentacion: '', tecnica_obturacion: '', desobturacion_retenedor: '',
    longitud: '', referencia: '', observaciones: '',
  }
}

const form = reactive({
  examen: emptyExamen(),
  diagnostico: emptyDiagnostico(),
  tratamiento: emptyTratamiento(),
})

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)
const toothNumber = ref('')

const selectedAnnex = computed<EndoAnnex | null>(() => annexes.value.find(a => a.id === selectedId.value) ?? null)

function loadIntoForm(annex: EndoAnnex | null) {
  form.examen = annex ? { ...emptyExamen(), ...annex.examen } : emptyExamen()
  form.diagnostico = annex ? { ...emptyDiagnostico(), ...annex.diagnostico } : emptyDiagnostico()
  form.tratamiento = annex ? { ...emptyTratamiento(), ...annex.tratamiento } : emptyTratamiento()
}

watch(annexes, (list) => {
  if (selectedId.value || isCreatingNew.value) return
  if (list.length > 0) {
    selectedId.value = list[0].id
    loadIntoForm(list[0])
  } else {
    startNew()
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
  toothNumber.value = ''
  loadIntoForm(null)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function buildPayload(): Partial<EndoAnnexSections> {
  return { examen: form.examen, diagnostico: form.diagnostico, tratamiento: form.tratamiento }
}

async function handleSave() {
  if (isCreatingNew.value) {
    if (!toothNumber.value) return
    const created = await createMutation.mutateAsync({ tooth_number: Number(toothNumber.value), ...buildPayload() })
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
