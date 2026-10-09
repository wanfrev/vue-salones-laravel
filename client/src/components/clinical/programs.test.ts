import { describe, it, expect } from 'vitest'
import {
  allowedServicesForSlot, defaultSlotServices, expiryDate, fitsValidity, hasDuplicateStarts, programTotal, progressLabel, proposeSchedule,
  scheduleProblem, toUtcIso,
} from './programs'

const MIXTO = {
  components: [
    { service_ids: ['len', 'psi', 'aba'], quantity: 12, services: [] },
    { service_ids: ['ase'], quantity: 1, services: [] },
  ],
}

describe('proposeSchedule', () => {
  // 8 de octubre de 2026 es jueves.
  it('lists only the chosen weekdays at the same time, starting on the start date when it matches', () => {
    expect(proposeSchedule({ count: 4, startDate: '2026-10-08', time: '16:00', weekdays: [1, 4] })).toEqual([
      '2026-10-08T16:00', '2026-10-12T16:00', '2026-10-15T16:00', '2026-10-19T16:00',
    ])
  })

  it('starts on the first matching day after the start date', () => {
    expect(proposeSchedule({ count: 2, startDate: '2026-10-09', time: '09:30', weekdays: [1] })).toEqual(['2026-10-12T09:30', '2026-10-19T09:30'])
  })

  it('crosses month and year boundaries', () => {
    expect(proposeSchedule({ count: 3, startDate: '2026-12-28', time: '10:00', weekdays: [1, 4] })).toEqual(['2026-12-28T10:00', '2026-12-31T10:00', '2027-01-04T10:00'])
  })

  it('gives nothing for no weekdays, a bad date, a bad time or a count below 1', () => {
    const ok = { count: 3, startDate: '2026-10-08', time: '16:00', weekdays: [1] }
    expect(proposeSchedule({ ...ok, weekdays: [] })).toEqual([])
    expect(proposeSchedule({ ...ok, startDate: '' })).toEqual([])
    expect(proposeSchedule({ ...ok, startDate: '2026-13-45' })).toEqual([])
    expect(proposeSchedule({ ...ok, time: '' })).toEqual([])
    expect(proposeSchedule({ ...ok, count: 0 })).toEqual([])
  })

  it('fits the biggest program (60 sessions) even with a single weekday', () => {
    expect(proposeSchedule({ count: 60, startDate: '2026-10-08', time: '16:00', weekdays: [0] })).toHaveLength(60)
  })
})

describe('validity', () => {
  it('8 sessions twice a week fit in 30 days; weekly ones do not', () => {
    const twiceAWeek = proposeSchedule({ count: 8, startDate: '2026-10-08', time: '16:00', weekdays: [1, 4] })
    const weekly = proposeSchedule({ count: 8, startDate: '2026-10-08', time: '16:00', weekdays: [4] })
    expect(fitsValidity(twiceAWeek, 30)).toBe(true)
    expect(fitsValidity(weekly, 30)).toBe(false)
  })

  it('the last session may fall exactly on the last day, not after', () => {
    expect(fitsValidity(['2026-10-01T10:00', '2026-10-31T10:00'], 30)).toBe(true)
    expect(fitsValidity(['2026-10-01T10:00', '2026-10-31T10:01'], 30)).toBe(false)
  })

  it('computes the expiry date from the first session', () => {
    expect(expiryDate('2026-10-08', 30)).toBe('2026-11-07')
    expect(expiryDate('2026-12-20', 30)).toBe('2027-01-19')
    expect(expiryDate('nope', 30)).toBe('')
  })
})

describe('program composition', () => {
  it('adds up the sessions of every component', () => {
    expect(programTotal(MIXTO.components)).toBe(13)
    expect(programTotal([])).toBe(0)
  })

  it('starts every slot with the first allowed service of its component, in program order', () => {
    const slots = defaultSlotServices(MIXTO)
    expect(slots).toHaveLength(13)
    expect(slots.slice(0, 12).every(s => s === 'len')).toBe(true)
    expect(slots[12]).toBe('ase')
  })

  it('offers each slot the services of its own component', () => {
    expect(allowedServicesForSlot(MIXTO, 0)).toEqual(['len', 'psi', 'aba'])
    expect(allowedServicesForSlot(MIXTO, 11)).toEqual(['len', 'psi', 'aba'])
    expect(allowedServicesForSlot(MIXTO, 12)).toEqual(['ase'])
    expect(allowedServicesForSlot(MIXTO, 13)).toEqual([])
  })

  it('writes progress as "3 de 8"', () => {
    expect(progressLabel(3, 8)).toBe('3 de 8')
  })
})

describe('scheduleProblem / hasDuplicateStarts / toUtcIso', () => {
  const rows = (starts: string[]) => starts.map(start => ({ start, serviceId: 'len' }))

  it('is ready when the count, dates, services and validity are right', () => {
    expect(scheduleProblem(rows(['2026-10-08T16:00', '2026-10-12T16:00']), 2, 30)).toBeNull()
  })

  it('names the first problem', () => {
    expect(scheduleProblem(rows(['2026-10-08T16:00']), 2, 30)).toContain('2 sesiones')
    expect(scheduleProblem(rows(['2026-10-08T16:00', '']), 2, 30)).toContain('fecha u hora')
    expect(scheduleProblem([{ start: '2026-10-08T16:00', serviceId: '' }], 1, 30)).toContain('servicio')
    expect(scheduleProblem(rows(['2026-10-01T10:00', '2026-12-01T10:00']), 2, 30)).toContain('30 días')
  })

  it('detects two sessions at the same moment', () => {
    expect(hasDuplicateStarts(rows(['2026-10-08T16:00', '2026-10-08T16:00']))).toBe(true)
    expect(hasDuplicateStarts(rows(['2026-10-08T16:00', '2026-10-08T17:00']))).toBe(false)
  })

  it('turns a local date-time into the same instant in UTC', () => {
    const local = '2026-10-08T16:00'
    const iso = toUtcIso(local)
    expect(iso.endsWith('Z')).toBe(true)
    expect(new Date(iso).getTime()).toBe(new Date(local).getTime())
  })
})
