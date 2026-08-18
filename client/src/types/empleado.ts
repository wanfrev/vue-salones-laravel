export interface StaffingAssignment {
  companyId: string
  companyName?: string
  role: string
  /** Only meaningful when the company's rate card splits this role's pay by shift. */
  shift?: string | null
}

export interface Empleado {
  id: string
  name: string
  role: string
  systemRole?: string
  isCajero?: boolean
  active?: boolean
  citasHoy: number
  producido: string
  schedule?: { start: string; end: string; break: string }
  phone?: string
  email?: string
  specialties?: string[]
  joinDate?: string
  payType: 'salary' | 'percentage' | 'mixed'
  payPercentage?: number
  baseSalary?: number
  salaryFrequency?: 'weekly' | 'biweekly' | 'monthly'
  payTypeLabel: string
  payValueLabel: string
  disableAgenda?: boolean
  disableInventoryEdit?: boolean
  canCreateAppointments?: boolean
  canCreateClients?: boolean
  canAccessConsultorio?: boolean
  canAccessInventory?: boolean
  canAccessPos?: boolean
  canAccessSuppliers?: boolean
  canAccessFinanzas?: boolean
  canAccessRequirements?: boolean
  // Staffing niche only. The employee has no login — pay comes from the companies + role
  // assignments below, each resolved against that company's own rate card. An employee can be
  // assigned to more than one company at once.
  staffingAssignments?: StaffingAssignment[]
  /** Fraction (0.07 = 7%). Null means "use the company's tax_brackets". */
  staffingTaxRate?: number | null
  address?: string
  /** Last 4 digits only — the full SSN never leaves the server. See Profile::$hidden. */
  ssnLast4?: string | null
  bankName?: string
  bankAccountHolder?: string
  bankAccountType?: 'checking' | 'savings' | ''
  paymentMethod?: 'direct_deposit' | 'payroll_card' | ''
  /** Last 4 digits only — the full number never leaves the server. See Profile::$hidden. */
  bankAccountLast4?: string | null
  payrollCardLast4?: string | null
}

export interface EmpleadoFormData {
  name: string
  role: string
  systemRole: 'empleado' | 'encargado' | 'cajero'
  phone: string
  email: string
  password: string
  specialties: string[]
  scheduleStart: string
  scheduleEnd: string
  scheduleBreak: string
  payType: 'salary' | 'percentage' | 'mixed'
  payPercentage: number
  baseSalary: number
  salaryFrequency: 'weekly' | 'biweekly' | 'monthly'
  activeDays: number[]
  disableAgenda: boolean
  disableInventoryEdit: boolean
  canCreateAppointments: boolean
  canCreateClients: boolean
  canAccessConsultorio: boolean
  canAccessInventory: boolean
  canAccessPos: boolean
  canAccessSuppliers: boolean
  canAccessFinanzas: boolean
  canAccessRequirements: boolean
  // Staffing niche only — one or more (company, role) assignments. Role is per-company since
  // rates are (company, role), not a single value on the employee.
  staffingAssignments: StaffingAssignment[]
  staffingTaxRate: number | null
  address: string
  // Write-only, same convention as the bank/card numbers below: typing a value changes what's
  // on file, leaving it blank on an edit preserves whatever SSN is already stored.
  ssn: string
  bankName: string
  bankAccountHolder: string
  bankAccountType: 'checking' | 'savings' | ''
  paymentMethod: 'direct_deposit' | 'payroll_card' | ''
  // Write-only: typing a value here changes what's on file, leaving it blank on an edit
  // preserves whatever is already stored — see saveEmpleado in equipoService.ts.
  bankRoutingNumber: string
  bankAccountNumber: string
  payrollCardNumber: string
  active: boolean
}
