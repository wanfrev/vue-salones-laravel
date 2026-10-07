import type { AssessmentInstrumentId, AssessmentSeverityId } from '../../types/database'

/**
 * Cuestionarios estandarizados de tamizaje (PHQ-9, GAD-7; textos en español de dominio público).
 *
 * Esta puntuación es solo para la vista previa en pantalla mientras se responde — el backend
 * (App\Services\Clinical\AssessmentScoring) recalcula y es la fuente de verdad de lo que se guarda.
 * Si cambias un corte aquí, cámbialo también allá.
 */

export interface AssessmentDefinition {
  id: AssessmentInstrumentId
  label: string
  title: string
  description: string
  items: readonly string[]
  /** Cortes de severidad: el puntaje total cae en la última banda cuyo `min` alcanza. */
  bands: ReadonlyArray<{ min: number; severity: AssessmentSeverityId }>
  /** Índice del ítem que dispara alerta de riesgo si es > 0 (PHQ-9 #9: ideación suicida). */
  riskItemIndex: number | null
  maxScore: number
}

export const RESPONSE_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Varios días' },
  { value: 2, label: 'Más de la mitad de los días' },
  { value: 3, label: 'Casi todos los días' },
] as const

export const ASSESSMENTS: Record<AssessmentInstrumentId, AssessmentDefinition> = {
  phq9: {
    id: 'phq9',
    label: 'PHQ-9',
    title: 'PHQ-9 — Cuestionario de salud del paciente (depresión)',
    description: 'Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    items: [
      'Poco interés o placer en hacer las cosas',
      'Se ha sentido decaído(a), deprimido(a) o sin esperanzas',
      'Dificultad para dormir o permanecer dormido(a), o dormir demasiado',
      'Se ha sentido cansado(a) o con poca energía',
      'Con poco apetito o ha comido en exceso',
      'Se ha sentido mal consigo mismo(a), o que es un fracaso, o que ha quedado mal con usted mismo(a) o con su familia',
      'Dificultad para concentrarse en cosas como leer o ver televisión',
      'Se ha movido o hablado tan lento que otras personas lo han notado, o por el contrario, ha estado tan inquieto(a) que se ha movido mucho más de lo normal',
      'Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera',
    ],
    bands: [
      { min: 0, severity: 'minimal' },
      { min: 5, severity: 'mild' },
      { min: 10, severity: 'moderate' },
      { min: 15, severity: 'moderately_severe' },
      { min: 20, severity: 'severe' },
    ],
    riskItemIndex: 8,
    maxScore: 27,
  },
  gad7: {
    id: 'gad7',
    label: 'GAD-7',
    title: 'GAD-7 — Escala de trastorno de ansiedad generalizada',
    description: 'Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    items: [
      'Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta',
      'No ha podido dejar de preocuparse o no ha podido controlar la preocupación',
      'Se ha preocupado demasiado por motivos diferentes',
      'Ha tenido dificultad para relajarse',
      'Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)',
      'Se ha molestado o irritado fácilmente',
      'Ha sentido miedo, como si algo terrible pudiera pasar',
    ],
    bands: [
      { min: 0, severity: 'minimal' },
      { min: 5, severity: 'mild' },
      { min: 10, severity: 'moderate' },
      { min: 15, severity: 'severe' },
    ],
    riskItemIndex: null,
    maxScore: 21,
  },
}

export const ASSESSMENT_IDS = Object.keys(ASSESSMENTS) as AssessmentInstrumentId[]

export const SEVERITY_LABELS: Record<AssessmentSeverityId, string> = {
  minimal: 'Mínima',
  mild: 'Leve',
  moderate: 'Moderada',
  moderately_severe: 'Moderadamente severa',
  severe: 'Severa',
}

/** Tono visual por severidad — clases de los tokens de diseño existentes (success/warning/danger). */
export const SEVERITY_TONE: Record<AssessmentSeverityId, string> = {
  minimal: 'bg-success/10 text-success',
  mild: 'bg-success/10 text-success',
  moderate: 'bg-warning/10 text-warning',
  moderately_severe: 'bg-danger/10 text-danger',
  severe: 'bg-danger/10 text-danger',
}

export interface AssessmentScore {
  /** true cuando todos los ítems tienen respuesta. */
  complete: boolean
  total: number
  severity: AssessmentSeverityId
  riskFlag: boolean
}

/** `null` = ítem sin responder todavía. Las respuestas faltantes no suman. */
export function scoreAssessment(instrument: AssessmentInstrumentId, answers: ReadonlyArray<number | null>): AssessmentScore {
  const def = ASSESSMENTS[instrument]
  const total = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)

  let severity: AssessmentSeverityId = def.bands[0].severity
  for (const band of def.bands) {
    if (total >= band.min) severity = band.severity
  }

  const riskAnswer = def.riskItemIndex !== null ? answers[def.riskItemIndex] : null

  return {
    complete: answers.length === def.items.length && answers.every(a => a !== null),
    total,
    severity,
    riskFlag: riskAnswer != null && riskAnswer > 0,
  }
}
