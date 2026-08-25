import { apiDownloadFile, apiRequest, apiUpload, db } from '../../lib/api'
import { handleDbError } from '../../lib/errors'
import { staffingCompanyFormSchema, staffingCompanyPaymentFormSchema, staffingRateFormSchema } from '../../lib/validation'
import type {
  Profile, StaffingCompany, StaffingCompanyBalance, StaffingCompanyPayment, StaffingCompanyRate,
  StaffingInvoice, StaffingTaxBracket, StaffingTimesheet,
} from '../../types/database'

export const staffingCompanyKeys = {
  all: (businessId?: string | null, branchId?: string | null) =>
    ['staffing-companies', businessId, branchId] as const,
  projects: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-projects', businessId, companyId] as const,
  allProjects: (businessId?: string | null) =>
    ['staffing-all-projects', businessId] as const,
}

export const staffingInvoiceKeys = {
  byCompany: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-invoices', businessId, companyId] as const,
  balance: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-balance', businessId, companyId] as const,
}

export const staffingCompanyPaymentKeys = {
  byCompany: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-payments', businessId, companyId] as const,
}

export const staffingTimesheetKeys = {
  byCompany: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-timesheets', businessId, companyId] as const,
  employees: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-employees', businessId, companyId] as const,
}

export const staffingRateKeys = {
  all: (businessId?: string | null) => ['staffing-company-rates', businessId] as const,
  byCompany: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-rates', businessId, companyId] as const,
}

export const staffingReportKeys = {
  headcountMatrix: (businessId?: string | null, year?: number, status?: StaffingCompanyStatus | 'all') =>
    ['staffing-headcount-matrix', businessId, year, status] as const,
  monthlyPayroll: (businessId?: string | null, year?: number, month?: number) =>
    ['staffing-monthly-payroll', businessId, year, month] as const,
  weekly: (businessId?: string | null, weekStart?: string) =>
    ['staffing-weekly-report', businessId, weekStart] as const,
  employeeHours: (businessId?: string | null, year?: number, active?: boolean) =>
    ['staffing-employee-hours', businessId, year, active] as const,
}

export type TaxDestination = 'remitted' | 'retained'
export type PayoutRounding = 'floor' | 'cent' | 'exact' | 'round'
export type StaffingCompanyStatus = 'active' | 'inactive' | 'on_hold'

/** A role's rate only needs a shift when the company pays that role differently by time of day. */
export type ShiftValue = 'dia' | 'tarde' | 'noche'
export const SHIFT_OPTIONS: { value: ShiftValue; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
]

export interface StaffingCompanyRow {
  id: string
  name: string
  legalName: string
  address: string
  city: string
  state: string
  zip: string
  workSite: string
  contactName: string
  contactPhone: string
  contactEmail: string
  paymentTermsDays: number
  taxRate: number
  /** Tiered withholding — wins over taxRate when set (e.g. 3.5% under $500, 7% at/above). */
  taxBrackets: StaffingTaxBracket[] | null
  payoutRounding: PayoutRounding
  notes: string
  active: boolean
  status: StaffingCompanyStatus
}

export interface StaffingProject {
  id: string
  companyId: string
  name: string
  active: boolean
}

export interface StaffingProjectFormData {
  name: string
  active: boolean
}

export interface StaffingRateRow {
  id: string
  companyId: string
  role: string
  /** Null = this role isn't split by shift. */
  shift: ShiftValue | null
  payRate: number
  billRate: number
  /** What the agency keeps per hour, before withholdings. The reason the business exists. */
  hourlyMargin: number
  /** Null = falls back to the company's own overtime terms. */
  overtimeThresholdHours: number | null
  overtimeMultiplier: number | null
  overtimePayRate: number | null
  overtimeBillRate: number | null
  active: boolean
}

export interface StaffingCompanyFormData {
  name: string
  legalName: string
  address: string
  city: string
  state: string
  zip: string
  workSite: string
  contactName: string
  contactPhone: string
  contactEmail: string
  paymentTermsDays: number
  taxRate: number
  taxBrackets: StaffingTaxBracket[] | null
  roles: {
    role: string
    shift?: ShiftValue | null
    payRate: number
    billRate: number
    overtimeThresholdHours: number
    overtimePayRate?: number
    overtimeBillRate?: number
  }[]
  payoutRounding: PayoutRounding
  status: StaffingCompanyStatus
  notes: string
  projects?: { id?: string; name: string; active?: boolean }[]
}

