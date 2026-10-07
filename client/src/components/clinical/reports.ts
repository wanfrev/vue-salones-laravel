import type {
  AssessmentInstrumentId, ClinicalAssessment, ClinicalIntakeData, ClinicalReportKind, TreatmentPlan,
} from '../../types/database'
import { ASSESSMENTS, SEVERITY_LABELS } from './assessments'

/**
 * Borradores de los informes imprimibles. Todo es texto base que la persona edita antes de
 * imprimir: aquí solo se arma el punto de partida a partir de lo ya registrado en el expediente.
 * El documento NO se guarda — lo que queda registrado (en el servidor) es que se imprimió.
 */

export const REPORT_KIND_LABELS: Record<ClinicalReportKind, string> = {
  attendance: 'Constancia de asistencia',
  psych_report: 'Informe psicológico',
  referral: 'Carta de derivación',
}

export const REPORT_KIND_HINTS: Record<ClinicalReportKind, string> = {
  attendance: 'Certifica las sesiones a las que asistió el paciente en un período (trabajo, estudio, trámites).',
  psych_report: 'Resumen clínico para una empresa, colegio, seguro u otro profesional. Tú decides qué datos incluir.',
  referral: 'Carta para derivar al paciente a otro especialista (p. ej. psiquiatría) con el resumen del caso.',
}

