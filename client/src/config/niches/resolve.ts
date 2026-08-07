import { DEFAULT_FEATURES, type FeatureKey } from '../features'
import { getNiche } from './registry'

/**
 * Precedence, lowest to highest:
 *   DEFAULT_FEATURES  ->  niche.featureDefaults  ->  stored (DB, superadmin's choice)  ->  niche.featureLocks
 *
 * The niche supplies *defaults*, not a lock — superadmin can always override by writing
 * the key explicitly. featureLocks is reserved for structural impossibilities (e.g. a
 * niche with no product/service catalog cannot render a POS), and wins over everything.
 */
export function resolveFeatures(
  nicheType: string | null | undefined,
  stored: Partial<Record<FeatureKey, boolean>> | null | undefined,
): Record<FeatureKey, boolean> {
  const niche = getNiche(nicheType)
  return {
    ...DEFAULT_FEATURES,
    ...niche.featureDefaults,
    ...(stored ?? {}),
    ...(niche.featureLocks ?? {}),
  } as Record<FeatureKey, boolean>
}