export interface StaffingRateFormData {
  companyId: string
  role: string
  shift?: ShiftValue | null
  payRate: number
  billRate: number
  overtimeThresholdHours: number | null
  overtimeMultiplier: number | null
  overtimePayRate?: number | null
  overtimeBillRate?: number | null
}

export interface StaffingEmployeeAssignmentFormData {
  companyId: string
  projectId?: string | null
  role: string
  shift?: ShiftValue | null
}

const toCompanyRow = (row: StaffingCompany): StaffingCompanyRow => ({
  id: row.id,
  name: row.name,
  legalName: row.legal_name ?? '',
  address: row.address ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  zip: row.zip ?? '',
  workSite: row.work_site ?? '',
  contactName: row.contact_name ?? '',
  contactPhone: row.contact_phone ?? '',
  contactEmail: row.contact_email ?? '',
  paymentTermsDays: Number(row.payment_terms_days ?? 15),
  taxRate: Number(row.tax_rate ?? 0.04),
  taxBrackets: row.tax_brackets ?? null,
  payoutRounding: (row.payout_rounding as PayoutRounding) || 'cent',
  notes: row.notes ?? '',
  active: row.active,
  status: row.status ?? (row.active ? 'active' : 'inactive'),
})

const toRateRow = (row: StaffingCompanyRate): StaffingRateRow => ({
  id: row.id,
  companyId: row.company_id,
  role: row.role,
  shift: (row.shift as ShiftValue | null) ?? null,
  payRate: Number(row.pay_rate ?? 0),
  billRate: Number(row.bill_rate ?? 0),
  hourlyMargin: Number(row.bill_rate ?? 0) - Number(row.pay_rate ?? 0),
  overtimeThresholdHours: row.overtime_threshold_hours == null ? null : Number(row.overtime_threshold_hours),
  overtimeMultiplier: row.overtime_multiplier == null ? null : Number(row.overtime_multiplier),
  overtimePayRate: row.overtime_pay_rate == null ? null : Number(row.overtime_pay_rate),
  overtimeBillRate: row.overtime_bill_rate == null ? null : Number(row.overtime_bill_rate),
  active: row.active,
})

export const getStaffingCompanies = (): Promise<StaffingCompanyRow[]> =>
  apiRequest('GET', '/staffing-companies')

/**
 * Defaults to 'active' so callers that only ever want active companies (StaffingHoursPanel.vue,
 * StaffingEmployeeFields.vue, Nomina.vue) keep seeing exactly that without passing a status. Pass
 * 'all' explicitly for the Empresas screen's own tabbed list.
 */
export const listStaffingCompanies = async (
  businessId: string,
  _branchId?: string | null,
  status: StaffingCompanyStatus | 'all' = 'active',
): Promise<StaffingCompanyRow[]> => {
  let query = db.from('staffing_companies').select('*').eq('business_id', businessId)
  
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  
  query = query.order('name', { ascending: true })

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las empresas')

  return ((data ?? []) as StaffingCompany[]).map(toCompanyRow)
}

export const createStaffingCompany = (data: Partial<StaffingCompanyRow>): Promise<StaffingCompanyRow> =>
  apiRequest('POST', '/staffing-companies', data)

export const saveStaffingCompany = async (
  businessId: string,
  data: StaffingCompanyFormData & { id?: string | null },
  _branchId?: string | null,
): Promise<StaffingCompanyRow> => {
  const parsed = staffingCompanyFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = {
    business_id: businessId,
    name: parsed.data.name,
    legal_name: parsed.data.legalName || null,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    zip: parsed.data.zip || null,
    work_site: parsed.data.workSite || null,
    contact_name: parsed.data.contactName || null,
    contact_phone: parsed.data.contactPhone || null,
    contact_email: parsed.data.contactEmail || null,
    payment_terms_days: parsed.data.paymentTermsDays,
    tax_rate: parsed.data.taxRate,
    tax_brackets: parsed.data.taxBrackets,
    payout_rounding: parsed.data.payoutRounding,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
    active: parsed.data.status === 'active',
  }

  const { data: saved, error } = data.id
    ? await db.from('staffing_companies').update(payload).eq('id', data.id).select('*').single()
    : await db.from('staffing_companies').insert(payload).select('*').single()

  if (error) handleDbError(error, 'Error al guardar la empresa')

  return toCompanyRow(saved as StaffingCompany)
}

