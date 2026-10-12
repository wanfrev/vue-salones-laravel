import {
  componentCounts, componentIndexOf, defaultSlots, expiryDate, fitsValidity, hasDuplicateStarts, programServices, programTotal, progressLabel,
  proposeSchedule, scheduleProblem, specialistForService, toUtcIso,
} from './programs'

const svc = (id: string, name: string) => ({ id, name, duration_minutes: 50 })

// Programa mixto de dos especialidades, cada una con su especialista (la segunda admite varios servicios).
const MIXTO = {
  components: [
    { service_ids: ['len'], quantity: 3, employee_id: 'dra-soto', employee_name: 'Dra. Soto', services: [svc('len', 'Lenguaje')] },
    { service_ids: ['psi', 'aba'], quantity: 2, employee_id: 'lic-rojas', employee_name: 'Lic. Rojas', services: [svc('psi', 'Psicopedagogía'), svc('aba', 'ABA')] },
    { service_ids: ['ase'], quantity: 1, employee_id: null, employee_name: null, services: [svc('ase', 'Asesoría')] },
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

describe('proposeSchedule — una hora distinta por día', () => {
  it('uses each weekday own time (the child comes Monday at 4 and Thursday at 5:30)', () => {
    expect(proposeSchedule({ count: 4, startDate: '2026-10-08', time: '16:00', weekdays: [1, 4], times: { 1: '16:00', 4: '17:30' } })).toEqual([
      '2026-10-08T17:30', '2026-10-12T16:00', '2026-10-15T17:30', '2026-10-19T16:00',
    ])
  })

  it('a weekday without its own time falls back to the default one', () => {
    expect(proposeSchedule({ count: 2, startDate: '2026-10-08', time: '09:00', weekdays: [1, 4], times: { 4: '11:00' } })).toEqual(['2026-10-08T11:00', '2026-10-12T09:00'])
  })

  it('an invalid time on a chosen day gives nothing; on a day not chosen it is ignored', () => {
    expect(proposeSchedule({ count: 2, startDate: '2026-10-08', time: '16:00', weekdays: [1, 4], times: { 4: 'tarde' } })).toEqual([])
    expect(proposeSchedule({ count: 2, startDate: '2026-10-08', time: '16:00', weekdays: [1, 4], times: { 3: 'tarde' } })).toHaveLength(2)
  })
})

describe('program composition', () => {
  it('adds up the sessions of every specialty', () => {
    expect(programTotal(MIXTO.components)).toBe(6)
    expect(programTotal([])).toBe(0)
  })

  it('alternates the specialties (A, B, A, B...) while each has sessions left, with its specialist', () => {
    const slots = defaultSlots(MIXTO)
    expect(slots).toHaveLength(6)
    expect(slots.map(s => s.serviceId)).toEqual(['len', 'psi', 'ase', 'len', 'psi', 'len'])
    expect(slots.map(s => s.employeeId)).toEqual(['dra-soto', 'lic-rojas', null, 'dra-soto', 'lic-rojas', 'dra-soto'])
  })

  it('a program of one specialty is just its sessions in a row', () => {
    const slots = defaultSlots({ components: [MIXTO.components[0]] })
    expect(slots.map(s => s.serviceId)).toEqual(['len', 'len', 'len'])
  })

  it('lists every service of the program once, in order, with its name', () => {
    expect(programServices(MIXTO)).toEqual([
      { id: 'len', name: 'Lenguaje' }, { id: 'psi', name: 'Psicopedagogía' }, { id: 'aba', name: 'ABA' }, { id: 'ase', name: 'Asesoría' },
    ])
  })

  it('finds the specialty and the specialist of a service', () => {
    expect(componentIndexOf(MIXTO, 'aba')).toBe(1)
    expect(componentIndexOf(MIXTO, 'otro')).toBe(-1)
    expect(specialistForService(MIXTO, 'aba')).toBe('lic-rojas')
    expect(specialistForService(MIXTO, 'ase')).toBeNull()
    expect(specialistForService(MIXTO, 'otro')).toBeNull()
  })

  it('counts the sessions of each specialty against what the program includes', () => {
    const counts = componentCounts(MIXTO, [{ serviceId: 'len' }, { serviceId: 'len' }, { serviceId: 'aba' }, { serviceId: 'psi' }, { serviceId: 'psi' }, { serviceId: 'ase' }])
    expect(counts.map(c => [c.label, c.used, c.quantity])).toEqual([['Lenguaje', 2, 3], ['Psicopedagogía / ABA', 3, 2], ['Asesoría', 1, 1]])
  })

  it('writes progress as "3 de 8"', () => {
    expect(progressLabel(3, 8)).toBe('3 de 8')
  })
})

describe('scheduleProblem / hasDuplicateStarts / toUtcIso', () => {
  const rows = (starts: string[]) => starts.map(start => ({ start, serviceId: 'len', employeeId: 'dra-soto' }))

  it('is ready when the count, dates, services and validity are right', () => {
    expect(scheduleProblem(rows(['2026-10-08T16:00', '2026-10-12T16:00']), 2, 30)).toBeNull()
  })

  it('names the first problem', () => {
    expect(scheduleProblem(rows(['2026-10-08T16:00']), 2, 30)).toContain('2 sesiones')
    expect(scheduleProblem(rows(['2026-10-08T16:00', '']), 2, 30)).toContain('fecha u hora')
    expect(scheduleProblem([{ start: '2026-10-08T16:00', serviceId: '', employeeId: 'x' }], 1, 30)).toContain('especialidad')
    expect(scheduleProblem([{ start: '2026-10-08T16:00', serviceId: 'len', employeeId: '' }], 1, 30)).toContain('especialista')
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
