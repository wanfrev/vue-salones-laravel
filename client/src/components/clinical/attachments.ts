import type { AttachmentCategory, ClinicalAttachment } from '../../types/database'

/** Mismos límites que el servidor (AttachmentService): se validan antes de subir para no gastar la subida. */
export const ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'doc', 'docx'] as const
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map(e => `.${e}`).join(',')

export const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  test_result: 'Resultado de prueba',
  external_report: 'Informe externo',
  medical_exam: 'Examen médico',
  school: 'Documento escolar',
  consent: 'Consentimiento',
  patient_material: 'Material del paciente',
  other: 'Otro',
}

/** Orden en que se muestran las categorías (y se ofrecen al subir): lo clínico primero, «Otro» al final. */
export const CATEGORY_ORDER: AttachmentCategory[] = ['test_result', 'external_report', 'medical_exam', 'school', 'consent', 'patient_material', 'other']

export const CATEGORY_OPTIONS = CATEGORY_ORDER.map(value => ({ value, label: CATEGORY_LABELS[value] }))

export const CATEGORY_TONE: Record<AttachmentCategory, string> = {
  test_result: 'bg-primary/10 text-primary',
  external_report: 'bg-warning/10 text-warning',
  medical_exam: 'bg-danger/10 text-danger',
  school: 'bg-success/10 text-success',
  consent: 'bg-primary/10 text-primary',
  patient_material: 'bg-success/10 text-success',
  other: 'bg-bg-secondary text-text-secondary',
}

// ── Organización de la lista: fecha, búsqueda, filtro y grupos por categoría ──

type Organizable = Pick<ClinicalAttachment, 'category' | 'title' | 'original_name' | 'document_date' | 'created_at' | 'uploaded_by_name'>

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha con la que se ordena y se muestra: la del documento; si no se indicó, el día (local) en que se subió. */
export function attachmentDate(a: Pick<ClinicalAttachment, 'document_date' | 'created_at'>): string {
  if (a.document_date) return a.document_date
  const d = new Date(a.created_at)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Más reciente primero (por fecha del documento; a igual fecha, el subido más tarde). */
export function sortAttachments<T extends Organizable>(list: T[]): T[] {
  return [...list].sort((a, b) => attachmentDate(b).localeCompare(attachmentDate(a)) || b.created_at.localeCompare(a.created_at))
}

/** Cada palabra del texto debe aparecer en el título, el nombre del archivo, la categoría o quién lo subió (sin acentos ni mayúsculas). */
export function searchAttachments<T extends Organizable>(list: T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return list
  return list.filter(a => {
    const haystack = fold(`${a.title} ${a.original_name} ${CATEGORY_LABELS[a.category] ?? ''} ${a.uploaded_by_name ?? ''}`)
    return words.every(w => haystack.includes(w))
  })
}

export function categoryCounts(list: Array<Pick<ClinicalAttachment, 'category'>>): Record<AttachmentCategory, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map(c => [c, 0])) as Record<AttachmentCategory, number>
  for (const a of list) if (a.category in counts) counts[a.category]++
  return counts
}

export interface AttachmentGroup<T> {
  category: AttachmentCategory
  label: string
  items: T[]
}

/** Búsqueda + filtro de categoría + orden, y agrupado en el orden de CATEGORY_ORDER (solo grupos con archivos). */
export function organizeAttachments<T extends Organizable>(list: T[], opts: { category: AttachmentCategory | 'all'; query: string }): AttachmentGroup<T>[] {
  const found = sortAttachments(searchAttachments(list, opts.query).filter(a => opts.category === 'all' || a.category === opts.category))
  return CATEGORY_ORDER
    .map(category => ({ category, label: CATEGORY_LABELS[category], items: found.filter(a => a.category === category) }))
    .filter(g => g.items.length > 0)
}

/** 512 → "512 B", 2048 → "2 KB", 1.5 MB → "1,5 MB". */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} MB`
}

export const extensionOf = (name: string): string => {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

/** Texto de error si el archivo no se puede subir; null si cumple. */
export function fileError(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name)
  if (!(ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Formato no permitido. Usa: ${ATTACHMENT_EXTENSIONS.join(', ').toUpperCase()}.`
  }
  if (file.size <= 0) return 'El archivo está vacío.'
  if (file.size > ATTACHMENT_MAX_BYTES) return `El archivo supera el máximo de ${formatSize(ATTACHMENT_MAX_BYTES)}.`
  return null
}

export const isImage = (mime: string): boolean => mime.startsWith('image/')

/** Título sugerido a partir del nombre del archivo ("resultados_mmpi.pdf" → "resultados mmpi"). */
export function suggestTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base.charAt(0).toUpperCase() + base.slice(1)
}
