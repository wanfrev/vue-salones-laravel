import type { Role } from '../constants/roles'
import { isAdminPanelRole, isEncargado, resolveHomeByRole } from '../constants/roles'
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
  /** Real 'cajero' role OR the synthetic encoding (empleado + disable_agenda + disable_inventory_edit). */
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
  const resolveHome = () => resolveHomeByRole(ctx.role ?? undefined, ctx.profile?.disable_agenda, ctx.hasFeature('agenda'), ctx.hasFeature('pos'), ctx.hasFeature('servicios'), ctx.hasCapability('staffing.timesheets'))

  if (ctx.loading) {
    if (to.meta.public) return undefined
    return '/'
  }

  if (to.meta.public && ctx.isAuthenticated) {
    return resolveHome()
  }

  if (to.meta.requiresAuth && !ctx.isAuthenticated) {
    return '/'
  }

  // Cajero is an allowlist role: /admin/pos is the only screen it may reach. This returns
  // before the adminOnly, /dashboard/* and meta.gate checks below, all three of which would
  // otherwise misroute it — the adminOnly branch reads can_access_pos, which the tienda
  // permissions migration defaults to false, so it would bounce /admin/pos to
  // resolveHomeByRole('cajero') === '/admin/pos', i.e. a redirect loop onto itself.
  //
  // Removing this block (planned once tienda employee permissions land) requires
  // backfilling can_access_pos = true for existing cajero profiles first, and is gated on
  // the 'cajero allowlist' cases in navigationGuard.test.ts staying green without it.
  if (ctx.isCajeroProfile) {
    return to.path === '/admin/pos' ? undefined : '/admin/pos'
  }

  if (to.meta.superadminOnly && ctx.role !== 'superadmin') {
    return resolveHome()
  }

  if (to.meta.adminOnly && !isAdminPanelRole(ctx.role ?? undefined)) {
    // Tienda employees can access specific admin routes if they have the permission
    const isPos = to.path === '/admin/pos' && ctx.profile?.can_access_pos
    const isInv = (to.path === '/admin/inventario' || to.path === '/admin/productos') && ctx.profile?.can_access_inventory
    const isSupp = to.path === '/admin/proveedores' && ctx.profile?.can_access_suppliers
    const isFinanzas = to.path.startsWith('/admin/finanzas') && ctx.profile?.can_access_finanzas
    const isReq = to.path === '/admin/requerimientos' && ctx.profile?.can_access_requirements
    if (!isPos && !isInv && !isSupp && !isFinanzas && !isReq) {
      return resolveHome()
    }
  }

  if (to.path.startsWith('/dashboard/') && isAdminPanelRole(ctx.role ?? undefined)) {
    // Encargados earn commissions/salary like empleados, so they can view their own report
    // (Comisiones/Recibo/Pagos) even though every other /dashboard/* route stays blocked for them.
    const isEncargadoReport = isEncargado(ctx.role ?? undefined) &&
      (to.path === '/dashboard/comisiones' || to.path === '/dashboard/recibo' || to.path === '/dashboard/pagos')
    if (!isEncargadoReport) {
      return resolveHome()
    }
  }

  // Replaces three previously-separate ad-hoc checks (disable_agenda hiding
  // agenda/calendario, consultorio's pet-niche + can_access_consultorio gate, and
  // /dashboard/clientes's employees_see_clients feature check) — each now expressed as
  // meta.gate on the corresponding route instead of a path-string match here.
  if (to.meta.gate && !evaluateGate(to.meta.gate, { profile: ctx.profile, hasFeature: ctx.hasFeature, hasCapability: ctx.hasCapability })) {
    return resolveHome()
  }

  return undefined
}
