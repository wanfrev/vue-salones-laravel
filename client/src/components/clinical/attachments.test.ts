import { describe, it, expect } from 'vitest'
import { ATTACHMENT_MAX_BYTES, extensionOf, fileError, formatSize, isImage, suggestTitle } from './attachments'

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
