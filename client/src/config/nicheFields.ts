/**
 * Back-compat shim. The niche registry (client/src/config/niches/) is now the source of
 * truth for per-niche client-profile fields, feature defaults and capabilities. This file
 * re-exports the same names that used to be implemented here directly, so existing imports
 * (`from '../../config/nicheFields'`) keep working unchanged.
 */
export type { NicheFieldConfig, NicheConfig } from './niches'
export { getNicheConfig, isPetNiche, isVetNiche, PET_NICHE_TYPES } from './niches'
