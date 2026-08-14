import { apiRequest, db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { staffingCompanyFormSchema, staffingCompanyPaymentFormSchema, staffingRateFormSchema } from '../lib/validation'
import type {
  Profile, StaffingCompany, StaffingCompanyBalance, StaffingCompanyPayment, StaffingCompanyRate,
  StaffingInvoice, StaffingTaxBracket, StaffingTimesheet,
} from '../types/database'

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

export type TaxDestination = 'remitted' | 'retained'
export type PayoutRounding = 'floor' | 'cent' | 'exact'
export type StaffingCompanyStatus = 'active' | 'inactive' | 'on_hold'

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
  overtimeThresholdHours: number
  overtimeMultiplier: number
  taxBrackets: StaffingTaxBracket[]
  taxDestination: TaxDestination
  payoutRounding: PayoutRounding
  notes: string
  active: boolean
  status: StaffingCompanyStatus
}

export interface StaffingRateRow {
  id: string
  companyId: string
  role: string
  payRate: number
  billRate: number
  /** What the agency keeps per hour, before withholdings. The reason the business exists. */
  hourlyMargin: number
  /** Null = falls back to the company's own overtime terms. */
  overtimeThresholdHours: number | null
  overtimeMultiplier: number | null
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
  overtimeThresholdHours: number
  overtimeMultiplier: number
  taxBrackets: StaffingTaxBracket[]
  taxDestination: TaxDestination
  payoutRounding: PayoutRounding
  status: StaffingCompanyStatus
  notes: string
}

export interface StaffingRateFormData {
  companyId: string
  role: string
  payRate: number
  billRate: number
  overtimeThresholdHours: number | null
  overtimeMultiplier: number | null
}

/** DYKE's agreement — the shape a brand-new company starts from. */
export const DEFAULT_TAX_BRACKETS: StaffingTaxBracket[] = [
  { threshold: 500, rate: 0.035 },
  { threshold: null, rate: 0.07 },
]

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
  overtimeThresholdHours: Number(row.overtime_threshold_hours ?? 40),
  overtimeMultiplier: Number(row.overtime_multiplier ?? 1.5),
  taxBrackets: row.tax_brackets ?? [],
  taxDestination: (row.tax_destination as TaxDestination) || 'remitted',
  payoutRounding: (row.payout_rounding as PayoutRounding) || 'cent',
  notes: row.notes ?? '',
  active: row.active,
  status: row.status ?? (row.active ? 'active' : 'inactive'),
})

const toRateRow = (row: StaffingCompanyRate): StaffingRateRow => ({
  id: row.id,
  companyId: row.company_id,
  role: row.role,
  payRate: Number(row.pay_rate ?? 0),
  billRate: Number(row.bill_rate ?? 0),
  hourlyMargin: Number(row.bill_rate ?? 0) - Number(row.pay_rate ?? 0),
  overtimeThresholdHours: row.overtime_threshold_hours == null ? null : Number(row.overtime_threshold_hours),
  overtimeMultiplier: row.overtime_multiplier == null ? null : Number(row.overtime_multiplier),
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
    overtime_threshold_hours: parsed.data.overtimeThresholdHours,
    overtime_multiplier: parsed.data.overtimeMultiplier,
    tax_brackets: parsed.data.taxBrackets,
    tax_destination: parsed.data.taxDestination,
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
    pay_rate: parsed.data.payRate,
    bill_rate: parsed.data.billRate,
    overtime_threshold_hours: parsed.data.overtimeThresholdHours,
    overtime_multiplier: parsed.data.overtimeMultiplier,
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
