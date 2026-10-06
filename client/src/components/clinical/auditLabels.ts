import type { ClinicalAuditAction, ClinicalAuditResource, ClinicalAuditRow, ClinicalReportKind } from '../../types/database'
import { REPORT_KIND_LABELS } from './reports'

export const AUDIT_ACTION_LABELS: Record<ClinicalAuditAction, string> = {
  viewed: 'Consultó',
  created: 'Creó',
  updated: 'Modificó',
  report_printed: 'Imprimió',
  downloaded: 'Descargó',
  deleted: 'Eliminó',
}

/** Consultar es rutina (neutro); crear/modificar deja huella (primario); imprimir saca información (alerta). */
export const AUDIT_ACTION_TONE: Record<ClinicalAuditAction, string> = {
  viewed: 'bg-bg-secondary text-text-secondary',
  created: 'bg-success/10 text-success',
  updated: 'bg-primary/10 text-primary',
  report_printed: 'bg-warning/10 text-warning',
  downloaded: 'bg-warning/10 text-warning',
  deleted: 'bg-danger/10 text-danger',
}

export const AUDIT_RESOURCE_LABELS: Record<ClinicalAuditResource, string> = {
  intake: 'Historia clínica',
  session_note: 'Notas de sesión',
  treatment_plan: 'Plan terapéutico',
  consent: 'Consentimientos',
  assessment: 'Evaluaciones',
  report: 'Informe',
  case: 'Caso',
  attachment: 'Adjunto',
  diagram: 'Diagrama',
}

export const AUDIT_ACTION_OPTIONS: Array<{ value: ClinicalAuditAction | ''; label: string }> = [
  { value: '', label: 'Todas las acciones' },
  { value: 'viewed', label: 'Consultas' },
  { value: 'created', label: 'Creaciones' },
  { value: 'updated', label: 'Modificaciones' },
  { value: 'report_printed', label: 'Impresiones de informes' },
  { value: 'downloaded', label: 'Descargas de adjuntos' },
  { value: 'deleted', label: 'Eliminaciones' },
]

/** Texto legible del complemento que el servidor anota (tipo de informe, categoría de archivo, tipo de diagrama...). */
const DETAIL_LABELS: Record<string, string> = {
  genogram: 'Genograma',
  life_line: 'Línea de vida',
  joint: 'conjuntas',
  member_added: 'integrante agregado',
  member_removed: 'integrante salió',
  appointment_linked: 'sesión vinculada',
  appointment_unlinked: 'sesión desvinculada',
  test_result: 'Resultado de prueba',
  external_report: 'Informe externo',
  patient_material: 'Material del paciente',
  other: 'Otro',
}

/** "Notas de sesión", "Informe — Carta de derivación", "Diagrama — Genograma", "Adjunto — Resultado de prueba"... */
export function describeResource(row: Pick<ClinicalAuditRow, 'resource' | 'detail'>): string {
  const base = AUDIT_RESOURCE_LABELS[row.resource] ?? row.resource
  if (!row.detail) return base
  const detail = row.resource === 'report'
    ? (REPORT_KIND_LABELS[row.detail as ClinicalReportKind] ?? row.detail)
    : (DETAIL_LABELS[row.detail] ?? row.detail)
  return row.detail === 'joint' ? `${base} (${detail})` : `${base} — ${detail}`
}

const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Rango por defecto de la bitácora: los últimos `days` días hasta hoy (fechas locales, no UTC). */
export function defaultAuditRange(today: Date = new Date(), days = 30): { from: string; to: string } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
  return { from: localIso(start), to: localIso(today) }
}

/** Días calendario entre dos fechas YYYY-MM-DD (0 si es el mismo día). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

/** Máximo que acepta el servidor — se valida también en pantalla para no mandar una consulta que va a fallar. */
export const MAX_AUDIT_RANGE_DAYS = 180

export function auditRangeError(from: string, to: string): string | null {
  if (!from || !to) return 'Indica las fechas desde y hasta.'
  const span = daysBetween(from, to)
  if (span < 0) return 'La fecha inicial no puede ser posterior a la final.'
  if (span > MAX_AUDIT_RANGE_DAYS) return `El rango máximo es de ${MAX_AUDIT_RANGE_DAYS} días.`
  return null
}

/** "hace 10 días" / "hace 8 semanas" / "hace 3 meses" — para listas de seguimiento. */
export function sinceLabel(days: number): string {
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 14) return `hace ${days} días`
  if (days < 60) return `hace ${Math.round(days / 7)} semanas`
  return `hace ${Math.round(days / 30)} meses`
}
