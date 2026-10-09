import { computed } from 'vue'
import {
  ClipboardTextIcon, CalendarIcon, DocumentMedicineIcon, HeartPulseIcon, ClipboardCheckIcon, DocumentTextIcon,
  PaperclipIcon, ChartSquareIcon, GraphUpIcon, BoxIcon,
} from '@solar-icons/vue/linear'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole } from '../../constants/roles'
import { useClinicalIntake } from './useClinicalIntake'
import { useSessionNotes } from './useSessionNotes'
import { useTreatmentPlans } from './useTreatmentPlans'
import { useInformedConsents } from './useInformedConsents'
import { useAssessments } from './useAssessments'
import { isElevatedRisk, RISK_LABELS } from '../../components/clinical/sessionNotes'
import { intakeFromRecord } from '../../components/clinical/intakeDefaults'
import type { DentalNavTab } from '../../components/dental/DentalToolsNav.vue'

export interface ClinicalRiskAlert {
  key: string
  label: string
  note?: string
}

/**
 * Mismo criterio que el servidor (Clinical\Concerns\ClinicalRecordAccess): admin/encargado siempre;
 * empleado solo si su flag de expediente clínico no está apagado; cajero (recepción) nunca.
 * Se usa para no disparar peticiones que el backend va a rechazar con 403.
 */
export function useClinicalAccess() {
  const authStore = useAuthStore()
  return computed(() => {
    const role = authStore.role ?? undefined
    if (isAdminPanelRole(role)) return true
    if (role === 'cajero') return false
    return authStore.profile?.can_access_dental_clinical !== false
  })
}

/**
 * Fuente única de las 5 herramientas clínicas (icono, punto de "tiene datos", atajo de teclado) y
 * de las alertas de riesgo, compartida por el shell del expediente y las tarjetas de la ficha del
 * paciente — así las dos pantallas no se desincronizan.
 *
 * @param enabled Debe ser false fuera de un negocio con módulo clínico: la ficha de cliente se
 * renderiza para todos los nichos y estas queries pegan a endpoints exclusivos de este módulo.
 */
export function useClinicalToolsNavTabs(clientId: () => string | null, enabled: () => boolean = () => true) {
  const hasAccess = useClinicalAccess()
  const businessStore = useBusinessStore()
  const gatedClientId = () => (enabled() && hasAccess.value ? clientId() : null)

  const { intake, isLoading: intakeLoading } = useClinicalIntake(gatedClientId)
  const { notes, isLoading: notesLoading } = useSessionNotes(gatedClientId)
  const { plans, isLoading: plansLoading } = useTreatmentPlans(gatedClientId)
  const { consents, isLoading: consentsLoading } = useInformedConsents(gatedClientId)
  const { assessments, isLoading: assessmentsLoading } = useAssessments(gatedClientId)

  const navTabs = computed<DentalNavTab[]>(() => {
    const tabs: DentalNavTab[] = [
    { key: 'historia', label: 'Historia clínica', icon: ClipboardTextIcon, shortcut: 1, isLoading: intakeLoading.value, hasData: !!intake.value },
    { key: 'sesiones', label: 'Sesiones', icon: CalendarIcon, shortcut: 2, isLoading: notesLoading.value, hasData: notes.value.length > 0 },
    { key: 'plan', label: 'Plan terapéutico', shortLabel: 'Plan', icon: DocumentMedicineIcon, shortcut: 3, isLoading: plansLoading.value, hasData: plans.value.length > 0 },
    { key: 'evaluaciones', label: 'Evaluaciones', icon: HeartPulseIcon, shortcut: 4, isLoading: assessmentsLoading.value, hasData: assessments.value.length > 0 },
    { key: 'consentimiento', label: 'Consentimientos', icon: ClipboardCheckIcon, shortcut: 5, isLoading: consentsLoading.value, hasData: consents.value.length > 0 },
    // Los informes no guardan contenido: no hay "dato registrado" que marcar con el punto verde.
    { key: 'informes', label: 'Informes', icon: DocumentTextIcon, shortcut: 6, isLoading: false, hasData: false },
    ]

    // Sin punto de "tiene datos" a propósito: para marcarlo habría que consultar adjuntos y diagramas
    // (descifrarlos y anotar una lectura en la auditoría) solo por abrir la ficha del paciente.
    if (businessStore.hasCapability('clinical.attachments')) {
      tabs.push({ key: 'adjuntos', label: 'Adjuntos', icon: PaperclipIcon, shortcut: 7, isLoading: false, hasData: false })
    }
    if (businessStore.hasCapability('clinical.diagrams')) {
      tabs.push(
        { key: 'genograma', label: 'Genograma', icon: ChartSquareIcon, shortcut: 8, isLoading: false, hasData: false },
        { key: 'linea-de-vida', label: 'Línea de vida', shortLabel: 'Vida', icon: GraphUpIcon, shortcut: 9, isLoading: false, hasData: false },
      )
    }
    // Programas de sesiones: sin punto de datos (no se consulta solo por abrir la ficha) y su atajo es la tecla 0 (las nueve anteriores ya usan 1-9).
    if (businessStore.hasCapability('clinical.programs')) {
      tabs.push({ key: 'programas', label: 'Programas', icon: BoxIcon, shortcut: 0, isLoading: false, hasData: false })
    }
    return tabs
  })

  // Alertas rojas del encabezado — para que cualquiera que abra el expediente vea de entrada los
  // factores de riesgo, sin tener que entrar a cada pestaña.
  const riskAlerts = computed<ClinicalRiskAlert[]>(() => {
    const alerts: ClinicalRiskAlert[] = []
    const risk = intakeFromRecord(intake.value).riesgo

    if (risk.ideacion_suicida === 'activa') alerts.push({ key: 'ideation', label: 'Ideación suicida activa' })
    else if (risk.ideacion_suicida === 'pasiva') alerts.push({ key: 'ideation', label: 'Ideación suicida pasiva' })
    if (risk.intentos_previos) alerts.push({ key: 'attempts', label: 'Intentos suicidas previos' })
    if (risk.autolesiones) alerts.push({ key: 'selfharm', label: 'Autolesiones' })
    if (risk.riesgo_hacia_otros) alerts.push({ key: 'others', label: 'Riesgo hacia otros' })

    // `notes` llega ordenado por fecha desc desde el backend: la primera es la más reciente.
    const lastNote = notes.value[0]
    if (lastNote && isElevatedRisk(lastNote.risk_level)) {
      alerts.push({ key: 'last-note', label: `Última sesión: ${RISK_LABELS[lastNote.risk_level].toLowerCase()}` })
    }

    const lastPhq9 = assessments.value.find(a => a.instrument === 'phq9')
    if (lastPhq9?.risk_flag) {
      alerts.push({ key: 'phq9', label: 'PHQ-9: ítem de ideación positivo', note: 'Revisar en la pestaña Evaluaciones' })
    }

    return alerts
  })

  return { navTabs, riskAlerts, hasAccess }
}
