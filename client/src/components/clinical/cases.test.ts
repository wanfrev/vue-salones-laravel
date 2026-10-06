import { describe, it, expect } from 'vitest'
import {
  activeMembers, ageFromBirthday, caseMembersError, guardianFromMetadata, isMinor, memberNames, suggestCaseName, titularOf,
} from './cases'
import type { ClinicalCaseMember } from '../../types/database'

const member = (name: string, over: Partial<ClinicalCaseMember> = {}): ClinicalCaseMember => ({
  client_id: name, client_name: name, phone: null, role: null, is_primary: false, joined_on: null, left_on: null, ...over,
})

describe('caseMembersError — mismas reglas que el servidor', () => {
  it.each([
    ['couple', 1, 'al menos 2'], ['couple', 3, 'exactamente 2'], ['family', 1, 'al menos 2'], ['group', 0, 'al menos 2'],
  ] as const)('%s con %i integrantes → error', (type, count, text) => {
    expect(caseMembersError(type, count)).toContain(text)
  })

  it.each([['couple', 2], ['family', 2], ['family', 9], ['group', 2], ['group', 30]] as const)('%s con %i integrantes es válido', (type, count) => {
    expect(caseMembersError(type, count)).toBeNull()
  })
})

describe('integrantes', () => {
  const c = { members: [member('ANA PÉREZ', { is_primary: true }), member('beto ruiz'), member('Carla', { left_on: '2026-09-01' })] }

  it('active members exclude those who left, and the titular is the active primary one', () => {
    expect(activeMembers(c).map(m => m.client_id)).toEqual(['ANA PÉREZ', 'beto ruiz'])
    expect(titularOf(c)?.client_id).toBe('ANA PÉREZ')
    expect(titularOf({ members: [member('x', { is_primary: true, left_on: '2026-01-01' })] })).toBeUndefined()
  })

  it('lists first names with proper capitalization, joined the Spanish way', () => {
    expect(memberNames(c)).toBe('Ana y Beto')
    expect(memberNames({ members: [member('uno'), member('dos'), member('tres')] })).toBe('Uno, Dos y Tres')
    expect(memberNames({ members: ['a', 'b', 'c', 'd', 'e', 'f'].map(n => member(n)) }, 3)).toBe('A, B, C y 3 más')
  })
})

describe('suggestCaseName', () => {
  it('builds a readable default per type and tolerates empty input', () => {
    expect(suggestCaseName('couple', ['ANA PÉREZ', 'beto ruiz'])).toBe('Ana y Beto')
    expect(suggestCaseName('family', ['Ana Pérez Soto', 'Beto'])).toBe('Familia Soto')
    expect(suggestCaseName('group', ['Ana Pérez'])).toBe('Grupo de Ana')
    expect(suggestCaseName('couple', [])).toBe('')
  })
})

describe('menores y tutor', () => {
  const today = new Date(2026, 9, 5) // 5 oct 2026

  it('computes age exactly around the birthday', () => {
    expect(ageFromBirthday('2008-10-05', today)).toBe(18)  // cumple hoy
    expect(ageFromBirthday('2008-10-06', today)).toBe(17)  // cumple mañana
    expect(ageFromBirthday('2008-12-31', today)).toBe(17)
    expect(ageFromBirthday('2026-10-05', today)).toBe(0)
  })

  it('rejects missing, malformed or future birthdays instead of guessing', () => {
    for (const bad of [undefined, null, '', 'abc', '05/10/2008', '2027-01-01']) expect(ageFromBirthday(bad, today)).toBeNull()
  })

  it('a minor is under 18 only when a valid birthday says so — never assumed without one', () => {
    expect(isMinor('2012-03-01', today)).toBe(true)
    expect(isMinor('2008-10-05', today)).toBe(false) // hoy cumple 18
    expect(isMinor('1990-01-01', today)).toBe(false)
    expect(isMinor(undefined, today)).toBe(false)
    expect(isMinor('', today)).toBe(false)
  })

  it('reads the guardian from client metadata and trims it', () => {
    expect(guardianFromMetadata({
      guardian_name: '  María Pérez ', guardian_phone: '0414-1', guardian_document: 'V-1', guardian_relationship: 'Madre', guardian_share_info: 'si',
    })).toEqual({ name: 'María Pérez', phone: '0414-1', document: 'V-1', relationship: 'Madre', shareInfo: true })
  })

  it('shareInfo is true ONLY for an explicit "si" — default is no', () => {
    expect(guardianFromMetadata({ guardian_name: 'M' })?.shareInfo).toBe(false)
    expect(guardianFromMetadata({ guardian_name: 'M', guardian_share_info: 'no' })?.shareInfo).toBe(false)
    expect(guardianFromMetadata({ guardian_name: 'M', guardian_share_info: true })?.shareInfo).toBe(false)
  })

  it('returns null when no guardian data exists (including non-string junk)', () => {
    expect(guardianFromMetadata(null)).toBeNull()
    expect(guardianFromMetadata({})).toBeNull()
    expect(guardianFromMetadata({ guardian_name: 42, guardian_phone: '   ' })).toBeNull()
  })
})