export const updateStaffingCompany = (id: string, data: Partial<StaffingCompanyRow>): Promise<StaffingCompanyRow> =>
  apiRequest('PUT', `/staffing-companies/${id}`, data)

export const deleteStaffingCompany = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_companies').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la empresa')
}

interface StaffingProjectApiRow {
  id: string
  company_id: string
  name: string
  active: boolean
}

const toProjectRow = (row: StaffingProjectApiRow): StaffingProject => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  active: row.active,
})

export const getStaffingAllProjects = async (): Promise<StaffingProject[]> => {
  const rows = await apiRequest<StaffingProjectApiRow[]>('GET', '/staffing-projects')
  return rows.map(toProjectRow)
}

export const getStaffingProjects = async (companyId: string): Promise<StaffingProject[]> => {
  const rows = await apiRequest<StaffingProjectApiRow[]>('GET', `/staffing-companies/${companyId}/projects`)
  return rows.map(toProjectRow)
}

export const createStaffingProject = async (companyId: string, data: StaffingProjectFormData): Promise<StaffingProject> => {
  const row = await apiRequest<StaffingProjectApiRow>('POST', `/staffing-companies/${companyId}/projects`, data)
  return toProjectRow(row)
}

export const updateStaffingProject = async (companyId: string, id: string, data: Partial<StaffingProjectFormData>): Promise<StaffingProject> => {
  const row = await apiRequest<StaffingProjectApiRow>('PUT', `/staffing-companies/${companyId}/projects/${id}`, data)
  return toProjectRow(row)
}

export const deleteStaffingProject = (companyId: string, id: string): Promise<void> =>
  apiRequest('DELETE', `/staffing-companies/${companyId}/projects/${id}`)

export const listStaffingRates = async (
  businessId: string,
  companyId?: string | null,
): Promise<StaffingRateRow[]> => {
  let query = db
    .from('staffing_company_rates')
    .select('*')
    .eq('business_id', businessId)
    .order('role', { ascending: true })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las tarifas')

  return ((data ?? []) as StaffingCompanyRate[]).map(toRateRow)
}

export const saveStaffingRate = async (
  _businessId: string,
  data: StaffingRateFormData & { id?: string },
): Promise<StaffingRateRow> => {
  const parsed = staffingRateFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = {
    company_id: parsed.data.companyId,
    role: parsed.data.role,
    shift: parsed.data.shift ?? null,
    pay_rate: parsed.data.payRate,
    bill_rate: parsed.data.billRate,
    overtime_threshold_hours: parsed.data.overtimeThresholdHours,
    overtime_multiplier: parsed.data.overtimeMultiplier,
    overtime_pay_rate: parsed.data.overtimePayRate ?? null,
    overtime_bill_rate: parsed.data.overtimeBillRate ?? null,
  }

  const { data: saved, error } = data.id
    ? await db.from('staffing_company_rates').update(payload).eq('id', data.id).select('*').single()
    : await db.from('staffing_company_rates').insert(payload).select('*').single()

  if (error) handleDbError(error, 'Error al guardar la tarifa')

  return toRateRow(saved as StaffingCompanyRate)
}

export const deleteStaffingRate = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_company_rates').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la tarifa')
}

export interface TimesheetEntryInput {
  employeeId: string
  /** Which of the employee's roles at this company this line is for — required to tell apart
   *  two entries for the same employee when they hold more than one role at the company. */
  role?: string | null
  /** Disambiguates further when the employee holds two assignments with the same role that
   *  differ only by shift (e.g. day/night) — without it the backend can't tell which one an
   *  entry belongs to and picks one arbitrarily. */
  shift?: string | null
  totalHours: number
  preTaxDeduction?: number
  fixedFees?: number
  adjustment?: number
}

