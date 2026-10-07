import { describe, it, expect } from 'vitest'
import {
  attendanceDates, draftAttendance, draftPsychReport, draftReferral, joinList, longDateEs, type PsychReportData,
} from './reports'
import { emptyIntakeData } from './intakeDefaults'
import type { ClinicalAssessment, TreatmentPlan } from '../../types/database'

const ctx = { patientName: 'Ana Pérez', documentId: 'V-12.345.678', businessName: 'Consultorio Luz', professionalName: 'Lic. María Rivas' }

describe('longDateEs / joinList', () => {
  it('formats a date in Spanish without depending on timezone', () => {
    expect(longDateEs('2026-10-05')).toBe('5 de octubre de 2026')
    expect(longDateEs(new Date(2026, 0, 31))).toBe('31 de enero de 2026')
  })

  it('joins lists the Spanish way', () => {
    expect(joinList([])).toBe('')
    expect(joinList(['a'])).toBe('a')
    expect(joinList(['a', 'b'])).toBe('a y b')
    expect(joinList(['a', 'b', 'c'])).toBe('a, b y c')
  })
})

describe('attendanceDates', () => {
  it('collapses several sessions on one day, drops nulls and sorts ascending', () => {
    const iso = (s: string) => s.slice(0, 10)
    expect(attendanceDates(['2026-09-16T09:00:00Z', null, '2026-09-02T09:00:00Z', '2026-09-16T17:00:00Z'], iso)).toEqual(['2026-09-02', '2026-09-16'])
  })
})

describe('draftAttendance', () => {
  const range = { from: '2026-09-01', to: '2026-10-01' }

  it('lists every attended date and states the confidentiality of the content', () => {
    const text = draftAttendance(ctx, ['2026-09-02', '2026-09-16', '2026-10-01'], range)
    expect(text).toContain('Lic. María Rivas')
    expect(text).toContain('Ana Pérez, titular de la cédula/documento V-12.345.678')
    expect(text).toContain('asistió a 3 sesiones')
    expect(text).toContain('02/09/2026, 16/09/2026 y 01/10/2026')
    expect(text).toContain('confidencial')
  })

  it('uses the singular for one session and omits the document when there is none', () => {
    const text = draftAttendance({ ...ctx, documentId: undefined }, ['2026-09-02'], range)
    expect(text).toContain('asistió a 1 sesión de')
    expect(text).not.toContain('cédula')
  })

  it('says so honestly when there were no sessions in the period instead of inventing one', () => {
    const text = draftAttendance(ctx, [], range)
    expect(text).toContain('no se registran sesiones')
    expect(text).toContain('1 de septiembre de 2026')
    expect(text).toContain('1 de octubre de 2026')
  })
})

