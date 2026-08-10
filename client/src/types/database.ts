// Tipos mínimos de las tablas/funciones del esquema.
// Para una generación automática completa puedes correr:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// (o `--local` si trabajas con la CLI de Supabase localmente).

export type AppRole = 'superadmin' | 'admin' | 'empleado' | 'encargado' | 'cajero'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'cash_ves' | 'card' | 'transfer' | 'other' | 'zelle' | 'binance' | 'cashea' | 'pago_movil' | 'punto_venta' | 'mixed' | 'gift_card' | 'credito'
export type AppointmentSource = 'internal' | 'public'
export type EmployeeAbsenceType = 'break' | 'vacation' | 'sick_leave' | 'personal' | 'blocked'
export type InventoryMovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'return'
  | 'consumption'

export type ThemeConfig = {
  primary: string
  secondary: string
  [key: string]: string
}

export type Terminology = Record<string, string>

export interface Business {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  timezone: string
  currency: string
  ves_exchange_rate: number
  employee_ves_rate: number | null
  niche_type: string
  theme_config: ThemeConfig
  terminology: Terminology
  job_titles: string[]
  service_categories: string[]
  features: Record<string, boolean> | null
  /** Server-resolved (DEFAULT_FEATURES -> niche defaults -> stored -> niche locks). See NicheRegistry::resolveFeatures. */
  resolved_features?: Record<string, boolean>
  multi_branch_enabled: boolean
  active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  business_id: string | null
  branch_id: string | null
  full_name: string
  role: AppRole
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  email?: string | null
  active: boolean
  pay_type?: 'salary' | 'percentage' | 'mixed'
  pay_percentage?: number | null
  base_salary?: number | null
  salary_frequency?: 'weekly' | 'biweekly' | 'monthly' | null
  disable_agenda?: boolean
  disable_inventory_edit?: boolean
  can_access_finanzas?: boolean
  can_access_requirements?: boolean
  staffing_company_id?: string | null
  staffing_role?: string | null
  bank_name?: string | null
  bank_account_holder?: string | null
  bank_account_type?: string | null
  payment_method?: string | null
  // The raw numbers are never present in an API response — Profile::$hidden strips them
  // server-side. Only the masked last-4 accessors below ever reach the client.
  bank_account_last4?: string | null
  payroll_card_last4?: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSchedule {
  id: string
  employee_id: string
  branch_id: string | null
  weekday: number
  start_time: string
  end_time: string
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  description: string | null
  duration_minutes: number
  price: number
  local_percentage: number
  color: string | null
  category: string
  icon: string | null
  active: boolean
  linked_product_id: string | null
  linked_variant_id: string | null
  linked_products?: Array<{ id?: string; product_id: string; variant_id?: string | null; quantity: number }> | null
  linkedProducts?: Array<{ id?: string; product_id: string; variant_id?: string | null; quantity: number }> | null
  is_fixed_commission?: boolean
  fixed_commission_amount?: number | null
  fixed_commission_assistant_amount?: number | null
  created_at: string
  updated_at: string
}

export interface EmployeeService {
  employee_id: string
  service_id: string
}

export interface ClientPreferredService {
  client_id: string
  service_id: string
  branch_id: string | null
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  branch_id: string | null
  full_name: string
  phone: string
  email: string | null
  notes: string | null
  birthday: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  business_id: string
  client_id: string
  pet_id: string | null
  employee_id: string
  assistant_employee_id: string | null
  assistant_percentage: number | null
  employee_percentage_override: number | null
  branch_id: string | null
  service_id: string
  group_id: string | null
  start_time: string
  end_time: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  price_override: number | null
  duration_override: number | null
  service_notes: string | null
  internal_notes: string | null
  diagnosis: string | null
  treatment: string | null
  associated_products?: any
  reminder_sent_at: string | null
  source: AppointmentSource
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentWithRelations extends Appointment {
  clients?: Pick<Client, 'id' | 'full_name' | 'phone' | 'email'> | null
  client?: Pick<Client, 'id' | 'full_name' | 'phone' | 'email'> | null
  services?: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price' | 'color'> | null
  service?: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price' | 'color'> | null
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  employee_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  assistant_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  pets?: Pick<Pet, 'name'> | null
}

export interface Transaction {
  id: string
  business_id: string
  appointment_id: string
  branch_id: string | null
  total_amount: number
  local_amount: number
  employee_amount: number
  assistant_amount: number
  local_percentage: number
  employee_percentage: number
  assistant_percentage: number
  method: PaymentMethod
  exchange_rate_used: number
  payments_breakdown: any
  paid_at: string
  created_by: string | null
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  category: string
  amount: number
  currency: string
  original_amount: number
  exchange_rate_used: number
  expense_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeAbsence {
  id: string
  business_id: string
  employee_id: string
  type: EmployeeAbsenceType
  starts_at: string
  ends_at: string
  reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ServiceVariant {
  id: string
  business_id: string
  service_id: string
  name: string
  description: string | null
  duration_minutes: number | null
  price: number | null
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  business_id: string
  branch_id: string | null
  parent_id: string | null
  name: string
  description: string | null
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  business_id: string
  branch_id: string | null
  category_id: string | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  unit: string
  unit_cost: number
  unit_price: number
  reorder_point: number
  active: boolean
  is_sellable: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  branch_id: string | null
  name: string
  sku: string | null
  unit_cost: number
  unit_price: number
  metadata: Record<string, unknown>
  active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryLocation {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  is_default: boolean
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InventoryStock {
  id: string
  business_id: string
  branch_id: string | null
  location_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  reserved_qty: number
  updated_at: string
}

export interface InventoryMovement {
  id: string
  business_id: string
  branch_id: string | null
  location_id: string
  product_id: string
  variant_id: string | null
  movement_type: InventoryMovementType
  quantity: number
  unit_cost: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface EmployeePayment {
  id: string
  business_id: string
  branch_id: string | null
  employee_id: string
  amount: number
  currency: string
  original_amount: number
  exchange_rate_used: number
  payment_method: string
  type: string
  concept: string | null
  notes: string | null
  payment_date: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  business_id: string
  branch_id: string | null
  first_name: string
  last_name: string
  phone: string | null
  company: string | null
  total_debt: number
  debt_currency: string
  debt_original_amount: number
  debt_exchange_rate: number
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

/**
 * One tier of the payroll withholding. `threshold` is an exclusive upper bound and the matched
 * rate applies to the whole base, not marginally — a null threshold is the catch-all tier.
 */
export interface StaffingTaxBracket {
  threshold: number | null
  rate: number
}

/** A client company the agency places workers into — the "BILL TO" of the payroll sheets. */
export interface StaffingCompany {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  legal_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  work_site: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  payment_terms_days: number
  overtime_threshold_hours: number
  overtime_multiplier: number
  tax_brackets: StaffingTaxBracket[] | null
  /** 'remitted' = paid onward (a cost); 'retained' = kept by the agency (margin). */
  tax_destination: string
  /** 'floor' | 'cent' | 'exact' */
  payout_rounding: string
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

/** Per-role rate card: what the worker earns vs what the client is billed, for the same hour. */
export interface StaffingCompanyRate {
  id: string
  business_id: string
  company_id: string
  role: string
  pay_rate: number
  bill_rate: number
  active: boolean
  created_at: string
  updated_at: string
}

/** One employee's row on one week's timesheet — a single line of the NOMINA sheet. */
export interface StaffingTimesheetEntry {
  id: string
  business_id: string
  timesheet_id: string
  employee_id: string
  total_hours: number
  pre_tax_deduction: number
  fixed_fees: number
  adjustment: number
  /** Snapshot from the rate card at the moment these hours were entered — not a live join. */
  pay_rate: number
  bill_rate: number
  regular_hours: number
  overtime_hours: number
  gross: number
  tax_withheld: number
  net: number
  payout: number
  carried: number
  invoice_total: number
  employer_cost: number
  margin: number
  created_at: string
  updated_at: string
  employee?: Profile
}

/** One company's one week. `draft` is editable and recomputed live; `approved` is frozen. */
export interface StaffingTimesheet {
  id: string
  business_id: string
  company_id: string
  week_start: string
  week_end: string
  status: 'draft' | 'approved' | 'paid'
  terms_snapshot: Record<string, unknown> | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  entries: StaffingTimesheetEntry[]
}

/** The document Delta sends a client company — generated from one approved timesheet week. */
export interface StaffingInvoice {
  id: string
  business_id: string
  company_id: string
  timesheet_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  terms_days: number
  work_site: string | null
  subtotal: number
  total: number
  status: 'sent' | 'partial' | 'paid'
  created_at: string
  updated_at: string
  company?: StaffingCompany
  timesheet?: StaffingTimesheet
}

/** An abono against a company's balance — optionally tied to one invoice. */
export interface StaffingCompanyPayment {
  id: string
  business_id: string
  company_id: string
  invoice_id: string | null
  amount: number
  payment_method: string | null
  payment_date: string
  reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface StaffingCompanyBalance {
  invoiced: number
  paid: number
  pending: number
}

export interface SupplierPayment {
  id: string
  business_id: string
  branch_id: string | null
  supplier_id: string
  amount: number
  payment_method: string
  payment_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  is_default: boolean
  active: boolean
  ves_exchange_rate: number | null
  service_categories: string[]
  updated_at: string
}

export interface Requirement {
  id: string
  business_id: string
  name: string
  recommended_quantity: string
  recommended_brands: string | null
  guide_price: number | null
  status: 'pending' | 'purchased' | 'cancelled'
  created_by_profile_id: string | null
  creator?: { id: string; full_name: string } | null
  created_at: string
  updated_at: string
}

export interface Credit {
  id: string
  business_id: string
  branch_id: string | null
  client_id: string | null
  client_name: string
  client_phone: string | null
  transaction_id: string
  amount: number
  currency: string
  status: 'pending' | 'paid'
  paid_at: string | null
  paid_method: string | null
  created_by: string | null
  client?: { id: string; full_name: string; phone: string | null } | null
  created_at: string
  updated_at: string
}

type TableShape<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export interface Pet {
  id: string
  business_id: string
  client_id: string
  name: string
  breed: string | null
  weight: string | null
  birthday: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      businesses: TableShape<Business>
      branches: TableShape<Branch>
      profiles: TableShape<Profile>
      employee_schedules: TableShape<EmployeeSchedule>
      services: TableShape<Service>
      service_variants: TableShape<ServiceVariant>
      employee_services: TableShape<EmployeeService>
      client_preferred_services: TableShape<ClientPreferredService>
      clients: TableShape<Client>
      appointments: TableShape<Appointment>
      transactions: TableShape<Transaction>
      expenses: TableShape<Expense>
      employee_absences: TableShape<EmployeeAbsence>
      product_categories: TableShape<ProductCategory>
      products: TableShape<Product>
      product_variants: TableShape<ProductVariant>
      inventory_locations: TableShape<InventoryLocation>
      inventory_stock: TableShape<InventoryStock>
      inventory_movements: TableShape<InventoryMovement>
      employee_payments: TableShape<EmployeePayment>
      suppliers: TableShape<Supplier>
      supplier_payments: TableShape<SupplierPayment>
      staffing_companies: TableShape<StaffingCompany>
      staffing_company_rates: TableShape<StaffingCompanyRate>
      staffing_timesheets: TableShape<StaffingTimesheet>
      staffing_timesheet_entries: TableShape<StaffingTimesheetEntry>
      staffing_invoices: TableShape<StaffingInvoice>
      staffing_company_payments: TableShape<StaffingCompanyPayment>
      requirements: TableShape<Requirement>
    }
    Views: Record<string, never>
    Functions: {
      public_business_info: {
        Args: { p_slug: string }
        Returns: Array<Pick<Business, 'id' | 'name' | 'timezone' | 'currency' | 'niche_type' | 'theme_config' | 'terminology' | 'phone' | 'address'>>
      }
      public_list_services: {
        Args: { p_slug: string }
        Returns: Array<Pick<Service, 'id' | 'name' | 'description' | 'duration_minutes' | 'price' | 'color'>>
      }
      public_list_employees_for_service: {
        Args: { p_slug: string; p_service_id: string }
        Returns: Array<{ id: string; full_name: string; avatar_url: string | null }>
      }
      public_get_available_slots: {
        Args: {
          p_slug: string
          p_employee_id: string
          p_service_id: string
          p_date_from: string
          p_date_to: string
          p_slot_minutes?: number
        }
        Returns: Array<{ slot_start: string; slot_end: string }>
      }
      public_book_appointment: {
        Args: {
          p_slug: string
          p_employee_id: string
          p_service_id: string
          p_start_time: string
          p_client_name: string
          p_client_phone: string
          p_client_email?: string | null
          p_client_notes?: string | null
        }
        Returns: Array<{
          appointment_id: string
          start_time: string
          end_time: string
          status: AppointmentStatus
        }>
      }
      financial_summary: {
        Args: {
          p_business_id: string
          p_period_start: string
          p_period_end: string
          p_period?: 'day' | 'week' | 'month'
          p_employee_id?: string | null
        }
        Returns: Array<{
          bucket: string
          appointments: number
          total_amount: number
          local_amount: number
          employee_amount: number
        }>
      }
      record_payment: {
        Args: {
          p_appointment_id: string
          p_amount: number
          p_method?: PaymentMethod
          p_notes?: string | null
          p_exchange_rate?: number | null
          p_payments_breakdown?: string
        }
        Returns: string
      }
      record_sale: {
        Args: {
          p_appointment_id: string
          p_amount: number
          p_method?: PaymentMethod
          p_products?: string
          p_notes?: string | null
          p_exchange_rate?: number | null
          p_payments_breakdown?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: AppRole
      appointment_status: AppointmentStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      appointment_source: AppointmentSource
      employee_absence_type: EmployeeAbsenceType
      inventory_movement_type: InventoryMovementType
    }
    CompositeTypes: Record<string, never>
  }
}
