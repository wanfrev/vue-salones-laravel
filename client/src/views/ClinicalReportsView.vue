<template>
  <div class="grid grid-cols-1 gap-6 xl:grid-cols-[22rem_1fr]">
    <!-- Controles — no se imprimen -->
    <div class="space-y-4 no-print">
      <div v-if="minor" class="rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-text-secondary">
        <strong class="text-warning">Paciente menor de edad.</strong>
        <template v-if="!guardian"> No hay tutor registrado: agrégalo en la ficha antes de emitir documentos.</template>
        <template v-else-if="!guardian.shareInfo"> No hay autorización registrada para entregar información al tutor: confírmalo antes de entregar el documento.</template>
        <template v-else> El documento se emite a solicitud de su tutor, {{ guardian.name }}.</template>
      </div>
      <div class="grid grid-cols-1 gap-2">
        <button
          v-for="k in REPORT_KINDS"
          :key="k"
          type="button"
          @click="selectKind(k)"
          class="rounded-xl border px-3 py-2.5 text-left transition-theme"
          :class="kind === k ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/30 hover:bg-primary/5'"
        >
          <p class="text-sm font-semibold" :class="kind === k ? 'text-primary' : 'text-text'">{{ REPORT_KIND_LABELS[k] }}</p>
          <p class="mt-0.5 text-xs text-text-muted">{{ REPORT_KIND_HINTS[k] }}</p>
        </button>
      </div>

      <div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <template v-if="kind === 'attendance'">
          <div class="grid grid-cols-2 gap-3">
            <FormInput v-model="range.from" type="date" label="Desde" />
            <FormInput v-model="range.to" type="date" label="Hasta" />
          </div>
          <p class="text-xs" :class="rangeError ? 'text-danger' : 'text-text-muted'">
            {{ rangeError || (attendanceLoading ? 'Buscando sesiones...' : `${dates.length} fecha${dates.length === 1 ? '' : 's'} con sesión atendida en el período.`) }}
          </p>
        </template>

        <template v-else>
          <FormInput v-if="kind === 'referral'" v-model="recipient" label="Dirigida a" placeholder="Ej: Dr. Luis Mora (Psiquiatría)" />
          <FormTextarea v-if="kind === 'referral'" v-model="reason" label="Motivo de la derivación" :rows="2" :show-char-count="false" />
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Datos a incluir</p>
          <FormToggle v-model="opts.includeDiagnosis" label="Impresión diagnóstica" />
          <FormToggle v-if="kind === 'psych_report'" v-model="opts.includeScores" label="Resultados de cuestionarios (PHQ-9, GAD-7)" />
          <FormToggle v-if="kind === 'psych_report'" v-model="opts.includePlan" label="Plan terapéutico y objetivos" />
          <FormToggle v-model="opts.includeMedication" label="Medicación actual referida" />
          <p class="text-xs text-text-muted">Nunca se incluyen el contenido de las notas de sesión ni la evaluación de riesgo.</p>
        </template>
      </div>

      <div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <FormInput v-model="professional" label="Profesional que firma" />
        <FormInput v-model="license" label="Título y N.º de colegiado / matrícula" placeholder="Ej: Psicóloga clínica · FPV N.º 12345" />
        <div class="grid grid-cols-2 gap-3">
          <FormInput v-model="city" label="Ciudad" placeholder="Ej: Caracas" />
          <FormInput v-model="issueDate" type="date" label="Fecha" />
        </div>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-text-secondary">Texto del documento</p>
          <button type="button" @click="regenerate" class="text-xs font-semibold text-primary hover:underline">Regenerar borrador</button>
        </div>
        <FormTextarea v-model="body" :rows="14" :show-char-count="false" @update:model-value="edited = true" />
        <p class="mt-1 text-xs text-text-muted">Es un borrador: revísalo y edítalo antes de imprimir.</p>
      </div>

      <button
        type="button"
        @click="handlePrint"
        :disabled="!canPrint || printing"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        <PrinterIcon class="h-4 w-4" />
        {{ printing ? 'Registrando...' : 'Imprimir / Guardar como PDF' }}
      </button>
      <p class="text-xs text-text-muted">Cada impresión queda anotada en la auditoría clínica (quién y cuándo), sin guardar el contenido.</p>
    </div>

    <ReportSheet
      :title="REPORT_KIND_LABELS[kind]"
      :body="body"
      :business-name="businessName"
      :professional-name="professional"
      :license="license"
      :city="city"
      :date-text="issueDate ? longDateEs(issueDate) : ''"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { PrinterIcon } from '@solar-icons/vue/linear'