describe('draftPsychReport / draftReferral', () => {
  const intake = emptyIntakeData()
  intake.consulta.motivo = 'Ansiedad y dificultad para dormir'
  intake.consulta.historia_problema = 'Cuadro de 6 meses de evolución'
  intake.impresion = { hipotesis: 'Cuadro ansioso reactivo', diagnostico: 'Trastorno de ansiedad generalizada', codigo_cie10: 'F41.1' }
  intake.antecedentes.medicacion_actual = 'Sertralina 50 mg'

  const phq9 = { instrument: 'phq9', total_score: 12, severity: 'moderate', assessed_at: '2026-09-20T10:00:00Z' } as ClinicalAssessment
  const plan = { data: { approach: 'Cognitivo-conductual (TCC)', frequency: 'Semanal', goals: [{ id: '1', text: 'Dormir 7 horas', status: 'pending' }], formulation: '', notes: '' } } as unknown as TreatmentPlan
  const data: PsychReportData = {
    intake, plan, sessionCount: 8, firstSessionDate: '2026-08-01', lastSessionDate: '2026-09-26', latestAssessments: { phq9 },
  }
  const all = { includeDiagnosis: true, includePlan: true, includeScores: true, includeMedication: true }
  const none = { includeDiagnosis: false, includePlan: false, includeScores: false, includeMedication: false }

  it('includes every section the professional opted into', () => {
    const t = draftPsychReport(ctx, data, all)
    expect(t).toContain('Ansiedad y dificultad para dormir')
    expect(t).toContain('8 sesiones, desde el 1 de agosto de 2026 hasta el 26 de septiembre de 2026')
    expect(t).toContain('Trastorno de ansiedad generalizada (F41.1)')
    expect(t).toContain('PHQ-9: 12/27 (moderada, aplicado el 20/09/2026)')
    expect(t).toContain('Enfoque terapéutico: Cognitivo-conductual (TCC)')
    expect(t).toContain('- Dormir 7 horas')
    expect(t).toContain('Sertralina 50 mg')
  })

  it('leaves out sensitive sections the professional did not opt into', () => {
    const t = draftPsychReport(ctx, data, none)
    expect(t).toContain('Ansiedad y dificultad para dormir')
    for (const hidden of ['Trastorno de ansiedad', 'F41.1', 'PHQ-9', 'Cognitivo', 'Dormir 7 horas', 'Sertralina']) {
      expect(t).not.toContain(hidden)
    }
  })

  it('never includes private session-note content or risk assessment — they are not part of the data it receives', () => {
    intake.riesgo.observaciones = 'detalle de riesgo muy sensible'
    intake.antecedentes.familiares = 'antecedente familiar privado'
    const t = draftPsychReport(ctx, data, all)
    expect(t).not.toContain('detalle de riesgo muy sensible')
    expect(t).not.toContain('antecedente familiar privado')
  })

  it('handles a patient with nothing recorded yet', () => {
    const t = draftPsychReport(ctx, { ...data, intake: emptyIntakeData(), plan: null, sessionCount: 0, latestAssessments: {} }, all)
    expect(t).toContain('Aún no se registran sesiones')
    expect(t).not.toContain('MOTIVO DE CONSULTA')
    expect(t).not.toContain('undefined')
  })

  it('builds a referral addressed to the recipient with the reason first', () => {
    const t = draftReferral(ctx, data, 'Dr. Luis Mora (Psiquiatría)', 'Valorar inicio de tratamiento farmacológico', { includeDiagnosis: true, includeMedication: true })
    expect(t.startsWith('Estimado(a) Dr. Luis Mora (Psiquiatría):')).toBe(true)
    expect(t).toContain('MOTIVO DE LA DERIVACIÓN\nValorar inicio de tratamiento farmacológico')
    expect(t).toContain('Cuadro de 6 meses de evolución')
    expect(t).toContain('Sertralina 50 mg')
  })

  it('falls back to a generic greeting and to the intake reason when none is typed', () => {
    const t = draftReferral(ctx, data, '  ', '', { includeDiagnosis: false, includeMedication: false })
    expect(t.startsWith('Estimado(a) colega:')).toBe(true)
    expect(t).toContain('MOTIVO DE LA DERIVACIÓN\nAnsiedad y dificultad para dormir')
    expect(t).not.toContain('Sertralina')
  })
})

describe('menores de edad — el informe nombra al representante legal', () => {
  const base = { patientName: 'Luis Soto', documentId: undefined, businessName: 'Consultorio Luz', professionalName: 'Lic. María Rivas' }
  const data = { intake: emptyIntakeData(), plan: null, sessionCount: 3, latestAssessments: {} } as PsychReportData
  const opts = { includeDiagnosis: false, includePlan: false, includeScores: false, includeMedication: false }

  it('adds the guardian line only when a guardian is provided', async () => {
    const { guardianPhrase } = await import('./reports')
    const withGuardian = draftPsychReport({ ...base, guardian: { name: 'Ana Soto', relationship: 'Madre', document: 'V-12.345' } }, data, opts)
    expect(withGuardian).toContain('menor de edad')
    expect(withGuardian).toContain('representante legal, madre, Ana Soto (documento V-12.345)')

    expect(draftPsychReport(base, data, opts)).not.toContain('menor de edad')
    // El pie genérico del informe ya menciona al representante; lo que NO debe aparecer es la línea que lo nombra.
    expect(draftPsychReport({ ...base, guardian: null }, data, opts)).not.toContain('a solicitud de su representante legal,')

    expect(guardianPhrase({ name: 'Ana Soto', relationship: '', document: '' })).toBe('Ana Soto')
  })
})

describe('sesiones', () => {
  it('pluralizes without the accent', async () => {
    const { sesiones } = await import('./reports')
    expect(sesiones(1)).toBe('1 sesión')
    expect(sesiones(2)).toBe('2 sesiones')
    expect(sesiones(0)).toBe('0 sesiones')
  })
})
