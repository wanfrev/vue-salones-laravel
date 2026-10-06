import type { ClinicalCase, ClinicalCaseMember, ClinicalCaseType } from '../../types/database'

/**
 * Casos clínicos: pareja, familia o grupo en tratamiento conjunto (el paciente es el sistema).
 * Las reglas de integrantes replican las del servidor (App\Services\Clinical\CaseService) para
 * avisar en pantalla antes de enviar; el servidor es quien manda.
 */

export const CASE_TYPE_LABELS: Record<ClinicalCaseType, string> = {
  couple: 'Pareja',
  family: 'Familia',
  group: 'Grupo',
}

export const CASE_TYPE_HINTS: Record<ClinicalCaseType, string> = {
  couple: 'Exactamente 2 personas en terapia de pareja.',
  family: 'Dos o más integrantes de una familia.',
  group: 'Dos o más personas en terapia grupal.',
}

export const CASE_TYPES = Object.keys(CASE_TYPE_LABELS) as ClinicalCaseType[]

export const MIN_MEMBERS = 2
export const COUPLE_MEMBERS = 2

/** Texto de error si la selección no sirve para ese tipo de caso; null si es válida. */
export function caseMembersError(type: ClinicalCaseType, count: number): string | null {
  if (count < MIN_MEMBERS) return 'Un caso necesita al menos 2 integrantes.'
  if (type === 'couple' && count > COUPLE_MEMBERS) return 'Un caso de pareja tiene exactamente 2 integrantes; usa «Familia» o «Grupo» para más.'
  return null
}

export const ROLE_SUGGESTIONS: Record<ClinicalCaseType, string[]> = {
  couple: ['Pareja', 'Esposo(a)', 'Novio(a)'],
  family: ['Madre', 'Padre', 'Hijo(a)', 'Hermano(a)', 'Abuelo(a)', 'Paciente identificado'],
  group: ['Participante'],
}

export const activeMembers = (c: Pick<ClinicalCase, 'members'>): ClinicalCaseMember[] => c.members.filter(m => !m.left_on)

export const titularOf = (c: Pick<ClinicalCase, 'members'>): ClinicalCaseMember | undefined => activeMembers(c).find(m => m.is_primary)

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, ch => ch.toUpperCase())

/** "Ana, Beto y Carla" — nombres de pila de los integrantes activos, para listados y encabezados. */
export function memberNames(c: Pick<ClinicalCase, 'members'>, max = 4): string {
  const names = activeMembers(c).map(m => titleCase(m.client_name.trim().split(/\s+/)[0] ?? ''))
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  const list = shown.length <= 1 ? shown.join('') : `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}`
  return extra > 0 ? `${shown.join(', ')} y ${extra} más` : list
}

/** Nombre sugerido al crear el caso a partir de los pacientes elegidos (editable). */
export function suggestCaseName(type: ClinicalCaseType, patientNames: string[]): string {
  const first = patientNames.map(n => titleCase(n.trim().split(/\s+/)[0] ?? '')).filter(Boolean)
  if (first.length === 0) return ''
  if (type === 'couple') return first.length >= 2 ? `${first[0]} y ${first[1]}` : first[0]
  if (type === 'family') {
    const surname = titleCase(patientNames[0].trim().split(/\s+/).slice(-1)[0] ?? '')
    return surname ? `Familia ${surname}` : 'Familia'
  }
  return `Grupo de ${first[0]}`
}

// ── Menores de edad y tutor (datos guardados en el perfil del paciente, sin columnas nuevas) ──

export interface GuardianInfo {
  name: string
  document: string
  phone: string
  relationship: string
  /** El paciente/tutor autorizó entregar información al tutor. */
  shareInfo: boolean
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Lee los datos del tutor de `client.metadata` (campos de perfil del nicho psicología). */
export function guardianFromMetadata(metadata: Record<string, unknown> | null | undefined): GuardianInfo | null {
  const name = str(metadata?.guardian_name)
  const phone = str(metadata?.guardian_phone)
  const document = str(metadata?.guardian_document)
  if (!name && !phone && !document) return null
  return {
    name,
    document,
    phone,
    relationship: str(metadata?.guardian_relationship),
    shareInfo: str(metadata?.guardian_share_info) === 'si',
  }
}

/** Edad en años cumplidos a `today`; null si la fecha no es válida (YYYY-MM-DD). */
export function ageFromBirthday(birthday: string | null | undefined, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday ?? '')
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age -= 1
  return age >= 0 ? age : null
}

export const ADULT_AGE = 18

/** true solo si hay fecha de nacimiento válida y es menor de 18 (sin fecha no se asume nada). */
export function isMinor(birthday: string | null | undefined, today: Date = new Date()): boolean {
  const age = ageFromBirthday(birthday, today)
  return age !== null && age < ADULT_AGE
}
