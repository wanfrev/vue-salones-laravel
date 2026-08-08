import { db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { staffingCompanyFormSchema, staffingRateFormSchema } from '../lib/validation'
import type { StaffingCompany, StaffingCompanyRate, StaffingTaxBracket } from '../types/database'

export const staffingCompanyKeys = {
  all: (businessId?: string | null, branchId?: string | null) =>
    ['staffing-companies', businessId, branchId] as const,
}

export const staffingRateKeys = {
  all: (businessId?: string | null) => ['staffing-company-rates', businessId] as const,
  byCompany: (businessId?: string | null, companyId?: string | null) =>
    ['staffing-company-rates', businessId, companyId] as const,
}

export type TaxDestination = 'remitted' | 'retained'
export type PayoutRounding = 'floor' | 'cent' | 'exact'

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
}

export interface StaffingRateRow {
  id: string
  companyId: string
  role: string
  payRate: number
  billRate: number
  /** What the agency keeps per hour, before withholdings. The reason the business exists. */
  hourlyMargin: number
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
  notes: string
}

export interface StaffingRateFormData {
  companyId: string
  role: string
  payRate: number
  billRate: number
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
})

const toRateRow = (row: StaffingCompanyRate): StaffingRateRow => ({
  id: row.id,
  companyId: row.company_id,
  role: row.role,
  payRate: Number(row.pay_rate ?? 0),
  billRate: Number(row.bill_rate ?? 0),
  hourlyMargin: Number(row.bill_rate ?? 0) - Number(row.pay_rate ?? 0),
  active: row.active,
})

export const listStaffingCompanies = async (
  businessId: string,
  branchId?: string | null,
): Promise<StaffingCompanyRow[]> => {
  let query = db
    .from('staffing_companies')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name', { ascending: true })

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
