import { describe, it, expect } from 'vitest'
import { getNicheConfig, isPetNiche, isVetNiche, isDentalNiche, isClinicalNiche, isPatientNiche, getNiche, resolveFeatures, resolveTerminology, creatableIds } from './index'

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
  { nicheType: 'odontologia', isPet: false, isVet: false, hasClientProfile: true },
  { nicheType: 'psicologia', isPet: false, isVet: false, hasClientProfile: true },
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

describe('resolveTerminology()', () => {
  it('falls through DEFAULT_TERMINOLOGY for a niche with no overrides', () => {
    const resolved = resolveTerminology('salon', undefined)
    expect(resolved.client).toBe('Cliente')
    expect(resolved.appointment).toBe('Cita')
  })

  it("applies odontologia's terminologyDefaults without touching other niches", () => {
    const dental = resolveTerminology('odontologia', undefined)
    expect(dental.client).toBe('Paciente')
    expect(dental.clientPlural).toBe('Pacientes')
    expect(dental.appointment).toBe('Consulta')
    expect(dental.appointmentPlural).toBe('Consultas')
    expect(dental.service).toBe('Tratamiento')
    expect(dental.servicePlural).toBe('Tratamientos')
    expect(dental.employee).toBe('Odontólogo')
    expect(dental.employeePlural).toBe('Odontólogos')

    expect(resolveTerminology('salon', undefined).client).toBe('Cliente')
  })

  it('lets a stored (DB) value override the niche default', () => {
    const resolved = resolveTerminology('odontologia', { client: 'Cliente' })
    expect(resolved.client).toBe('Cliente')
    expect(resolved.clientPlural).toBe('Clientes')
  })

  it('derives a custom plural unless the business stores one explicitly', () => {
    expect(resolveTerminology('odontologia', { client: 'Usuario' }).clientPlural).toBe('Usuarios')
    expect(resolveTerminology('odontologia', { client: 'Usuario', clientPlural: 'Personas' }).clientPlural).toBe('Personas')
  })
})

describe('isDentalNiche()', () => {
  it('is true only for odontologia', () => {
    expect(isDentalNiche('odontologia')).toBe(true)
    for (const id of creatableIds().filter(id => id !== 'odontologia')) {
      expect(isDentalNiche(id)).toBe(false)
    }
    expect(isDentalNiche(undefined)).toBe(false)
    expect(isDentalNiche(null)).toBe(false)
  })

  it('has the dental.odontogram capability', () => {
    expect(getNiche('odontologia').capabilities).toContain('dental.odontogram')
  })
})

describe('psicologia niche', () => {
  const CLINICAL = ['clinical.intake', 'clinical.session_notes', 'clinical.treatment_plan', 'clinical.consent', 'clinical.assessments', 'clinical.reports', 'clinical.followup', 'clinical.audit', 'clinical.cases', 'clinical.attachments', 'clinical.diagrams', 'clinical.programs']

  it('declares the whole clinical.* module and nothing from dental/staffing', () => {
    expect([...getNiche('psicologia').capabilities]).toEqual(CLINICAL)
  })

  it('is the only niche with clinical.* capabilities', () => {
    for (const id of creatableIds().filter(id => id !== 'psicologia')) {
      expect(isClinicalNiche(id)).toBe(false)
    }
    expect(isClinicalNiche('psicologia')).toBe(true)
    expect(isClinicalNiche(undefined)).toBe(false)
    expect(isClinicalNiche(null)).toBe(false)
    expect(isClinicalNiche('Negocios')).toBe(false)
  })

  it('is not mistaken for odontologia, and odontologia is not mistaken for it', () => {
    expect(isDentalNiche('psicologia')).toBe(false)
    expect(isClinicalNiche('odontologia')).toBe(false)
    expect(getNiche('odontologia').capabilities.some(c => c.startsWith('clinical.'))).toBe(false)
    expect(getNiche('psicologia').capabilities.some(c => c.startsWith('dental.'))).toBe(false)
  })

  it('uses patient/session terminology without leaking into other niches', () => {
    const t = resolveTerminology('psicologia', undefined)
    expect(t.client).toBe('Paciente')
    expect(t.appointmentPlural).toBe('Sesiones')
    expect(t.employee).toBe('Psicólogo')
    expect(resolveTerminology('salon', undefined).appointment).toBe('Cita')
    expect(resolveTerminology('odontologia', undefined).appointment).toBe('Consulta')
  })

  it('turns off inventory/suppliers/gift cards by default but keeps pos and productos (the POS reads the catalog)', () => {
    const f = resolveFeatures('psicologia', undefined)
    expect(f.inventario).toBe(false)
    expect(f.proveedores).toBe(false)
    expect(f.gift_cards).toBe(false)
    expect(f.pos).toBe(true)
    expect(f.productos).toBe(true)
    expect(f.agenda).toBe(true)
  })

  it('lets a stored (superadmin) value re-enable a defaulted-off feature', () => {
    expect(resolveFeatures('psicologia', { inventario: true }).inventario).toBe(true)
  })
})

describe('isPatientNiche()', () => {
  it('is true for odontologia and psicologia only — the niches that treat people as pacientes', () => {
    expect(isPatientNiche('odontologia')).toBe(true)
    expect(isPatientNiche('psicologia')).toBe(true)
    for (const id of creatableIds().filter(id => id !== 'odontologia' && id !== 'psicologia')) {
      expect(isPatientNiche(id)).toBe(false)
    }
    expect(isPatientNiche(undefined)).toBe(false)
    expect(isPatientNiche(null)).toBe(false)
    expect(isPatientNiche('Negocios')).toBe(false)
  })

  it('both patient niches use the same patient terminology; the rest keep "Cliente"', () => {
    for (const id of ['odontologia', 'psicologia']) {
      const t = resolveTerminology(id, undefined)
      expect(t.client).toBe('Paciente')
      expect(t.clientPlural).toBe('Pacientes')
      expect(t.history).toBe('Historia clínica')
    }
    expect(resolveTerminology('salon', undefined).client).toBe('Cliente')
    expect(resolveTerminology('staffing', undefined).client).toBe('Cliente')
  })
})

describe('creatableIds()', () => {
  it('includes every niche offered in the superadmin selects today', () => {
    for (const id of ['salon', 'barberia', 'spa', 'mixto', 'dog_spa', 'nail_bar', 'centro_estetico', 'odontologia', 'psicologia', 'tienda', 'staffing']) {
      expect(creatableIds()).toContain(id)
    }
  })
})

describe('currencyMode', () => {
  // Staffing bills US clients in dollars and has no exchange rate to speak of. Every other
  // niche keeps the dual USD/VES display, so this must stay a single-niche opt-in.
  it('is single only for staffing', () => {
    expect(getNiche('staffing').currencyMode).toBe('single')

    for (const id of creatableIds().filter(id => id !== 'staffing')) {
      expect(getNiche(id).currencyMode).not.toBe('single')
    }
  })

  it('an unregistered niche is not single-currency', () => {
    expect(getNiche('Negocios').currencyMode).not.toBe('single')
  })
})
