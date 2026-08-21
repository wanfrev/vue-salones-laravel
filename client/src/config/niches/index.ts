export type { Capability, NicheConfig, NicheFieldConfig, NicheDefinition, NicheCopy } from './types'
export {
  HAIR_TYPE_OPTIONS, BEARD_STYLE_OPTIONS, FADE_OPTIONS, HAIR_LENGTH_OPTIONS,
  SKIN_TYPE_OPTIONS, MASSAGE_OPTIONS, PET_FIELDS, VET_EXTRA_FIELDS,
} from './fieldOptions'
export { NICHES, UNKNOWN_NICHE, getNiche, creatableNiches, creatableIds } from './registry'
export { resolveFeatures } from './resolve'

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

/** @deprecated kept for back-compat; prefer isPetNiche()/getNiche(x).capabilities */
export const PET_NICHE_TYPES = ['dog_spa', 'vet']

