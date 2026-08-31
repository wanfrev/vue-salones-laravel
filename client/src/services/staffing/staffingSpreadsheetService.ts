import { apiRequest } from '../../lib/api'

export const staffingSpreadsheetKeys = {
  vendedoras: (businessId?: string | null) => ['spreadsheet-vendedoras', businessId] as const,
  companies: (businessId?: string | null) => ['spreadsheet-companies', businessId] as const,
  rates: (businessId?: string | null, companyId?: string | null) =>
    ['spreadsheet-company-rates', businessId, companyId] as const,
}

export interface SpreadsheetVendedoraRow {
  id: string
  name: string
  canAccessSpreadsheet: boolean
}

export interface SpreadsheetCompanyRow {
  id: string
  name: string
}

export interface SpreadsheetEmployeeRateRow {
  employeeId: string
  name: string
  role: string
  shift: string | null
  payRate: number | null
  overtimePayRate: number | null
}

/** Access-management roster shown inside the module itself — empty for a non-admin caller. */
export const listSpreadsheetVendedoras = (): Promise<SpreadsheetVendedoraRow[]> =>
  apiRequest<SpreadsheetVendedoraRow[]>('GET', '/staffing-spreadsheet/vendedoras')

/** id/name only — never the full company record (overhead/tax rates aren't for a vendedora). */
export const listSpreadsheetCompanies = (): Promise<SpreadsheetCompanyRow[]> =>
  apiRequest<SpreadsheetCompanyRow[]>('GET', '/staffing-spreadsheet/companies')

/** Pay rate only, never bill rate — this sheet is about what the agency pays the employee. */
export const getSpreadsheetCompanyRates = (companyId: string): Promise<SpreadsheetEmployeeRateRow[]> =>
  apiRequest<SpreadsheetEmployeeRateRow[]>('GET', `/staffing-spreadsheet/companies/${companyId}/rates`)