export const listCompanyEmployees = (_businessId: string, companyId: string, projectId?: string | null): Promise<Profile[]> => {
  const url = projectId
    ? `/staffing-companies/${companyId}/employees?project_id=${projectId}`
    : `/staffing-companies/${companyId}/employees`
  return apiRequest<Profile[]>('GET', url)
}

export const listStaffingTimesheets = async (
  businessId: string,
  companyId?: string | null,
  projectId?: string | null,
): Promise<StaffingTimesheet[]> => {
  let query = db.from('staffing_timesheets').select('*').eq('business_id', businessId)
  if (companyId) query = query.eq('company_id', companyId)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las semanas')

  return (data ?? []) as StaffingTimesheet[]
}

export const saveTimesheetWeek = async (
  companyId: string,
  weekStart: string,
  weekEnd: string,
  entries: TimesheetEntryInput[],
  projectId?: string | null,
): Promise<StaffingTimesheet> => {
  const payload = {
    company_id: companyId,
    project_id: projectId || null,
    week_start: weekStart,
    week_end: weekEnd,
    entries: entries.map(e => ({
      employee_id: e.employeeId,
      role: e.role ?? null,
      shift: e.shift ?? null,
      total_hours: e.totalHours,
      pre_tax_deduction: e.preTaxDeduction ?? 0,
      fixed_fees: e.fixedFees ?? 0,
      adjustment: e.adjustment ?? 0,
    })),
  }

  return apiRequest<StaffingTimesheet>('POST', '/staffing-timesheets', payload)
}

export const approveTimesheet = (id: string): Promise<StaffingTimesheet> =>
  apiRequest<StaffingTimesheet>('POST', `/staffing-timesheets/${id}/approve`)

export const markTimesheetPaid = (id: string): Promise<StaffingTimesheet> =>
  apiRequest<StaffingTimesheet>('POST', `/staffing-timesheets/${id}/mark-paid`)

export const deleteTimesheet = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_timesheets').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la semana')
}

export const listStaffingInvoices = async (
  businessId: string,
  companyId?: string | null,
  projectId?: string | null,
): Promise<StaffingInvoice[]> => {
  let query = db.from('staffing_invoices').select('*').eq('business_id', businessId)
  if (companyId) query = query.eq('company_id', companyId)
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las facturas')

  return (data ?? []) as StaffingInvoice[]
}

export const getStaffingInvoice = (id: string): Promise<StaffingInvoice> =>
  apiRequest<StaffingInvoice>('GET', `/staffing-invoices/${id}`)

export const generateStaffingInvoice = (timesheetId: string): Promise<StaffingInvoice> =>
  apiRequest<StaffingInvoice>('POST', '/staffing-invoices/generate', { timesheet_id: timesheetId })

export const getCompanyBalance = (companyId: string): Promise<StaffingCompanyBalance> =>
  apiRequest<StaffingCompanyBalance>('GET', `/staffing-companies/${companyId}/balance`)

export const deleteStaffingInvoice = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_invoices').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la factura')
}

export interface StaffingCompanyPaymentFormData {
  companyId: string
  invoiceId: string
  amount: number
  paymentMethod: string
  paymentDate: string
  reference: string
  notes: string
}

export const listCompanyPayments = async (
  businessId: string,
  companyId?: string | null,
): Promise<StaffingCompanyPayment[]> => {
  let query = db.from('staffing_company_payments').select('*').eq('business_id', businessId)
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar los abonos')

  return (data ?? []) as StaffingCompanyPayment[]
}

export const createCompanyPayment = async (
  data: StaffingCompanyPaymentFormData,
): Promise<StaffingCompanyPayment> => {
  const parsed = staffingCompanyPaymentFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = {
    company_id: parsed.data.companyId,
    invoice_id: parsed.data.invoiceId || null,
    amount: parsed.data.amount,
    payment_method: parsed.data.paymentMethod || null,
    payment_date: parsed.data.paymentDate,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
  }

  const { data: saved, error } = await db.from('staffing_company_payments').insert(payload).select('*').single()
  if (error) handleDbError(error, 'Error al registrar el abono')

  return saved as StaffingCompanyPayment
}

