export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  ENCARGADO: 'encargado',
  EMPLEADO: 'empleado',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const DEFAULT_HOME_BY_ROLE: Record<Role, string> = {
  [ROLES.SUPERADMIN]: '/superadmin',
  [ROLES.ADMIN]: '/admin',
  [ROLES.ENCARGADO]: '/admin',
  [ROLES.EMPLEADO]: '/dashboard/agenda',
}

export const isRole = (value: unknown): value is Role => {
  return value === ROLES.SUPERADMIN || value === ROLES.ADMIN || value === ROLES.ENCARGADO || value === ROLES.EMPLEADO
}

export const isAdminPanelRole = (value?: string): value is typeof ROLES.ADMIN | typeof ROLES.SUPERADMIN | typeof ROLES.ENCARGADO => {
  return value === ROLES.ADMIN || value === ROLES.SUPERADMIN || value === ROLES.ENCARGADO
}

export const isEncargado = (value?: string): boolean => value === ROLES.ENCARGADO

export const resolveHomeByRole = (role?: string, disableAgenda?: boolean): string => {
  if (role === ROLES.EMPLEADO && disableAgenda) {
    return '/dashboard/historial'
  }
  if (role && isRole(role)) {
    return DEFAULT_HOME_BY_ROLE[role]
  }

  return '/dashboard/agenda'
}
