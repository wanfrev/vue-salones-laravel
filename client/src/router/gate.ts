import type { FeatureKey } from '../config/features'
import type { Capability } from '../config/niches'
import type { AuthProfile } from '../types/auth'

/**
 * Replaces the four one-off boolean/string fields that used to live separately on
 * SidebarLink (requiresFeature, requiresPetNiche, hideIfAgendaDisabled,
 * requireCanAccessConsultorio) and, ad-hoc, in router/index.ts's beforeEach — one shape,
 * one evaluator, consumed by both the sidebar and the router guard.
 *
 * `permission` is a documented extension point for per-employee module permissions
 * (tienda niche: can_access_inventory/pos/suppliers) — not implemented yet, no registry
 * exists to check it against, so it is intentionally inert until that lands.
 */
export interface RouteGate {
  feature?: FeatureKey
  capability?: Capability
  /** Inverse of `capability` — hides the link/route for niches that DO declare it. Used for
   *  generic modules (Clientes) that a niche with its own dedicated equivalent shouldn't show. */
  hideIfCapability?: Capability
  /** Profile boolean flag, positive polarity, default-true-unless-explicitly-false (matches
   *  every existing can_* column in this codebase — see AuthProfile). */
  profileFlag?: keyof AuthProfile
  hideIfAgendaDisabled?: boolean
  /** @deprecated placeholder — no permission registry exists yet (see Fase 1.5 of the niches plan) */
  permission?: string
}

export interface GateContext {
  profile: AuthProfile | null
  hasFeature: (key: FeatureKey) => boolean
  hasCapability: (capability: Capability) => boolean
}

export function evaluateGate(gate: RouteGate | undefined, ctx: GateContext): boolean {
  if (!gate) return true
  if (gate.feature && !ctx.hasFeature(gate.feature)) return false
  if (gate.capability && !ctx.hasCapability(gate.capability)) return false
  if (gate.hideIfCapability && ctx.hasCapability(gate.hideIfCapability)) return false
  if (gate.profileFlag && (ctx.profile as any)?.[gate.profileFlag] === false) return false
  if (gate.hideIfAgendaDisabled && ctx.profile?.disable_agenda) return false
  return true
}
