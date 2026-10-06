import type { AttachmentCategory } from '../../types/database'

/** Mismos límites que el servidor (AttachmentService): se validan antes de subir para no gastar la subida. */
export const ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'doc', 'docx'] as const
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map(e => `.${e}`).join(',')

export const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  test_result: 'Resultado de prueba',
  external_report: 'Informe externo',
  patient_material: 'Material del paciente',
  other: 'Otro',
}

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as AttachmentCategory[]).map(value => ({ value, label: CATEGORY_LABELS[value] }))

export const CATEGORY_TONE: Record<AttachmentCategory, string> = {
  test_result: 'bg-primary/10 text-primary',
  external_report: 'bg-warning/10 text-warning',
  patient_material: 'bg-success/10 text-success',
  other: 'bg-bg-secondary text-text-secondary',
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
