import type { ClinicalRiskLevel, SessionNote, SessionNoteContent } from '../../types/database'
import type { SessionNotePayload } from '../../services/clinical/sessionNoteService'

export const RISK_OPTIONS: Array<{ value: ClinicalRiskLevel; label: string }> = [
  { value: 'none', label: 'Sin riesgo' },
  { value: 'low', label: 'Riesgo bajo' },
  { value: 'moderate', label: 'Riesgo moderado' },
  { value: 'high', label: 'Riesgo alto' },
]

export const RISK_LABELS: Record<ClinicalRiskLevel, string> = {
  none: 'Sin riesgo',
  low: 'Riesgo bajo',
  moderate: 'Riesgo moderado',
  high: 'Riesgo alto',
}

export const RISK_TONE: Record<ClinicalRiskLevel, string> = {
  none: 'bg-bg-secondary text-text-muted',
  low: 'bg-success/10 text-success',
  moderate: 'bg-warning/10 text-warning',
  high: 'bg-danger/10 text-danger',
}

/** Orden de gravedad — para elegir el peor riesgo entre varias notas. */
const RISK_RANK: Record<ClinicalRiskLevel, number> = { none: 0, low: 1, moderate: 2, high: 3 }
export const isElevatedRisk = (level: ClinicalRiskLevel | null | undefined): boolean => !!level && RISK_RANK[level] >= RISK_RANK.moderate

export const SOAP_FIELDS: Array<{ key: keyof SessionNoteContent; label: string; hint: string }> = [
  { key: 'subjective', label: 'Subjetivo', hint: 'Lo que el paciente reporta: estado de ánimo, eventos de la semana, preocupaciones.' },
  { key: 'objective', label: 'Objetivo', hint: 'Lo que observa el terapeuta: conducta, afecto, discurso, resultados de pruebas.' },
  { key: 'assessment', label: 'Evaluación', hint: 'Análisis clínico: avance, hipótesis, relación con los objetivos del plan.' },
  { key: 'plan', label: 'Plan', hint: 'Intervenciones, tareas y foco de la próxima sesión.' },
]

/** Fecha local de hoy como YYYY-MM-DD (sin pasar por UTC, que en Venezuela corre el día de noche). */
export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export interface SessionNoteForm {
  appointment_id: string
  session_date: string
  duration_minutes: string
  risk_level: ClinicalRiskLevel
  mood_rating: string
  content: SessionNoteContent
  tasks: string
}

const emptyContent = (): SessionNoteContent => ({ subjective: '', objective: '', assessment: '', plan: '' })

export function emptySessionNoteForm(): SessionNoteForm {
  return {
    appointment_id: '',
    session_date: todayISO(),
    duration_minutes: '50',
    risk_level: 'none',
    mood_rating: '',
    content: emptyContent(),
    tasks: '',
  }
}

export function formFromNote(note: SessionNote): SessionNoteForm {
  return {
    appointment_id: note.appointment_id ?? '',
    session_date: note.session_date,
    duration_minutes: note.duration_minutes != null ? String(note.duration_minutes) : '',
    risk_level: note.risk_level,
    mood_rating: note.mood_rating != null ? String(note.mood_rating) : '',
    content: { ...emptyContent(), ...note.content },
    tasks: note.tasks ?? '',
  }
}

const toIntOrNull = (value: string): number | null => {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

export function payloadFromForm(form: SessionNoteForm): SessionNotePayload {
  return {
    appointment_id: form.appointment_id || null,
    session_date: form.session_date,
    duration_minutes: toIntOrNull(form.duration_minutes),
    risk_level: form.risk_level,
    mood_rating: toIntOrNull(form.mood_rating),
    content: {
      subjective: form.content.subjective.trim(),
      objective: form.content.objective.trim(),
      assessment: form.content.assessment.trim(),
      plan: form.content.plan.trim(),
    },
    tasks: form.tasks.trim() || null,
  }
}

/** Una nota sin fecha o sin ningún texto clínico no se puede guardar. */
export function isSessionNoteSavable(form: SessionNoteForm): boolean {
  return !!form.session_date && Object.values(form.content).some(text => text.trim().length > 0)
}
