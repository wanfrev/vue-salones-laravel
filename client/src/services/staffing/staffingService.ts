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
export type PayoutRounding = 'floor' | 'cent' | 'exact'
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

/**
 * Defaults to 'active' so the two call sites that only ever want active companies
 * (StaffingHoursPanel.vue, StaffingEmployeeFields.vue) keep seeing exactly what they saw before
 * the status tabs existed. Pass 'all' for the Empresas screen's own tabbed list.
 */
export const listStaffingCompanies = async (
  businessId: string,
  branchId?: string | null,
  status: StaffingCompanyStatus | 'all' = 'active',
): Promise<StaffingCompanyRow[]> => {
  let query = db
    .from('staffing_companies')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las empresas')

  return ((data ?? []) as StaffingCompany[]).map(toCompanyRow)
}

export const saveStaffingCompany = async (
  _businessId: string,
  data: StaffingCompanyFormData & { id?: string },
  branchId?: string | null,
): Promise<StaffingCompanyRow> => {
  const parsed = staffingCompanyFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = {
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
    branch_id: branchId ?? null,
  }

  const { data: saved, error } = data.id
    ? await db.from('staffing_companies').update(payload).eq('id', data.id).select('*').single()
    : await db.from('staffing_companies').insert(payload).select('*').single()

  if (error) handleDbError(error, 'Error al guardar la empresa')

  return toCompanyRow(saved as StaffingCompany)
}

/** Soft delete — past payroll references this company's rate card. */
export const deleteStaffingCompany = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_companies').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la empresa')
}

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

  // The backend upserts on (company, role), so a re-sent role updates instead of colliding
  // with the unique index.
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

/** Input for one employee's hours on a week — mirrors App\Services\Staffing\TimesheetEntry. */
export interface TimesheetEntryInput {
  employeeId: string
  totalHours: number
  preTaxDeduction?: number
  fixedFees?: number
  adjustment?: number
}

/**
 * The employees assigned to a company (profile.staffing_company_id) — who the hours grid lists.
 * businessId isn't part of the URL — the backend resolves it from the authenticated profile —
 * but stays a parameter so the call site reads the same as every other staffing service function.
 */
export const listCompanyEmployees = (_businessId: string, companyId: string): Promise<Profile[]> =>
  apiRequest<Profile[]>('GET', `/staffing-companies/${companyId}/employees`)

export const listStaffingTimesheets = async (
  businessId: string,
  companyId?: string | null,
): Promise<StaffingTimesheet[]> => {
  let query = db.from('staffing_timesheets').select('*').eq('business_id', businessId)
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las semanas')

  return (data ?? []) as StaffingTimesheet[]
}

/**
 * Creates the draft for (company, week) if it doesn't exist yet, or replaces its entries if it
 * does — the caller always sends the full set of hours for the week, same as re-saving the sheet.
 * Runs the same calculator that reproduces the DYKE/HILTON/CWT spreadsheets exactly; the response
 * carries the computed regular/OT/gross/tax/net/payout/margin per employee.
 */
export const saveTimesheetWeek = async (
  companyId: string,
  weekStart: string,
  weekEnd: string,
  entries: TimesheetEntryInput[],
): Promise<StaffingTimesheet> => {
  const payload = {
    company_id: companyId,
    week_start: weekStart,
    week_end: weekEnd,
    entries: entries.map(e => ({
      employee_id: e.employeeId,
      total_hours: e.totalHours,
      pre_tax_deduction: e.preTaxDeduction ?? 0,
      fixed_fees: e.fixedFees ?? 0,
      adjustment: e.adjustment ?? 0,
    })),
  }

  const { data, error } = await db.from('staffing_timesheets').insert(payload).select('*').single()
  if (error) handleDbError(error, 'Error al guardar las horas')

  return data as StaffingTimesheet
}

/** Freezes the company's current overtime/tax/rounding rules onto the week — see the model docblock. */
export const approveTimesheet = (id: string): Promise<StaffingTimesheet> =>
  apiRequest<StaffingTimesheet>('POST', `/staffing-timesheets/${id}/approve`)

/** Marks an already-approved week as actually paid out to the employees. */
export const markTimesheetPaid = (id: string): Promise<StaffingTimesheet> =>
  apiRequest<StaffingTimesheet>('POST', `/staffing-timesheets/${id}/mark-paid`)

/** Only a draft can be deleted — an approved week is payroll history. */
export const deleteTimesheet = async (id: string): Promise<void> => {
  const { error } = await db.from('staffing_timesheets').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar la semana')
}

export const listStaffingInvoices = async (
  businessId: string,
  companyId?: string | null,
): Promise<StaffingInvoice[]> => {
  let query = db.from('staffing_invoices').select('*').eq('business_id', businessId)
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar las facturas')

  return (data ?? []) as StaffingInvoice[]
}

export const getStaffingInvoice = (id: string): Promise<StaffingInvoice> =>
  apiRequest<StaffingInvoice>('GET', `/staffing-invoices/${id}`)

/** One invoice per approved week — the total is whatever that week's entries already billed. */
export const generateStaffingInvoice = (timesheetId: string): Promise<StaffingInvoice> =>
  apiRequest<StaffingInvoice>('POST', '/staffing-invoices/generate', { timesheet_id: timesheetId })

export const getCompanyBalance = (companyId: string): Promise<StaffingCompanyBalance> =>
  apiRequest<StaffingCompanyBalance>('GET', `/staffing-companies/${companyId}/balance`)

/** Deletes an invoice and reopens its week to draft so the nómina can be edited again. */
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

/** Year-wide, per-company weekly headcount for the Empresas status tabs — 2 queries server-side. */
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

/** Inline "Proyecto" edit from the weekly report — a partial update, not the full company form. */
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

/** Year-wide, per-employee weekly hours for the "Horas Reportadas" report tab. */
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

/** Total hours per company for a week, a month, or a whole year — "Horas Reportadas > Por empresa". */
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

/** Invoiced hours / employer cost / margin for a date range — Finanzas > Resumen (staffing). */
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

/**
 * One row per (employee, company) direct-deposit payout due for an already-approved/paid week —
 * the "lista de depósitos" that guides the bank run, generated off the same numbers nómina
 * already computed rather than copied onto paper by hand.
 */
export const getStaffingDepositList = (weekStart: string): Promise<StaffingDepositListRow[]> =>
  apiRequest<StaffingDepositListRow[]>('GET', `/staffing-reports/deposit-list?week_start=${weekStart}`)

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

export interface StaffingAnnualTaxEmployeeRow {
  employeeId: string
  name: string
  active: boolean
  companyName: string | null
  phone: string | null
  address: string | null
  ssnLast4: string | null
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

/** Multipart upsert by (employee, tax entity, year) — see StaffingTaxEntryController::store(). */
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

/** Fetches the attached document as a blob (auth header) and triggers a browser save. */
export const downloadTaxEntryFile = (entryId: string, fallbackFilename: string): Promise<void> =>
  apiDownloadFile(`/staffing-tax-entries/${entryId}/download`, fallbackFilename)
