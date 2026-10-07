import { describe, it, expect } from 'vitest'
import { emptySessionNoteForm, formFromNote, isElevatedRisk, isSessionNoteSavable, payloadFromForm, todayISO } from './sessionNotes'
import type { SessionNote } from '../../types/database'

describe('todayISO', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:30 local on 5 Oct: toISOString() could already say the 6th in a UTC- zone.
    expect(todayISO(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
    expect(todayISO(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

describe('isSessionNoteSavable', () => {
  it('needs a date and at least one non-blank SOAP section', () => {
    const form = emptySessionNoteForm()
    expect(isSessionNoteSavable(form)).toBe(false)
    form.content.plan = '   '
    expect(isSessionNoteSavable(form)).toBe(false)
    form.content.plan = 'Reforzar técnica de respiración'
    expect(isSessionNoteSavable(form)).toBe(true)
    form.session_date = ''
    expect(isSessionNoteSavable(form)).toBe(false)
  })
})

describe('payloadFromForm', () => {
  it('trims text, maps blanks to null and numbers to integers', () => {
    const form = emptySessionNoteForm()
    form.session_date = '2026-10-05'
    form.duration_minutes = '45'
    form.mood_rating = ''
    form.content.subjective = '  Semana difícil  '
    form.tasks = '   '
    const payload = payloadFromForm(form)
    expect(payload.appointment_id).toBeNull()
    expect(payload.duration_minutes).toBe(45)
    expect(payload.mood_rating).toBeNull()
    expect(payload.content.subjective).toBe('Semana difícil')
    expect(payload.tasks).toBeNull()
  })
})

describe('formFromNote', () => {
  it('round-trips a saved note back into form strings', () => {
    const note = {
      appointment_id: 'a1', session_date: '2026-10-01', duration_minutes: 50, risk_level: 'low', mood_rating: 6,
      content: { subjective: 's', objective: 'o', assessment: 'a', plan: 'p' }, tasks: 'diario',
    } as SessionNote
    const form = formFromNote(note)
    expect(form.duration_minutes).toBe('50')
    expect(form.mood_rating).toBe('6')
    expect(payloadFromForm(form)).toEqual({
      appointment_id: 'a1', session_date: '2026-10-01', duration_minutes: 50, risk_level: 'low', mood_rating: 6,
      content: { subjective: 's', objective: 'o', assessment: 'a', plan: 'p' }, tasks: 'diario',
    })
  })
})

describe('isElevatedRisk', () => {
  it('is true from moderate upward only', () => {
    expect(isElevatedRisk('none')).toBe(false)
    expect(isElevatedRisk('low')).toBe(false)
    expect(isElevatedRisk('moderate')).toBe(true)
    expect(isElevatedRisk('high')).toBe(true)
    expect(isElevatedRisk(null)).toBe(false)
  })
})
