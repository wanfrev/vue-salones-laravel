import { describe, it, expect } from 'vitest'
import { auditRangeError, daysBetween, defaultAuditRange, describeResource, sinceLabel, AUDIT_ACTION_LABELS, AUDIT_ACTION_TONE, AUDIT_RESOURCE_LABELS } from './auditLabels'

describe('defaultAuditRange', () => {
  it('is the last 30 days ending today, in local calendar dates', () => {
    expect(defaultAuditRange(new Date(2026, 9, 5, 23, 59))).toEqual({ from: '2026-09-05', to: '2026-10-05' })
    expect(defaultAuditRange(new Date(2026, 0, 10))).toEqual({ from: '2025-12-11', to: '2026-01-10' })
  })
})

describe('daysBetween / auditRangeError', () => {
  it('counts calendar days across month boundaries and DST-free UTC math', () => {
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0)
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1)
    expect(daysBetween('2026-04-08', '2026-10-05')).toBe(180)
  })

  it('accepts up to 180 days and rejects 181, inverted or incomplete ranges — same limit as the server', () => {
    expect(auditRangeError('2026-04-08', '2026-10-05')).toBeNull()
    expect(auditRangeError('2026-04-07', '2026-10-05')).toContain('180')
    expect(auditRangeError('2026-10-05', '2026-09-01')).toContain('posterior')
    expect(auditRangeError('', '2026-09-01')).toContain('fechas')
  })
})

describe('describeResource', () => {
  it('names a report by its kind and tolerates an unknown one', () => {
    expect(describeResource({ resource: 'session_note', detail: null })).toBe('Notas de sesión')
    expect(describeResource({ resource: 'report', detail: 'referral' })).toBe('Informe — Carta de derivación')
    expect(describeResource({ resource: 'report', detail: 'otro' })).toBe('Informe — otro')
    expect(describeResource({ resource: 'report', detail: null })).toBe('Informe')
    expect(describeResource({ resource: 'diagram', detail: 'genogram' })).toBe('Diagrama — Genograma')
    expect(describeResource({ resource: 'attachment', detail: 'test_result' })).toBe('Adjunto — Resultado de prueba')
    expect(describeResource({ resource: 'case', detail: 'member_added' })).toBe('Caso — integrante agregado')
    expect(describeResource({ resource: 'session_note', detail: 'joint' })).toBe('Notas de sesión (conjuntas)')
  })
})

describe('labels', () => {
  it('cover every action and resource the server can log', () => {
    for (const a of ['viewed', 'created', 'updated', 'report_printed', 'downloaded', 'deleted'] as const) {
      expect(AUDIT_ACTION_LABELS[a]).toBeTruthy()
      expect(AUDIT_ACTION_TONE[a]).toBeTruthy()
    }
    for (const r of ['intake', 'session_note', 'treatment_plan', 'consent', 'assessment', 'report', 'case', 'attachment', 'diagram'] as const) {
      expect(AUDIT_RESOURCE_LABELS[r]).toBeTruthy()
    }
  })
})

describe('sinceLabel', () => {
  it.each([[0, 'hoy'], [1, 'ayer'], [5, 'hace 5 días'], [14, 'hace 2 semanas'], [30, 'hace 4 semanas'], [59, 'hace 8 semanas'], [60, 'hace 2 meses'], [200, 'hace 7 meses']])('%i días → %s', (days, text) => {
    expect(sinceLabel(days)).toBe(text)
  })
})