export const deleteCompanyPayment = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_company_payments').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar el abono')
}

export interface StaffingWeekLabel {
  week_start: string
  week_end: string
  label: string
}

export interface StaffingHeadcountCompanyRow {
  companyId: string
  name: string
  status: StaffingCompanyStatus
  weeklyHeadcount: Record<string, number>
}

export interface StaffingHeadcountMatrix {
  weeks: StaffingWeekLabel[]
  companies: StaffingHeadcountCompanyRow[]
}

export const getCompanyHeadcountMatrix = (
  year: number,
  status?: StaffingCompanyStatus | 'all',
): Promise<StaffingHeadcountMatrix> => {
  const params = new URLSearchParams({ year: String(year) })
  if (status && status !== 'all') params.set('status', status)

  return apiRequest<StaffingHeadcountMatrix>('GET', `/staffing-companies/headcount-matrix?${params.toString()}`)
}

export interface StaffingMonthlyPayrollCompanyRow {
  companyId: string
  name: string
  weeklyPayroll: Record<string, number>
  total: number
}

export interface StaffingMonthlyPayrollReport {
  weeks: StaffingWeekLabel[]
  companies: StaffingMonthlyPayrollCompanyRow[]
}

export const getMonthlyPayrollReport = (year: number, month: number): Promise<StaffingMonthlyPayrollReport> =>
  apiRequest<StaffingMonthlyPayrollReport>('GET', `/staffing-reports/monthly-payroll?year=${year}&month=${month}`)

export type StaffingWeeklyReportEstado = 'paid' | 'pending' | 'no_invoice'

export interface StaffingWeeklyReportRow {
  companyId: string
  name: string
  estado: StaffingWeeklyReportEstado
  estadoAuto: StaffingWeeklyReportEstado
  /** Null = no manual override, "estado" above is the auto-computed value. */
  estadoOverride: StaffingWeeklyReportEstado | null
  proyecto: string | null
  nomina: number
  invoice: number
  gananciaBruta: number
  overheadRate: number
  overhead: number
  otrosGastos: number
  total: number
  empleados: number
}

export const getWeeklyCompanyReport = (weekStart: string): Promise<StaffingWeeklyReportRow[]> =>
  apiRequest<StaffingWeeklyReportRow[]>('GET', `/staffing-reports/weekly?week_start=${weekStart}`)

export interface StaffingWeeklyExpenseFormData {
  companyId: string
  weekStart: string
  amount: number
  notes?: string
  /** Omit to leave the current override untouched, null to clear it back to "automático". */
  estadoOverride?: StaffingWeeklyReportEstado | null
}

export const saveWeeklyExpense = (data: StaffingWeeklyExpenseFormData): Promise<void> =>
  apiRequest('POST', '/staffing-weekly-expenses', {
    company_id: data.companyId,
    week_start: data.weekStart,
    amount: data.amount,
    notes: data.notes || null,
    ...('estadoOverride' in data ? { estado_override: data.estadoOverride ?? null } : {}),
  })

export const updateStaffingCompanyWorkSite = async (id: string, workSite: string): Promise<void> => {
  const { error } = await db.from('staffing_companies').update({ work_site: workSite || null }).eq('id', id)
  if (error) handleDbError(error, 'Error al actualizar el proyecto')
}

export interface StaffingEmployeeHoursCompanyRef {
  id: string
  name: string
}

export interface StaffingEmployeeHoursRow {
  employeeId: string
  name: string
  active: boolean
  paymentMethod: string | null
  companies: StaffingEmployeeHoursCompanyRef[]
  weeklyHours: Record<string, number>
}

export interface StaffingEmployeeHoursMatrix {
  weeks: StaffingWeekLabel[]
  employees: StaffingEmployeeHoursRow[]
}

export const getEmployeeHoursMatrix = (year: number, active: boolean): Promise<StaffingEmployeeHoursMatrix> =>
  apiRequest<StaffingEmployeeHoursMatrix>('GET', `/staffing-reports/employee-hours?year=${year}&active=${active}`)

