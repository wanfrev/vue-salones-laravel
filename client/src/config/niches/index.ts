export type { Capability, NicheConfig, NicheFieldConfig, NicheDefinition, NicheCopy } from './types'
export {
  HAIR_TYPE_OPTIONS, BEARD_STYLE_OPTIONS, FADE_OPTIONS, HAIR_LENGTH_OPTIONS,
  SKIN_TYPE_OPTIONS, MASSAGE_OPTIONS, PET_FIELDS, VET_EXTRA_FIELDS,
} from './fieldOptions'
export { NICHES, UNKNOWN_NICHE, getNiche, creatableNiches, creatableIds } from './registry'
export { resolveFeatures, resolveTerminology, DEFAULT_TERMINOLOGY } from './resolve'

import { getNiche } from './registry'

// ---- Back-compat surface (was previously implemented directly in nicheFields.ts) ----

export function getNicheConfig(nicheType: string) {
  return getNiche(nicheType).clientProfile
}

export function isPetNiche(nicheType: string): boolean {
  return getNiche(nicheType).capabilities.includes('clients.pets')
}

export function isVetNiche(nicheType: string): boolean {
  return getNiche(nicheType).capabilities.includes('clients.medical')
}

export function isTiendaNiche(nicheType?: string | null): boolean {
  return nicheType === 'tienda'
}

export function isStaffingNiche(nicheType?: string | null): boolean {
  return nicheType === 'staffing'
}

export function isDentalNiche(nicheType?: string | null): boolean {
  return nicheType === 'odontologia'
}

/**
 * True for a "pure" tienda business, and also for any other niche that's had the retail module
 * explicitly turned on for it (features.retail_module_enabled) — e.g. a spa business that also
 * sells retail products. Deliberately NOT based on features.pos/productos alone: those two
 * default to `true` for every niche (nav-visibility legacy default, see DEFAULT_FEATURES), so
 * they can't be used as a signal that a business actually wants tienda-style treatment — doing so
 * would silently flip this on for every existing non-tienda business that already has those two
 * default-true flags. Additive: a pure-tienda business is unaffected (isTiendaNiche already
 * true); a business that hasn't had the module explicitly enabled stays exactly as before.
 */
export function hasRetailModule(nicheType?: string | null, features?: Partial<Record<string, boolean>> | null): boolean {
  return isTiendaNiche(nicheType) || !!(features?.retail_module_enabled && features?.pos && features?.productos)
}

/** @deprecated kept for back-compat; prefer isPetNiche()/getNiche(x).capabilities */
export const PET_NICHE_TYPES = ['dog_spa', 'vet']