import { FormInput, FormTextarea, FormToggle } from '../components/forms'
import ReportSheet from '../components/clinical/ReportSheet.vue'
import {
  REPORT_KINDS, REPORT_KIND_HINTS, REPORT_KIND_LABELS, attendanceDates, draftAttendance, draftPsychReport, draftReferral, longDateEs,
  type PsychReportData,
} from '../components/clinical/reports'
import { intakeFromRecord } from '../components/clinical/intakeDefaults'
import { auditRangeError, defaultAuditRange } from '../components/clinical/auditLabels'
import { guardianFromMetadata, isMinor } from '../components/clinical/cases'
import { todayISO } from '../components/clinical/sessionNotes'
import { useClinicalIntake } from '../composables/clinical/useClinicalIntake'
import { useSessionNotes } from '../composables/clinical/useSessionNotes'
import { useTreatmentPlans } from '../composables/clinical/useTreatmentPlans'
import { useAssessments } from '../composables/clinical/useAssessments'
import { useAttendance } from '../composables/clinical/useAttendance'
import { useNotification } from '../composables/common/useNotification'
import { logReportPrinted } from '../services/clinical/auditService'
import { getClienteById } from '../services/clientesService'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { toISODate } from '../lib/formatters'
import type { AssessmentInstrumentId, ClinicalAssessment, ClinicalReportKind } from '../types/database'

const route = useRoute()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { error: showError } = useNotification()

const clienteId = computed(() => route.params.id as string)

const { data: cliente } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const { intake } = useClinicalIntake(() => clienteId.value)
const { notes } = useSessionNotes(() => clienteId.value)
const { plans } = useTreatmentPlans(() => clienteId.value)
const { assessments } = useAssessments(() => clienteId.value)

// ── Preferencias de quien firma (conveniencia por navegador; la pantalla funciona sin ellas) ──
const PREF_PREFIX = 'luma.clinical.report.'
const loadPref = (key: string): string => {
  try { return localStorage.getItem(PREF_PREFIX + key) ?? '' } catch { return '' }
}
const savePref = (key: string, value: string) => {
  try { localStorage.setItem(PREF_PREFIX + key, value) } catch { /* modo privado o storage bloqueado */ }
}

const kind = ref<ClinicalReportKind>('attendance')
const professional = ref(authStore.profile?.full_name ?? '')
const license = ref(loadPref('license'))
const city = ref(loadPref('city'))
const issueDate = ref(todayISO())
const recipient = ref('')
const reason = ref('')
const opts = reactive({ includeDiagnosis: true, includeScores: false, includePlan: false, includeMedication: false })
const range = reactive(defaultAuditRange())

watch(license, v => savePref('license', v))
watch(city, v => savePref('city', v))

// ── Datos del expediente para el borrador ──
const businessName = computed(() => businessStore.business?.name ?? '')
const rangeError = computed(() => auditRangeError(range.from, range.to))

const { sessions, isLoading: attendanceLoading } = useAttendance(
  () => clienteId.value,
  () => ({ from: range.from, to: range.to }),
  () => kind.value === 'attendance' && !rangeError.value,
)
const dates = computed(() => attendanceDates(sessions.value.map(s => s.start_time), toISODate))

// Menor de edad: el informe nombra a su representante legal, y se avisa si no hay autorización para informarle.
const minor = computed(() => isMinor(cliente.value?.birthday))
const guardian = computed(() => guardianFromMetadata(cliente.value?.metadata))

const ctx = computed(() => ({
  patientName: cliente.value?.name ?? '',
  documentId: cliente.value?.documentId || undefined,
  businessName: businessName.value,
  professionalName: professional.value,
  guardian: minor.value && guardian.value?.name
    ? { name: guardian.value.name, relationship: guardian.value.relationship, document: guardian.value.document }
    : null,
}))

const reportData = computed<PsychReportData>(() => {
  // `notes` llega ordenado por fecha desc: la primera es la más reciente, la última la más antigua.
  const latest: Partial<Record<AssessmentInstrumentId, ClinicalAssessment>> = {}
  for (const a of assessments.value) if (!latest[a.instrument]) latest[a.instrument] = a // más reciente por instrumento (llegan desc)
  return {
    intake: intakeFromRecord(intake.value),
    plan: plans.value.find(p => p.status === 'active') ?? plans.value[0] ?? null,
    sessionCount: notes.value.length,
    firstSessionDate: notes.value[notes.value.length - 1]?.session_date,
    lastSessionDate: notes.value[0]?.session_date,
    latestAssessments: latest,
  }
})

const draft = computed(() => {
  if (!cliente.value) return ''
  if (kind.value === 'attendance') return draftAttendance(ctx.value, dates.value, { from: range.from, to: range.to })
  if (kind.value === 'referral') return draftReferral(ctx.value, reportData.value, recipient.value, reason.value, opts)
  return draftPsychReport(ctx.value, reportData.value, opts)
})

// El borrador se rehace solo mientras nadie haya editado el texto; después solo con "Regenerar borrador".
const body = ref('')
const edited = ref(false)
watch(draft, d => { if (!edited.value) body.value = d }, { immediate: true })

function regenerate() {
  edited.value = false
  body.value = draft.value
}

function selectKind(k: ClinicalReportKind) {
  kind.value = k
  edited.value = false
}

// ── Impresión ──
const printing = ref(false)
const canPrint = computed(() => !!cliente.value && !!body.value.trim() && !!professional.value.trim())

async function handlePrint() {
  if (!canPrint.value || printing.value) return
  printing.value = true
  try {
    await logReportPrinted(clienteId.value, kind.value)
  } catch {
    // Un fallo de la bitácora no debe impedir entregarle el documento a un paciente, pero se avisa.
    showError('No se pudo registrar la impresión en la auditoría. Se imprimirá de todos modos.')
  } finally {
    printing.value = false
  }
  window.print()
}
</script>