export type StaffingHoursPeriod = 'week' | 'month' | 'year'

export interface StaffingCompanyHoursRow {
  companyId: string
  name: string
  activeHours: number
  inactiveHours: number
  totalHours: number
}

export const getCompanyHoursSummary = (
  period: StaffingHoursPeriod,
  year: number,
  opts: { month?: number; weekStart?: string } = {},
): Promise<StaffingCompanyHoursRow[]> => {
  const params = new URLSearchParams({ period, year: String(year) })
  if (period === 'month' && opts.month) params.set('month', String(opts.month))
  if (period === 'week' && opts.weekStart) params.set('week_start', opts.weekStart)
  return apiRequest<StaffingCompanyHoursRow[]>('GET', `/staffing-reports/company-hours?${params.toString()}`)
}

// ── Finanzas (staffing) ──────────────────────────────────────────

export interface StaffingFinanceSummary {
  invoiceTotal: number
  employerCost: number
  margin: number
}

export const getStaffingFinanceSummary = (periodStart: string, periodEnd: string): Promise<StaffingFinanceSummary> =>
  apiRequest<StaffingFinanceSummary>('GET', `/staffing-reports/finance-summary?period_start=${periodStart}&period_end=${periodEnd}`)

export interface StaffingDepositListRow {
  employeeId: string
  employeeName: string
  /** Bank account holder — may differ from the employee (e.g. a family member's account). */
  titular: string
  bankName: string | null
  companyName: string
  shift: ShiftValue | null
  amount: number
}

export const getStaffingDepositList = (weekStart: string, companyId?: string | null): Promise<StaffingDepositListRow[]> => {
  const url = companyId
    ? `/staffing-reports/deposit-list?week_start=${weekStart}&company_id=${companyId}`
    : `/staffing-reports/deposit-list?week_start=${weekStart}`
  return apiRequest<StaffingDepositListRow[]>('GET', url)
}

export interface StaffingManualIncomeRow {
  id: string
  incomeDate: string
  amount: number
  notes: string | null
}

interface StaffingManualIncomeApiRow {
  id: string
  income_date: string
  amount: number | string
  notes: string | null
}

const toManualIncomeRow = (row: StaffingManualIncomeApiRow): StaffingManualIncomeRow => ({
  id: row.id,
  incomeDate: String(row.income_date).slice(0, 10),
  amount: Number(row.amount),
  notes: row.notes,
})

export const listStaffingManualIncomes = async (from: string, to: string): Promise<StaffingManualIncomeRow[]> => {
  const rows = await apiRequest<StaffingManualIncomeApiRow[]>('GET', `/staffing-manual-incomes?from=${from}&to=${to}`)
  return rows.map(toManualIncomeRow)
}

export interface StaffingManualIncomeFormData {
  incomeDate: string
  amount: number
  notes?: string
}

export const createStaffingManualIncome = async (data: StaffingManualIncomeFormData): Promise<StaffingManualIncomeRow> => {
  const row = await apiRequest<StaffingManualIncomeApiRow>('POST', '/staffing-manual-incomes', {
    income_date: data.incomeDate,
    amount: data.amount,
    notes: data.notes || null,
  })
  return toManualIncomeRow(row)
}

export const deleteStaffingManualIncome = (id: string): Promise<void> =>
  apiRequest('DELETE', `/staffing-manual-incomes/${id}`)

// ── Taxes ──────────────────────────────────────────────────────

export const staffingTaxEntityKeys = {
  all: (businessId?: string | null) => ['staffing-tax-entities', businessId] as const,
}

export interface StaffingTaxEntityRow {
  id: string
  name: string
  active: boolean
}

export interface StaffingTaxEntityFormData {
  name: string
  active: boolean
}

interface StaffingTaxEntityApiRow {
  id: string
  name: string
  active: boolean
}

const toTaxEntityRow = (row: StaffingTaxEntityApiRow): StaffingTaxEntityRow => ({
  id: row.id,
  name: row.name,
  active: row.active,
})

