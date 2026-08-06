import { describe, it, expect } from 'vitest'
import { getNicheConfig, isPetNiche, isVetNiche, getNiche, resolveFeatures, creatableIds } from './index'

// Equivalence table against the pre-registry behaviour of nicheFields.ts:
//   isPetNiche(x)    === ['dog_spa','vet'].includes(x)
//   isVetNiche(x)    === (x === 'vet')
//   getNicheConfig(x) had entries only for salon/barberia/spa/dog_spa/mixto — everything
//     else (including 'vet', 'nail_bar', 'centro_estetico', and free-text niches like
//     'Negocios') returned null.
// This must hold byte-for-byte so the 8 existing call sites see zero behaviour change.
const CASES: Array<{
  nicheType: string | null | undefined
  isPet: boolean
  isVet: boolean
  hasClientProfile: boolean
}> = [
  { nicheType: 'salon', isPet: false, isVet: false, hasClientProfile: true },
  { nicheType: 'barberia', isPet: false, isVet: false, hasClientProfile: true },
  { nicheType: 'spa', isPet: false, isVet: false, hasClientProfile: true },
  { nicheType: 'dog_spa', isPet: true, isVet: false, hasClientProfile: true },
  { nicheType: 'mixto', isPet: false, isVet: false, hasClientProfile: true },
  { nicheType: 'vet', isPet: true, isVet: true, hasClientProfile: false },
  { nicheType: 'nail_bar', isPet: false, isVet: false, hasClientProfile: false },
  { nicheType: 'centro_estetico', isPet: false, isVet: false, hasClientProfile: false },
  { nicheType: 'Negocios', isPet: false, isVet: false, hasClientProfile: false },
  { nicheType: '', isPet: false, isVet: false, hasClientProfile: false },
  { nicheType: undefined, isPet: false, isVet: false, hasClientProfile: false },
  { nicheType: null, isPet: false, isVet: false, hasClientProfile: false },
]

describe('niche registry equivalence with pre-registry nicheFields.ts', () => {
  for (const { nicheType, isPet, isVet, hasClientProfile } of CASES) {
    const label = JSON.stringify(nicheType)

    it(`isPetNiche(${label}) === ${isPet}`, () => {
      expect(isPetNiche(nicheType as string)).toBe(isPet)
    })

    it(`isVetNiche(${label}) === ${isVet}`, () => {
      expect(isVetNiche(nicheType as string)).toBe(isVet)
    })

    it(`getNicheConfig(${label}) is ${hasClientProfile ? 'non-null' : 'null'}`, () => {
      const config = getNicheConfig(nicheType as string)
      if (hasClientProfile) {
        expect(config).not.toBeNull()
      } else {
        expect(config).toBeNull()
      }
    })
  }
})

describe('getNiche()', () => {
  it('never throws and never returns null/undefined for unregistered or empty input', () => {
    for (const x of ['Negocios', 'totally-made-up', '', undefined, null]) {
      expect(getNiche(x as string)).toBeTruthy()
    }
  })

  it('resolves an unregistered niche to zero capabilities', () => {
    expect(getNiche('Negocios').capabilities).toEqual([])
  })
})

describe('resolveFeatures()', () => {
  it('falls through DEFAULT_FEATURES for a niche with no overrides, matching pre-registry business.ts behaviour', () => {
    const resolved = resolveFeatures('salon', undefined)
    expect(resolved.pos).toBe(true)
    expect(resolved.inventario).toBe(true)
    expect(resolved.multi_branch).toBe(false)
  })

  it('lets a stored (DB) value override the niche default', () => {
    const resolved = resolveFeatures('salon', { pos: false })
    expect(resolved.pos).toBe(false)
  })

  it('an unregistered/free-text niche resolves exactly to DEFAULT_FEATURES plus whatever is stored — zero backfill required', () => {
    const resolved = resolveFeatures('Negocios', { multi_branch: true })
    expect(resolved.pos).toBe(true) // DEFAULT_FEATURES.pos
    expect(resolved.multi_branch).toBe(true) // stored override
  })
})

describe('creatableIds()', () => {
  it('includes every niche offered in the superadmin selects today', () => {
    for (const id of ['salon', 'barberia', 'spa', 'mixto', 'dog_spa', 'nail_bar', 'centro_estetico', 'tienda', 'staffing']) {
      expect(creatableIds()).toContain(id)
    }
  })
})
