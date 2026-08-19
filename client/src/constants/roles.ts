export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  ENCARGADO: 'encargado',
  EMPLEADO: 'empleado',
  CAJERO: 'cajero',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const DEFAULT_HOME_BY_ROLE: Record<Role, string> = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.ADMIN]: '/admin',
  [ROLES.ENCARGADO]: '/admin',
  [ROLES.EMPLEADO]: '/dashboard/agenda',
  [ROLES.CAJERO]: '/admin/pos',
}

export const isRole = (value: unknown): value is Role => {
  return value === ROLES.SUPERADMIN || value === ROLES.ADMIN || value === ROLES.ENCARGADO || value === ROLES.EMPLEADO || value === ROLES.CAJERO
}

export const isAdminPanelRole = (value?: string): value is typeof ROLES.ADMIN | typeof ROLES.SUPERADMIN | typeof ROLES.ENCARGADO => {
  return value === ROLES.ADMIN || value === ROLES.SUPERADMIN || value === ROLES.ENCARGADO
}

export const isCajero = (value?: string): boolean => value === ROLES.CAJERO

export const isEncargado = (value?: string): boolean => value === ROLES.ENCARGADO

export const resolveHomeByRole = (
  role?: string,
  disableAgenda?: boolean,
  hasAgendaFeature: boolean = true,
  hasPosFeature: boolean = false,
  hasServiciosFeature: boolean = true,
  hasStaffingCapability: boolean = false,
): string => {
  if (role === ROLES.EMPLEADO && (disableAgenda || !hasAgendaFeature)) {
    // "Historial" is a service-history list — meaningless for niches with no servicios at all
    // (staffing, tienda). Recibo has no gate and applies to every employee regardless of niche,
    // so it's the one screen that's always a safe landing page.
    return hasServiciosFeature ? '/dashboard/historial' : '/dashboard/recibo'
  }
  if (isAdminPanelRole(role)) {
    if (!hasAgendaFeature) {
      // '/admin' (Agenda) is gated on the agenda feature, so a niche without it needs its own
      // landing page instead. Staffing's closest equivalent to "the main thing you manage" is
      // Empresas (the client companies); tienda's is POS; anything else falls back to Clientes.
      if (hasStaffingCapability) return '/admin/empresas'
      return hasPosFeature ? '/admin/pos' : '/admin/clientes'
    }
  }
  if (role && isRole(role)) {
    return DEFAULT_HOME_BY_ROLE[role]
  }

  return '/dashboard/agenda'
}
