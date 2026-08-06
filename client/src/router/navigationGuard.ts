import type { Role } from '../constants/roles'
import { isAdminPanelRole, resolveHomeByRole } from '../constants/roles'
import type { AuthProfile } from '../types/auth'
import type { FeatureKey } from '../config/features'
import type { Capability } from '../config/niches'
import { evaluateGate, type RouteGate } from './gate'

export interface NavMeta {
  public?: boolean
  requiresAuth?: boolean
  superadminOnly?: boolean
  adminOnly?: boolean
  gate?: RouteGate
}

export interface NavTarget {
  path: string
  meta: NavMeta
}

export interface NavContext {
  loading: boolean
  isAuthenticated: boolean
  isCajeroProfile: boolean
  role: Role | null
  profile: AuthProfile | null
  hasFeature: (key: FeatureKey) => boolean
  hasCapability: (capability: Capability) => boolean
}

/**
 * Pure port of router/index.ts's beforeEach body (minus the authStore.initialize() side
 * effect, which the router wrapper awaits before calling this). Kept side-effect-free and
 * store-free specifically so it can be unit tested with plain objects — see
 * navigationGuard.test.ts, the safety net for every later router change (e.g. removing the
 * cajero early-return block once tienda-niche employee permissions land).
 *
 * Returns a redirect path, or undefined to allow navigation.
 */
export function resolveNavigation(to: NavTarget, ctx: NavContext): string | undefined {
  if (ctx.loading) {
    if (to.meta.public) return undefined
    return '/'
  }

  if (to.meta.public && ctx.isAuthenticated) {
    if (ctx.isCajeroProfile) return '/admin/pos'
    return resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda)
  }

  if (to.meta.requiresAuth && !ctx.isAuthenticated) {
    return '/'
  }

  if (to.meta.superadminOnly && ctx.role !== 'superadmin') {
    return resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda)
  }

  // ── CAJERO: solo puede acceder a /admin/pos ──
  if (ctx.isCajeroProfile) {
    if (to.path.startsWith('/dashboard/')) return '/admin/pos'
    if (to.meta.superadminOnly) return '/admin/pos'
    if (to.path.startsWith('/admin/') && to.path !== '/admin/pos') return '/admin/pos'
    return undefined
  }

  if (to.meta.adminOnly && !isAdminPanelRole(ctx.role ?? undefined)) {
    return resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda)
  }

  if (to.path.startsWith('/dashboard/') && isAdminPanelRole(ctx.role ?? undefined)) {
    return resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda)
  }

  // Replaces three previously-separate ad-hoc checks (disable_agenda hiding
  // agenda/calendario, consultorio's pet-niche + can_access_consultorio gate, and
  // /dashboard/clientes's employees_see_clients feature check) — each now expressed as
  // meta.gate on the corresponding route instead of a path-string match here.
  if (to.meta.gate && !evaluateGate(to.meta.gate, { profile: ctx.profile, hasFeature: ctx.hasFeature, hasCapability: ctx.hasCapability })) {
    return resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda)
  }

  return undefined
}
