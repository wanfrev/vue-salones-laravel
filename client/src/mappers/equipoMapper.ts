import type { EmployeeSchedule, Profile } from '../types/database'
import type { Empleado, EmpleadoFormData } from '../types/empleado'

export type EmployeeProfile = Profile & {
  employee_schedules?: EmployeeSchedule[]
  salary_frequency?: 'weekly' | 'biweekly' | 'monthly'
}

export const mapProfileToEmpleado = (
  profile: EmployeeProfile,
  stats?: { citasHoy?: number; producido?: number; isOnBreak?: boolean; isOnVacation?: boolean }
): Empleado => {
  const firstSchedule = profile.employee_schedules?.[0]
  const payType = profile.pay_type || 'percentage'
  const payPercentage = Number(profile.pay_percentage ?? 0)
  const baseSalary = Number(profile.base_salary ?? 0)
  const payTypeLabel = payType === 'salary'
    ? 'Sueldo base'
    : payType === 'mixed'
      ? 'Sueldo + %'
      : 'Porcentaje'
  const salaryFrequency = profile.salary_frequency || 'monthly'
  const freqLabel = salaryFrequency === 'weekly' ? '/sem' : salaryFrequency === 'biweekly' ? '/quinc' : '/mes'
  const payValueLabel = payType === 'salary'
    ? `$${baseSalary.toLocaleString()}${freqLabel}`
    : payType === 'mixed'
      ? `$${baseSalary.toLocaleString()}${freqLabel} + ${payPercentage}%`
      : `${payPercentage}%`

  const isCajero = profile.role === 'cajero' || (!!profile.disable_agenda && !!profile.disable_inventory_edit)
  return {
    id: profile.id,
    name: profile.full_name,
    role: profile.job_title || (profile.role === 'admin' ? 'Administrador' : (isCajero ? 'Cajero' : 'Empleado')),
    systemRole: isCajero ? 'cajero' : (profile.role as Empleado['systemRole']),
    isCajero,
    citasHoy: stats?.citasHoy ?? 0,
    producido: (stats?.producido ?? 0).toLocaleString(),
    schedule: firstSchedule
      ? {
          start: firstSchedule.start_time.slice(0, 5),
          end: firstSchedule.end_time.slice(0, 5),
          break: '',
        }
      : undefined,
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    specialties: [],
    joinDate: profile.created_at.split('T')[0],
    payType,
    payPercentage,
    baseSalary,
    salaryFrequency: profile.salary_frequency ?? 'monthly' as 'weekly' | 'biweekly' | 'monthly',
    payTypeLabel,
    payValueLabel,
    disableAgenda: profile.disable_agenda ?? false,
    disableInventoryEdit: profile.disable_inventory_edit ?? false,
    canCreateAppointments: profile.can_create_appointments ?? true,
    canCreateClients: profile.can_create_clients ?? true,
    canAccessConsultorio: profile.can_access_consultorio ?? true,
    canAccessInventory: profile.can_access_inventory ?? false,
    canAccessPos: profile.can_access_pos ?? false,
    canAccessSuppliers: profile.can_access_suppliers ?? false,
    canAccessFinanzas: profile.can_access_finanzas ?? false,
    canAccessRequirements: profile.can_access_requirements ?? false,
    staffingCompanyId: profile.staffing_company_id ?? null,
    staffingRole: profile.staffing_role ?? '',
    bankName: profile.bank_name ?? '',
    bankAccountHolder: profile.bank_account_holder ?? '',
    bankAccountType: (profile.bank_account_type as Empleado['bankAccountType']) ?? '',
    paymentMethod: (profile.payment_method as Empleado['paymentMethod']) ?? '',
    bankAccountLast4: profile.bank_account_last4 ?? null,
    payrollCardLast4: profile.payroll_card_last4 ?? null,
  }
}

export const mapEmpleadoFormToProfileUpdate = (data: EmpleadoFormData) => ({
  full_name: data.name.trim(),
  job_title: data.role.trim() || null,
  phone: data.phone.trim() || null,
  pay_type: data.payType,
  pay_percentage: data.payType === 'salary' ? 0 : Number(data.payPercentage),
  base_salary: data.payType === 'percentage' ? 0 : Number(data.baseSalary),
  salary_frequency: data.salaryFrequency,
  disable_agenda: data.systemRole === 'cajero' ? true : data.disableAgenda,
  disable_inventory_edit: data.systemRole === 'cajero' ? true : data.disableInventoryEdit,
  can_create_appointments: data.systemRole === 'cajero' ? false : data.canCreateAppointments,
  can_create_clients: data.systemRole === 'cajero' ? false : data.canCreateClients,
  can_access_consultorio: data.systemRole === 'cajero' ? false : data.canAccessConsultorio,
  can_access_inventory: data.systemRole === 'cajero' ? false : data.canAccessInventory,
  can_access_pos: data.systemRole === 'cajero' ? true : data.canAccessPos,
  can_access_suppliers: data.systemRole === 'cajero' ? false : data.canAccessSuppliers,
  can_access_finanzas: data.systemRole === 'cajero' ? false : data.canAccessFinanzas,
  can_access_requirements: data.systemRole === 'cajero' ? false : data.canAccessRequirements,
  role: data.systemRole === 'cajero' ? 'empleado' : data.systemRole,
  // Staffing niche only. Safe to always overwrite — unlike the raw bank/card numbers below,
  // these are plain fields the admin can see and re-edit, so there's nothing to preserve.
  staffing_company_id: data.staffingCompanyId || null,
  // No separate staffing-role input — the existing Rol/Puesto field is the rate-card role.
  staffing_role: data.role?.trim() || null,
  bank_name: data.bankName?.trim() || null,
  bank_account_holder: data.bankAccountHolder?.trim() || null,
  bank_account_type: data.bankAccountType || null,
  payment_method: data.paymentMethod || null,
})

export const mapEmpleadoFormToScheduleBlocks = (employeeId: string, data: EmpleadoFormData & { branchId?: string | null }) => {
  const days = data.activeDays?.length ? data.activeDays : [1, 2, 3, 4, 5, 6]
  return days.map(weekday => ({
    employee_id: employeeId,
    branch_id: data.branchId || null,
    weekday,
    start_time: data.scheduleStart,
    end_time: data.scheduleEnd,
  }))
}
