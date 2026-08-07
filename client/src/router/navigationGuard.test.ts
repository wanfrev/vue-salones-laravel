import { describe, it, expect } from 'vitest'
import { resolveNavigation, type NavContext, type NavTarget } from './navigationGuard'
import type { AuthProfile } from '../types/auth'

function makeProfile(overrides: Partial<AuthProfile> = {}): AuthProfile {
  return {
    id: 'p1',
    business_id: 'b1',
    branch_id: null,
    full_name: 'Test',
    role: 'empleado',
    phone: null,
    avatar_url: null,
    ...overrides,
  }
}

function makeCtx(overrides: Partial<NavContext> = {}): NavContext {
  return {
    loading: false,
    isAuthenticated: true,
    isCajeroProfile: false as boolean,
    role: 'empleado',
    profile: makeProfile(),
    hasFeature: () => true,
    hasCapability: () => true,
    ...overrides,
  }
}

function target(path: string, meta: NavTarget['meta'] = {}): NavTarget {
  return { path, meta }
}

describe('resolveNavigation — loading', () => {
  it('allows a public route while auth is still loading', () => {
    expect(resolveNavigation(target('/', { public: true }), makeCtx({ loading: true }))).toBeUndefined()
  })

  it('sends everything else to / while auth is loading', () => {
    expect(resolveNavigation(target('/admin', { adminOnly: true }), makeCtx({ loading: true }))).toBe('/')
  })
})

describe('resolveNavigation — public routes', () => {
  it('lets an unauthenticated user reach a public route', () => {
    expect(resolveNavigation(target('/', { public: true }), makeCtx({ isAuthenticated: false }))).toBeUndefined()
  })

  it('bounces an authenticated non-cajero away from a public route to their role home', () => {
    const result = resolveNavigation(target('/', { public: true }), makeCtx({ role: 'admin' }))
    expect(result).toBe('/admin')
  })

  it('bounces an authenticated cajero away from a public route to /admin/pos', () => {
    const result = resolveNavigation(target('/', { public: true }), makeCtx({ isCajeroProfile: true, role: 'cajero' }))
    expect(result).toBe('/admin/pos')
  })
})

describe('resolveNavigation — requiresAuth', () => {
  it('redirects an unauthenticated user to / on a requiresAuth route', () => {
    expect(resolveNavigation(target('/dashboard/agenda', { requiresAuth: true }), makeCtx({ isAuthenticated: false }))).toBe('/')
  })

  it('allows an authenticated user through', () => {
    expect(resolveNavigation(target('/dashboard/agenda', { requiresAuth: true }), makeCtx())).toBeUndefined()
  })
})

describe('resolveNavigation — superadminOnly', () => {
  it('bounces a non-superadmin away', () => {
    const result = resolveNavigation(target('/superadmin', { superadminOnly: true }), makeCtx({ role: 'admin' }))
    expect(result).toBe('/admin')
  })

  it('allows a superadmin through', () => {
    expect(resolveNavigation(target('/superadmin', { superadminOnly: true }), makeCtx({ role: 'superadmin' }))).toBeUndefined()
  })
})

describe('resolveNavigation — cajero allowlist', () => {
  const cajeroCtx = makeCtx({ isCajeroProfile: true, role: 'cajero' })

  it('redirects any /dashboard/* route to /admin/pos', () => {
    expect(resolveNavigation(target('/dashboard/historial', { requiresAuth: true }), cajeroCtx)).toBe('/admin/pos')
  })

  it('redirects a superadminOnly route to /admin/pos instead of the normal role-home bounce', () => {
    expect(resolveNavigation(target('/superadmin', { superadminOnly: true }), cajeroCtx)).toBe('/admin/pos')
  })

  it('redirects any other /admin/* route to /admin/pos', () => {
    expect(resolveNavigation(target('/admin/inventario', { adminOnly: true }), cajeroCtx)).toBe('/admin/pos')
  })

  it('allows /admin/pos itself', () => {
    expect(resolveNavigation(target('/admin/pos', { adminOnly: true }), cajeroCtx)).toBeUndefined()
  })

  it('is not subject to the adminOnly role check at all (it returns before that branch)', () => {
    // A cajero role literal fails isAdminPanelRole, but the cajero block must intercept
    // /admin/pos before that check is ever reached.
    expect(resolveNavigation(target('/admin/pos', { adminOnly: true }), cajeroCtx)).toBeUndefined()
  })

  it('the synthetic cajero encoding (empleado + disable_agenda + disable_inventory_edit) behaves identically once isCajeroProfile is derived', () => {
    const syntheticCtx = makeCtx({
      isCajeroProfile: true,
      role: 'cajero',
      profile: makeProfile({ role: 'empleado', disable_agenda: true, disable_inventory_edit: true }),
    })
    expect(resolveNavigation(target('/dashboard/agenda', { requiresAuth: true }), syntheticCtx)).toBe('/admin/pos')
  })
})

