import type { EmployeeSchedule, Profile } from '../types/database'
import type { Empleado, EmpleadoFormData, StaffingAssignment } from '../types/empleado'

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
  const staffingAssignments: StaffingAssignment[] = (profile.staffing_assignments ?? []).map(a => ({
    companyId: a.company_id,
    companyName: a.company_name ?? undefined,
    projectId: a.project_id ?? null,
    role: a.role,
    shift: a.shift ?? null,
  }))
  return {
    id: profile.id,
    name: profile.full_name,
    role: profile.job_title || (profile.role === 'admin' ? 'Administrador' : (isCajero ? 'Cajero' : 'Empleado')),
    systemRole: isCajero ? 'cajero' : (profile.role as Empleado['systemRole']),
    isCajero,
    active: profile.active ?? true,
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
    staffingAssignments,
    staffingTaxRate: profile.staffing_tax_rate ?? null,
    address: profile.address ?? '',
    ssnLast4: profile.ssn_last4 ?? null,
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
  // Staffing employees have no single "Rol/Puesto" anymore — role is per company assignment —
  // so job_title (used for display wherever a plain role string is expected) becomes a summary
  // of the roles they hold across companies instead.
  job_title: data.staffingAssignments.length > 0
    ? [...new Set(data.staffingAssignments.map(a => a.role.trim()).filter(Boolean))].join(', ') || null
    : data.role.trim() || null,
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
  // Staffing niche only. Always sent (even empty) so removing every assignment actually clears
  // them — see ProfileService::update, which only touches this when the key is present at all.
  staffing_assignments: data.staffingAssignments.map(a => ({ company_id: a.companyId, project_id: a.projectId ?? null, role: a.role.trim(), shift: a.shift ?? null })),
  // Null clears the override back to "use the company's tax_brackets" — always sent, unlike
  // the write-only bank/card fields below, since an admin re-editing this record can see and
  // blank it deliberately.
  staffing_tax_rate: data.staffingTaxRate,
  address: data.address?.trim() || null,
  bank_name: data.bankName?.trim() || null,
  bank_account_holder: data.bankAccountHolder?.trim() || null,
  bank_account_type: data.bankAccountType || null,
  payment_method: data.paymentMethod || null,
  active: data.active,
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
