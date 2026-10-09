import { describe, it, expect } from 'vitest'
import {
  ATTACHMENT_MAX_BYTES, CATEGORY_ORDER, CATEGORY_LABELS, attachmentDate, categoryCounts, extensionOf, fileError, formatSize, isImage, organizeAttachments,
  searchAttachments, sortAttachments, suggestTitle,
} from './attachments'

describe('formatSize', () => {
  it.each([[0, '0 B'], [512, '512 B'], [1024, '1 KB'], [2048, '2 KB'], [1536 * 1024, '1,5 MB'], [10 * 1024 * 1024, '10 MB']])('%i bytes → %s', (bytes, text) => {
    expect(formatSize(bytes)).toBe(text)
  })
  it('does not break on nonsense', () => {
    expect(formatSize(-1)).toBe('—')
    expect(formatSize(NaN)).toBe('—')
  })
})

describe('fileError — mismos límites que el servidor', () => {
  it('accepts the allowed formats in any letter case', () => {
    for (const name of ['a.pdf', 'A.PDF', 'foto.JPG', 'x.png', 'x.webp', 'x.heic', 'informe.docx', 'viejo.doc']) {
      expect(fileError({ name, size: 100 })).toBeNull()
    }
  })

  it('rejects other formats, no extension and executables disguised by a second extension', () => {
    for (const name of ['virus.exe', 'script.php', 'notas.txt', 'sin_extension', 'archivo.pdf.exe', 'x.zip']) {
      expect(fileError({ name, size: 100 })).toContain('Formato no permitido')
    }
  })

  it('rejects empty and oversized files, accepting exactly the limit', () => {
    expect(fileError({ name: 'a.pdf', size: 0 })).toContain('vacío')
    expect(fileError({ name: 'a.pdf', size: ATTACHMENT_MAX_BYTES })).toBeNull()
    expect(fileError({ name: 'a.pdf', size: ATTACHMENT_MAX_BYTES + 1 })).toContain('10 MB')
  })
})

describe('helpers', () => {
  it('extensionOf / isImage / suggestTitle', () => {
    expect(extensionOf('Informe.Final.PDF')).toBe('pdf')
    expect(extensionOf('sin')).toBe('')
    expect(isImage('image/png')).toBe(true)
    expect(isImage('application/pdf')).toBe(false)
    expect(suggestTitle('resultados_mmpi-2.pdf')).toBe('Resultados mmpi 2')
    expect(suggestTitle('.pdf')).toBe('')
  })
})

// ── Organización de la lista ──

const file = (over: Record<string, unknown> = {}) => ({
  category: 'other' as const, title: 'Archivo', original_name: 'a.pdf', document_date: null as string | null, created_at: '2026-10-01T12:00:00Z', uploaded_by_name: null as string | null, ...over,
})

describe('categorías', () => {
  it('every category has a label and appears exactly once in the display order', () => {
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length)
    expect([...CATEGORY_ORDER].sort()).toEqual(Object.keys(CATEGORY_LABELS).sort())
  })

  it('counts per category, including the empty ones', () => {
    const counts = categoryCounts([file({ category: 'school' }), file({ category: 'school' }), file()])
    expect(counts.school).toBe(2)
    expect(counts.other).toBe(1)
    expect(counts.consent).toBe(0)
  })
})

describe('attachmentDate / sortAttachments', () => {
  it('uses the document date and falls back to the upload day', () => {
    expect(attachmentDate({ document_date: '2026-03-02', created_at: '2026-10-01T12:00:00Z' })).toBe('2026-03-02')
    expect(attachmentDate({ document_date: null, created_at: '2026-10-01T12:00:00Z' })).toBe('2026-10-01')
    expect(attachmentDate({ document_date: null, created_at: 'basura' })).toBe('')
  })

  it('sorts newest first by document date, then by upload time, without touching the original list', () => {
    const list = [
      file({ title: 'viejo', document_date: '2026-01-01' }),
      file({ title: 'nuevo', document_date: '2026-09-01' }),
      file({ title: 'mismo día, subido después', document_date: '2026-09-01', created_at: '2026-10-05T12:00:00Z' }),
    ]
    expect(sortAttachments(list).map(a => a.title)).toEqual(['mismo día, subido después', 'nuevo', 'viejo'])
    expect(list[0].title).toBe('viejo')
  })
})

describe('searchAttachments', () => {
  const list = [
    file({ title: 'Evaluación neuropsicológica', original_name: 'scan01.pdf', category: 'test_result', uploaded_by_name: 'Dra. Soto' }),
    file({ title: 'Boletín', original_name: 'boletin.pdf', category: 'school', uploaded_by_name: 'Luis' }),
  ]

  it('ignores case and accents and needs every word', () => {
    expect(searchAttachments(list, 'EVALUACION').map(a => a.title)).toEqual(['Evaluación neuropsicológica'])
    expect(searchAttachments(list, 'neuropsicologica soto')).toHaveLength(1)
    expect(searchAttachments(list, 'neuropsicologica luis')).toHaveLength(0)
  })

  it('also matches the file name, the category and the uploader', () => {
    expect(searchAttachments(list, 'scan01')).toHaveLength(1)
    expect(searchAttachments(list, 'escolar')).toHaveLength(1)
    expect(searchAttachments(list, 'luis')).toHaveLength(1)
  })

  it('an empty search returns everything', () => {
    expect(searchAttachments(list, '   ')).toHaveLength(2)
  })
})

describe('organizeAttachments', () => {
  const list = [
    file({ title: 'otro', category: 'other', document_date: '2026-09-01' }),
    file({ title: 'prueba vieja', category: 'test_result', document_date: '2026-01-01' }),
    file({ title: 'prueba nueva', category: 'test_result', document_date: '2026-09-01' }),
    file({ title: 'examen', category: 'medical_exam', document_date: '2026-05-01' }),
  ]

  it('groups in display order, newest first, skipping empty categories', () => {
    const groups = organizeAttachments(list, { category: 'all', query: '' })
    expect(groups.map(g => g.category)).toEqual(['test_result', 'medical_exam', 'other'])
    expect(groups[0].items.map(a => a.title)).toEqual(['prueba nueva', 'prueba vieja'])
    expect(groups[0].label).toBe('Resultado de prueba')
  })

  it('applies the category filter and the search together', () => {
    expect(organizeAttachments(list, { category: 'test_result', query: '' })).toHaveLength(1)
    expect(organizeAttachments(list, { category: 'test_result', query: 'nueva' })[0].items).toHaveLength(1)
    expect(organizeAttachments(list, { category: 'medical_exam', query: 'prueba' })).toEqual([])
  })
})