describe('resolveNavigation — adminOnly', () => {
  it('bounces empleado away from an adminOnly route', () => {
    const result = resolveNavigation(target('/admin/inventario', { adminOnly: true }), makeCtx({ role: 'empleado' }))
    expect(result).toBe('/dashboard/agenda')
  })

  for (const role of ['admin', 'superadmin', 'encargado'] as const) {
    it(`allows ${role} through an adminOnly route`, () => {
      expect(resolveNavigation(target('/admin/inventario', { adminOnly: true }), makeCtx({ role }))).toBeUndefined()
    })
  }
})

describe('resolveNavigation — admin-panel roles bounced out of /dashboard/*', () => {
  for (const role of ['admin', 'superadmin', 'encargado'] as const) {
    it(`redirects ${role} away from /dashboard/* to their role home`, () => {
      const result = resolveNavigation(target('/dashboard/agenda', { requiresAuth: true }), makeCtx({ role }))
      expect(result).not.toBeUndefined()
      expect(result).not.toBe('/dashboard/agenda')
    })
  }

  it('allows empleado to stay on /dashboard/*', () => {
    expect(resolveNavigation(target('/dashboard/agenda', { requiresAuth: true }), makeCtx({ role: 'empleado' }))).toBeUndefined()
  })
})

describe('resolveNavigation — meta.gate: hideIfAgendaDisabled', () => {
  const gateTarget = target('/dashboard/agenda', { requiresAuth: true, gate: { feature: 'agenda' as any, hideIfAgendaDisabled: true } })

  it('redirects when disable_agenda is true', () => {
    const result = resolveNavigation(gateTarget, makeCtx({ profile: makeProfile({ disable_agenda: true }) }))
    expect(result).toBe('/dashboard/historial')
  })

  it('allows when disable_agenda is false', () => {
    expect(resolveNavigation(gateTarget, makeCtx({ profile: makeProfile({ disable_agenda: false }) }))).toBeUndefined()
  })

  it('allows when disable_agenda is undefined (default)', () => {
    expect(resolveNavigation(gateTarget, makeCtx({ profile: makeProfile() }))).toBeUndefined()
  })
})

describe('resolveNavigation — meta.gate: capability (replaces the /consultorio path-string check)', () => {
  const adminConsultorio = target('/admin/consultorio', { adminOnly: true, gate: { capability: 'clients.pets' as any } })
  const employeeConsultorio = target('/dashboard/consultorio', { requiresAuth: true, gate: { capability: 'clients.pets' as any, profileFlag: 'can_access_consultorio' } })

  it('blocks admin access when the niche lacks the pets capability', () => {
    const result = resolveNavigation(adminConsultorio, makeCtx({ role: 'admin', hasCapability: () => false }))
    expect(result).toBe('/admin')
  })

  it('allows admin access when the niche has the pets capability, regardless of can_access_consultorio', () => {
    // Mirrors the original: the admin-side route never checked can_access_consultorio at all.
    const result = resolveNavigation(adminConsultorio, makeCtx({
      role: 'admin',
      hasCapability: () => true,
      profile: makeProfile({ role: 'admin', can_access_consultorio: false }),
    }))
    expect(result).toBeUndefined()
  })

  it('blocks an employee when the niche lacks the pets capability', () => {
    const result = resolveNavigation(employeeConsultorio, makeCtx({ hasCapability: () => false }))
    expect(result).toBe('/dashboard/agenda')
  })

  it('blocks an employee with can_access_consultorio explicitly false', () => {
    const result = resolveNavigation(employeeConsultorio, makeCtx({
      hasCapability: () => true,
      profile: makeProfile({ can_access_consultorio: false }),
    }))
    expect(result).toBe('/dashboard/agenda')
  })

  it('allows an employee with can_access_consultorio defaulted (undefined)', () => {
    const result = resolveNavigation(employeeConsultorio, makeCtx({
      hasCapability: () => true,
      profile: makeProfile(),
    }))
    expect(result).toBeUndefined()
  })
})

describe('resolveNavigation — meta.gate: feature (replaces the /dashboard/clientes employees_see_clients check)', () => {
  const clientesTarget = target('/dashboard/clientes', { requiresAuth: true, gate: { feature: 'employees_see_clients' as any } })

  it('blocks when the feature is off', () => {
    // Stub only the feature under test — a blanket `() => false` would also turn `agenda`
    // off, and the role home then correctly becomes /dashboard/historial rather than
    // /dashboard/agenda, which is a different assertion than this test intends to make.
    const result = resolveNavigation(clientesTarget, makeCtx({ hasFeature: (k) => k !== 'employees_see_clients' }))
    expect(result).toBe('/dashboard/agenda')
  })

  it('allows when the feature is on', () => {
    expect(resolveNavigation(clientesTarget, makeCtx({ hasFeature: () => true }))).toBeUndefined()
  })

  it('bounces to historial, not agenda, when the blocked employee also has no agenda feature', () => {
    // Guards against a redirect loop: /dashboard/agenda is itself gated on `agenda`, so
    // sending an agenda-less employee there would bounce a second time.
    const result = resolveNavigation(clientesTarget, makeCtx({ hasFeature: () => false }))
    expect(result).toBe('/dashboard/historial')
  })
})

describe('resolveNavigation — happy path', () => {
  it('allows a fully permitted navigation with no applicable gate', () => {
    expect(resolveNavigation(target('/dashboard/historial', { requiresAuth: true }), makeCtx())).toBeUndefined()
  })
})