export const listStaffingTaxEntities = async (businessId: string): Promise<StaffingTaxEntityRow[]> => {
  const { data, error } = await db.from('staffing_tax_entities').select('*').eq('business_id', businessId).order('name', { ascending: true })
  if (error) handleDbError(error, 'Error al cargar las entidades de tax')

  return ((data ?? []) as StaffingTaxEntityApiRow[]).map(toTaxEntityRow)
}

export const saveStaffingTaxEntity = async (
  _businessId: string,
  data: StaffingTaxEntityFormData & { id?: string },
): Promise<StaffingTaxEntityRow> => {
  const payload = { name: data.name, active: data.active }

  const { data: saved, error } = data.id
    ? await db.from('staffing_tax_entities').update(payload).eq('id', data.id).select('*').single()
    : await db.from('staffing_tax_entities').insert(payload).select('*').single()

  if (error) handleDbError(error, 'Error al guardar la entidad de tax')

  return toTaxEntityRow(saved as StaffingTaxEntityApiRow)
}

export const deleteStaffingTaxEntity = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_tax_entities').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la entidad de tax')
}

export interface StaffingAnnualTaxEntry {
  entryId: string
  amount: number
  hasFile: boolean
  fileName: string | null
  entryDate: string | null
}

export type StaffingAnnualTaxStatus = 'BLANK' | 'SENT_TO_EMPLOYEE' | 'SENT_TO_ACCOUNTANT' | 'PENDING_TO_SEND'

export interface StaffingAnnualTaxEmployeeRow {
  employeeId: string
  name: string
  active: boolean
  companyId: string | null
  companyName: string | null
  phone: string | null
  address: string | null
  ssnLast4: string | null
  status: StaffingAnnualTaxStatus
  globalFilePath: string | null
  globalFileName: string | null
  globalFileDate: string | null
  entriesByEntity: Record<string, StaffingAnnualTaxEntry | null>
}

export interface StaffingAnnualTaxReport {
  entities: StaffingTaxEntityRow[]
  employees: StaffingAnnualTaxEmployeeRow[]
}

export const getAnnualTaxReport = (year: number): Promise<StaffingAnnualTaxReport> =>
  apiRequest<StaffingAnnualTaxReport>('GET', `/staffing-reports/annual-tax?year=${year}`)

export interface StaffingTaxEntryFormData {
  employeeId: string
  taxEntityId: string
  year: number
  amount: number
  entryDate?: string
  file?: File | null
}

export const saveTaxEntry = (data: StaffingTaxEntryFormData): Promise<void> => {
  const form = new FormData()
  form.set('employee_id', data.employeeId)
  form.set('tax_entity_id', data.taxEntityId)
  form.set('year', String(data.year))
  form.set('amount', String(data.amount))
  if (data.entryDate) form.set('entry_date', data.entryDate)
  if (data.file) form.set('file', data.file)

  return apiUpload('POST', '/staffing-tax-entries', form)
}

export const deleteTaxEntry = (id: string): Promise<void> =>
  apiRequest('DELETE', `/staffing-tax-entries/${id}`)

export interface StaffingAnnualTaxGlobalFormData {
  employeeId: string
  year: number
  status?: StaffingAnnualTaxStatus
  fileDate?: string
  file?: File | null
}

export const saveAnnualTaxGlobal = (data: StaffingAnnualTaxGlobalFormData): Promise<void> => {
  const form = new FormData()
  form.set('employee_id', data.employeeId)
  form.set('year', String(data.year))
  if (data.status) form.set('status', data.status)
  if (data.fileDate) form.set('file_date', data.fileDate)
  if (data.file) form.set('file', data.file)

  return apiUpload('POST', '/staffing-annual-taxes', form)
}

export const updateStaffingEmployeeProfile = (employeeId: string, data: { staffing_company_id?: string | null, phone?: string | null, address?: string | null, ssn?: string | null }): Promise<void> =>
  apiRequest('PUT', `/staffing-annual-taxes/employee/${employeeId}`, data)

export const downloadGlobalTaxFile = (employeeId: string, fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/staffing-annual-taxes/${employeeId}/download`, fallbackFilename)

/** Fetches the attached document as a blob (auth header) and triggers a browser save. */
export const downloadTaxEntryFile = (entryId: string, fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/staffing-tax-entries/${entryId}/download`, fallbackFilename)