export const REPORT_KINDS = Object.keys(REPORT_KIND_LABELS) as ClinicalReportKind[]

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "5 de octubre de 2026" — determinista (no depende del idioma/ICU del navegador). Acepta Date o YYYY-MM-DD. */
export function longDateEs(value: Date | string): string {
  const d = typeof value === 'string' ? parseIsoDate(value) : value
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`
}

/** YYYY-MM-DD → Date local a medianoche (sin pasar por UTC, que corre el día). */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const shortDate = (iso: string) => {
  const d = parseIsoDate(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** 1 → "1 sesión", 3 → "3 sesiones" (el plural de «sesión» pierde la tilde). */
export const sesiones = (n: number): string => `${n} ${n === 1 ? 'sesión' : 'sesiones'}`

/** ["a","b","c"] → "a, b y c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

export interface ReportContext {
  patientName: string
  documentId?: string
  businessName: string
  professionalName: string
  /** Solo si el paciente es menor de edad y hay tutor registrado: el documento se emite a su representante. */
  guardian?: { name: string; relationship: string; document: string } | null
}

/** "su madre, María Pérez (V-1)" — para nombrar al representante legal dentro de un informe. */
export function guardianPhrase(g: NonNullable<ReportContext['guardian']>): string {
  const rel = g.relationship ? `${g.relationship.toLowerCase()}, ` : ''
  return `${rel}${g.name}${g.document ? ` (documento ${g.document})` : ''}`
}

/** Fechas (YYYY-MM-DD) de las sesiones atendidas, ya ordenadas; se deduplican por día. */
export function attendanceDates(startTimes: ReadonlyArray<string | null>, toLocalIso: (iso: string) => string): string[] {
  const days = new Set<string>()
  for (const t of startTimes) if (t) days.add(toLocalIso(t))
  return [...days].sort()
}

export function draftAttendance(ctx: ReportContext, dates: string[], range: { from: string; to: string }): string {
  const who = ctx.documentId ? `${ctx.patientName}, titular de la cédula/documento ${ctx.documentId}` : ctx.patientName
  const where = ctx.businessName ? ` en ${ctx.businessName}` : ''

  if (dates.length === 0) {
    return `Quien suscribe, ${ctx.professionalName}, deja constancia de que no se registran sesiones de atención psicológica de ${who}${where} entre el ${longDateEs(range.from)} y el ${longDateEs(range.to)}.`
  }

  const sessions = `a ${sesiones(dates.length)}`
  return [
    `Quien suscribe, ${ctx.professionalName}, hace constar que ${who}, asistió ${sessions} de atención psicológica${where}, en las siguientes fechas:`,
    joinList(dates.map(shortDate)) + '.',
    'Se expide la presente constancia a solicitud del interesado, sin que implique información sobre el contenido de las sesiones, que es confidencial.',
  ].join('\n\n')
}

export interface PsychReportOptions {
  includeDiagnosis: boolean
  includePlan: boolean
  includeScores: boolean
  includeMedication: boolean
}

export interface PsychReportData {
  intake: ClinicalIntakeData
  plan: TreatmentPlan | null
  sessionCount: number
  firstSessionDate?: string
  lastSessionDate?: string
  latestAssessments: Partial<Record<AssessmentInstrumentId, ClinicalAssessment>>
}

const clean = (s: string | undefined | null) => (s ?? '').trim()

function scoresLine(latest: PsychReportData['latestAssessments']): string {
  const parts = (Object.keys(latest) as AssessmentInstrumentId[])
    .filter(id => latest[id])
    .map(id => {
      const a = latest[id]!
      return `${ASSESSMENTS[id].label}: ${a.total_score}/${ASSESSMENTS[id].maxScore} (${SEVERITY_LABELS[a.severity].toLowerCase()}, aplicado el ${shortDate(a.assessed_at)})`
    })
  return parts.join('; ')
}

export function draftPsychReport(ctx: ReportContext, data: PsychReportData, opts: PsychReportOptions): string {
  const { intake } = data
  const blocks: string[] = []

  blocks.push(`Quien suscribe, ${ctx.professionalName}, emite el presente informe psicológico correspondiente a ${ctx.patientName}${ctx.documentId ? `, documento ${ctx.documentId}` : ''}.`)
  if (ctx.guardian?.name) {
    blocks.push(`El paciente es menor de edad; el presente informe se emite a solicitud de su representante legal, ${guardianPhrase(ctx.guardian)}.`)
  }

  const motivo = clean(intake.consulta.motivo)
  if (motivo) blocks.push(`MOTIVO DE CONSULTA\n${motivo}`)

  const proceso = data.sessionCount > 0
    ? `El paciente ha asistido a ${sesiones(data.sessionCount)}` +
      (data.firstSessionDate ? `, desde el ${longDateEs(data.firstSessionDate)}` : '') +
      (data.lastSessionDate && data.lastSessionDate !== data.firstSessionDate ? ` hasta el ${longDateEs(data.lastSessionDate)}` : '') + '.'
    : 'Aún no se registran sesiones de seguimiento.'
  blocks.push(`PROCESO TERAPÉUTICO\n${proceso}`)

  if (opts.includeDiagnosis) {
    const dx = clean(intake.impresion.diagnostico)
    const code = clean(intake.impresion.codigo_cie10)
    const hyp = clean(intake.impresion.hipotesis)
    const lines = [dx && `Impresión diagnóstica: ${dx}${code ? ` (${code})` : ''}.`, hyp].filter(Boolean)
    if (lines.length) blocks.push(`IMPRESIÓN DIAGNÓSTICA\n${lines.join('\n')}`)
  }

  if (opts.includeScores) {
    const line = scoresLine(data.latestAssessments)
    if (line) blocks.push(`EVALUACIÓN PSICOMÉTRICA\n${line}.`)
  }

  if (opts.includePlan && data.plan) {
    const p = data.plan.data
    const goals = (p.goals ?? []).map(g => `- ${g.text}`)
    const lines = [
      p.approach && `Enfoque terapéutico: ${p.approach}.`,
      p.frequency && `Frecuencia: ${p.frequency}.`,
      goals.length ? `Objetivos:\n${goals.join('\n')}` : '',
    ].filter(Boolean)
    if (lines.length) blocks.push(`PLAN TERAPÉUTICO\n${lines.join('\n')}`)
  }

  if (opts.includeMedication) {
    const meds = clean(intake.antecedentes.medicacion_actual)
    if (meds) blocks.push(`MEDICACIÓN ACTUAL REFERIDA\n${meds}`)
  }

  blocks.push('RECOMENDACIONES\n')
  blocks.push('El presente informe es de carácter confidencial y se emite únicamente a solicitud del interesado o de su representante legal, para los fines que estime convenientes.')
  return blocks.join('\n\n')
}

export function draftReferral(
  ctx: ReportContext,
  data: PsychReportData,
  recipient: string,
  reason: string,
  opts: Pick<PsychReportOptions, 'includeDiagnosis' | 'includeMedication'>,
): string {
  const { intake } = data
  const blocks: string[] = []

  blocks.push(`Estimado(a) ${recipient.trim() || 'colega'}:`)
  blocks.push(`Por medio de la presente remito a ${ctx.patientName}${ctx.documentId ? ` (documento ${ctx.documentId})` : ''}, a quien atiendo en psicoterapia${data.sessionCount > 0 ? ` desde hace ${sesiones(data.sessionCount)}` : ''}, para su valoración y manejo.`)

  blocks.push(`MOTIVO DE LA DERIVACIÓN\n${clean(reason) || clean(intake.consulta.motivo) || '(especificar)'}`)

  const resumen = clean(intake.consulta.historia_problema)
  if (resumen) blocks.push(`RESUMEN DEL CASO\n${resumen}`)

  if (opts.includeDiagnosis) {
    const dx = clean(intake.impresion.diagnostico)
    if (dx) blocks.push(`IMPRESIÓN DIAGNÓSTICA\n${dx}${clean(intake.impresion.codigo_cie10) ? ` (${clean(intake.impresion.codigo_cie10)})` : ''}`)
  }

  if (opts.includeMedication) {
    const meds = clean(intake.antecedentes.medicacion_actual)
    if (meds) blocks.push(`MEDICACIÓN ACTUAL REFERIDA\n${meds}`)
  }

  blocks.push('Quedo atento(a) para coordinar el seguimiento conjunto del caso y a su disposición para ampliar cualquier información.')
  return blocks.join('\n\n')
}
