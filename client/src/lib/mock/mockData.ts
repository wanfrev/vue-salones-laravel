import type {
  Business, Profile, EmployeeSchedule, Service,
  Client, Appointment, Transaction, EmployeePayment,
  ProductCategory, Product, ProductVariant,
  InventoryLocation, InventoryStock, InventoryMovement,
  Branch
} from '../../types/database'

const BIZ = '00000000-0000-0000-0000-000000000001'
const BIZ2 = '00000000-0000-0000-0000-000000000002'
const BRANCH = '00000000-0000-0000-0000-000000000010'
const ADMIN = '00000000-0000-0000-0000-000000000100'
const SUPERADMIN = '00000000-0000-0000-0000-000000000101'
const EMP1 = '00000000-0000-0000-0000-000000000201'
const EMP2 = '00000000-0000-0000-0000-000000000202'
const EMP3 = '00000000-0000-0000-0000-000000000203'
const CAT1 = '00000000-0000-0000-0000-000000000501'
const CAT2 = '00000000-0000-0000-0000-000000000502'
const PROD1 = '00000000-0000-0000-0000-000000000601'
const PROD2 = '00000000-0000-0000-0000-000000000602'
const VAR1 = '00000000-0000-0000-0000-000000000701'
const VAR2 = '00000000-0000-0000-0000-000000000702'
const LOC1 = '00000000-0000-0000-0000-000000000801'
const LOC2 = '00000000-0000-0000-0000-000000000802'

export interface MockDataStore {
  businesses: Business[]
  branches: Branch[]
  profiles: Profile[]
  employee_schedules: EmployeeSchedule[]
  services: Service[]
  service_categories: any[]
  service_variants: any[]
  employee_services: { employee_id: string; service_id: string }[]
  clients: Client[]
  client_preferred_services: { client_id: string; service_id: string; created_at: string }[]
  appointments: Appointment[]
  transactions: Transaction[]
  expenses: any[]
  employee_absences: any[]
  product_categories: ProductCategory[]
  products: Product[]
  product_variants: ProductVariant[]
  inventory_locations: InventoryLocation[]
  inventory_stock: InventoryStock[]
  inventory_movements: InventoryMovement[]
  employee_payments: EmployeePayment[]
  [key: string]: any[]
}

function dateOffset(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export const MOCK_USER_ID = ADMIN
export const MOCK_BUSINESS_ID = BIZ
export const MOCK_EMAIL = 'admin@demo.com'
export const MOCK_PASSWORD = 'demo123'
export const SUPERADMIN_USER_ID = SUPERADMIN
export const SUPERADMIN_EMAIL = 'superadmin@demo.com'
export const SUPERADMIN_PASSWORD = 'superdemo123'
export const EMPLOYEE_USER_ID = EMP3
export const EMPLOYEE_EMAIL = 'empleado@demo.com'
export const EMPLOYEE_PASSWORD = 'demo123'

export function createMockDataStore(): MockDataStore {
  const now = new Date().toISOString()

  const businesses = ([{
    id: BIZ, name: 'Salón Demo', slug: 'demo',
    phone: '+525551234567', address: 'Av. Principal #123',
    timezone: 'America/New_York', currency: 'USD', ves_exchange_rate: 36.50,
    niche_type: 'salon',
    theme_config: { primary: '#90A58A', secondary: '#A8BF9E' },
    terminology: {
      client: 'Cliente',
      employee: 'Empleado',
      service: 'Servicio',
      appointment: 'Cita',
      staff: 'Personal',
      pet: 'Mascota',
      owner: 'Dueño',
      breed: 'Raza',
      weight: 'Peso',
      vaccines: 'Vacunas',
    },
    active: true,
    multi_branch_enabled: false,
    features: { pos: true, inventario: true, productos: true, proveedores: true, multi_branch: false },
    job_titles: [],
    service_categories: [],
    deleted_at: null,
    created_at: now, updated_at: now,
  }, {
    id: BIZ2, name: 'Barbería El Clásico', slug: 'barberia-clasico',
    phone: '+525551234000', address: 'Calle Real #456',
    timezone: 'America/New_York', currency: 'USD', ves_exchange_rate: 36.50,
    niche_type: 'barberia',
    theme_config: { primary: '#90A58A', secondary: '#A8BF9E' },
    terminology: {
      client: 'Cliente',
      employee: 'Barbero',
      service: 'Servicio',
      appointment: 'Cita',
      staff: 'Personal',
      pet: 'Mascota',
      owner: 'Dueño',
      breed: 'Raza',
      weight: 'Peso',
      vaccines: 'Vacunas',
    },
    active: true,
    multi_branch_enabled: false,
    features: { pos: true, inventario: true, productos: true, proveedores: true, multi_branch: false },
    job_titles: [],
    service_categories: [],
    deleted_at: null,
    created_at: now, updated_at: now,
  }] as any) as Business[]

  const profiles: Profile[] = [
    { id: SUPERADMIN, business_id: null, full_name: 'Super Admin', email: 'superadmin@demo.com', role: 'superadmin', job_title: null, phone: null, avatar_url: null, active: true, created_at: now, updated_at: now },
    { id: ADMIN, business_id: BIZ, full_name: 'Admin Demo', email: 'admin@demo.com', role: 'admin', job_title: 'Administrador', phone: '+525551234500', avatar_url: null, active: true, created_at: now, updated_at: now },
    { id: EMP1, business_id: BIZ, full_name: 'María García', email: 'maria@demo.com', role: 'empleado', job_title: 'Estilista Senior', phone: '+525551234501', avatar_url: null, active: true, pay_type: 'percentage', pay_percentage: 50, base_salary: null, created_at: now, updated_at: now },
    { id: EMP2, business_id: BIZ, full_name: 'Ana López', email: 'ana@demo.com', role: 'empleado', job_title: 'Manicurista', phone: '+525551234502', avatar_url: null, active: true, pay_type: 'percentage', pay_percentage: 50, base_salary: null, created_at: now, updated_at: now },
    { id: EMP3, business_id: BIZ, full_name: 'Sofía Martínez', email: 'sofia@demo.com', role: 'empleado', job_title: 'Barbera', phone: '+525551234503', avatar_url: null, active: true, pay_type: 'percentage', pay_percentage: 50, base_salary: null, created_at: now, updated_at: now },
  ]

  const employee_schedules: EmployeeSchedule[] = [
    { id: 'sch-1', employee_id: EMP1, branch_id: BRANCH, weekday: 1, start_time: '09:00', end_time: '18:00', created_at: now },
    { id: 'sch-2', employee_id: EMP1, branch_id: BRANCH, weekday: 2, start_time: '09:00', end_time: '18:00', created_at: now },
    { id: 'sch-3', employee_id: EMP1, branch_id: BRANCH, weekday: 3, start_time: '09:00', end_time: '18:00', created_at: now },
    { id: 'sch-4', employee_id: EMP1, branch_id: BRANCH, weekday: 4, start_time: '09:00', end_time: '18:00', created_at: now },
    { id: 'sch-5', employee_id: EMP1, branch_id: BRANCH, weekday: 5, start_time: '09:00', end_time: '18:00', created_at: now },
    { id: 'sch-6', employee_id: EMP1, branch_id: BRANCH, weekday: 6, start_time: '09:00', end_time: '15:00', created_at: now },
    { id: 'sch-7', employee_id: EMP2, branch_id: BRANCH, weekday: 1, start_time: '10:00', end_time: '19:00', created_at: now },
    { id: 'sch-8', employee_id: EMP2, branch_id: BRANCH, weekday: 2, start_time: '10:00', end_time: '19:00', created_at: now },
    { id: 'sch-9', employee_id: EMP2, branch_id: BRANCH, weekday: 3, start_time: '10:00', end_time: '19:00', created_at: now },
    { id: 'sch-10', employee_id: EMP2, branch_id: BRANCH, weekday: 4, start_time: '10:00', end_time: '19:00', created_at: now },
    { id: 'sch-11', employee_id: EMP2, branch_id: BRANCH, weekday: 5, start_time: '10:00', end_time: '19:00', created_at: now },
    { id: 'sch-12', employee_id: EMP2, branch_id: BRANCH, weekday: 6, start_time: '09:00', end_time: '14:00', created_at: now },
    { id: 'sch-13', employee_id: EMP3, branch_id: BRANCH, weekday: 1, start_time: '09:00', end_time: '17:00', created_at: now },
    { id: 'sch-14', employee_id: EMP3, branch_id: BRANCH, weekday: 2, start_time: '09:00', end_time: '17:00', created_at: now },
    { id: 'sch-15', employee_id: EMP3, branch_id: BRANCH, weekday: 3, start_time: '09:00', end_time: '17:00', created_at: now },
    { id: 'sch-16', employee_id: EMP3, branch_id: BRANCH, weekday: 4, start_time: '09:00', end_time: '17:00', created_at: now },
    { id: 'sch-17', employee_id: EMP3, branch_id: BRANCH, weekday: 5, start_time: '09:00', end_time: '17:00', created_at: now },
    { id: 'sch-18', employee_id: EMP3, branch_id: BRANCH, weekday: 6, start_time: '10:00', end_time: '16:00', created_at: now },
  ]

  const services: Service[] = [
    { id: '00000000-0000-0000-0000-000000000301', business_id: BIZ, branch_id: null, name: 'Corte de cabello', description: 'Corte para dama o caballero', duration_minutes: 45, price: 250, local_percentage: 50, color: '#3B82F6', category: 'cabello', icon: 'scissors', active: true, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000302', business_id: BIZ, branch_id: null, name: 'Manicure', description: 'Manicure completo con esmaltado', duration_minutes: 30, price: 180, local_percentage: 40, color: '#EC4899', category: 'uñas', icon: 'hand', active: true, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000303', business_id: BIZ, branch_id: null, name: 'Pedicure', description: 'Pedicure completo', duration_minutes: 40, price: 220, local_percentage: 40, color: '#F59E0B', category: 'uñas', icon: 'foot', active: true, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000304', business_id: BIZ, branch_id: null, name: 'Tinte completo', description: 'Coloración completa del cabello', duration_minutes: 120, price: 600, local_percentage: 60, color: '#8B5CF6', category: 'color', icon: 'palette', active: true, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000305', business_id: BIZ, branch_id: null, name: 'Corte de barba', description: 'Arreglo de barba y bigote', duration_minutes: 30, price: 150, local_percentage: 50, color: '#10B981', category: 'barbería', icon: 'razor', active: true, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000306', business_id: BIZ, branch_id: null, name: 'Peinado', description: 'Peinado para ocasión especial', duration_minutes: 60, price: 350, local_percentage: 50, color: '#F472B6', category: 'cabello', icon: 'hair', active: true, created_at: now, updated_at: now },
  ]

  const employee_services = [
    { employee_id: EMP1, service_id: '00000000-0000-0000-0000-000000000301' },
    { employee_id: EMP1, service_id: '00000000-0000-0000-0000-000000000304' },
    { employee_id: EMP1, service_id: '00000000-0000-0000-0000-000000000306' },
    { employee_id: EMP2, service_id: '00000000-0000-0000-0000-000000000302' },
    { employee_id: EMP2, service_id: '00000000-0000-0000-0000-000000000303' },
    { employee_id: EMP3, service_id: '00000000-0000-0000-0000-000000000301' },
    { employee_id: EMP3, service_id: '00000000-0000-0000-0000-000000000305' },
  ]

  const clients: Client[] = [
    { id: '00000000-0000-0000-0000-000000000401', business_id: BIZ, branch_id: null, full_name: 'Laura Pérez', phone: '+525551234601', email: 'laura@ejemplo.com', notes: 'Cliente regular', birthday: '1990-05-15', metadata: { hair_type: 'rizado', hair_length: 'largo', chemical_history: 'decoloracion hace 6 meses' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000402', business_id: BIZ, branch_id: null, full_name: 'Carlos Ruiz', phone: '+525551234602', email: 'carlos@ejemplo.com', notes: null, birthday: '1985-11-20', metadata: { hair_type: 'liso', beard_style: 'corta', fade_preference: 'medio' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000403', business_id: BIZ, branch_id: null, full_name: 'Diana Torres', phone: '+525551234603', email: null, notes: 'Prefiere sábados', birthday: null, metadata: {}, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000404', business_id: BIZ, branch_id: null, full_name: 'Eduardo Vega', phone: '+525551234604', email: 'eduardo@ejemplo.com', notes: null, birthday: '1992-08-10', metadata: { skin_type: 'mixta', massage_preference: 'relajante' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000405', business_id: BIZ, branch_id: null, full_name: 'Gabriela Núñez', phone: '+525551234605', email: 'gabriela@ejemplo.com', notes: 'Alérgica a cierto tinte', birthday: '1988-03-25', metadata: { hair_type: 'ondulado', hair_length: 'medio', chemical_history: 'tinte permanente' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000406', business_id: BIZ, branch_id: null, full_name: 'Héctor Mendoza', phone: '+525551234606', email: null, notes: null, birthday: null, metadata: { skin_type: 'sensible', massage_preference: 'descontracturante', allergies: 'aceite de almendras' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000407', business_id: BIZ, branch_id: null, full_name: 'Isabel Rivas', phone: '+525551234607', email: 'isabel@ejemplo.com', notes: 'Cliente nueva', birthday: '1995-12-05', metadata: {}, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000408', business_id: BIZ, branch_id: null, full_name: 'Jorge Salinas', phone: '+525551234608', email: 'jorge@ejemplo.com', notes: 'Paga con tarjeta', birthday: '1982-07-14', metadata: { beard_style: 'larga', hair_type: 'crespo', fade_preference: 'alto', products_used: 'cera' }, created_at: now, updated_at: now },
    { id: '00000000-0000-0000-0000-000000000409', business_id: BIZ, branch_id: null, full_name: 'Firulais (Golden)', phone: '+525551234609', email: null, notes: 'Paciente canino', birthday: '2022-03-10', metadata: { pet_name: 'Firulais', pet_breed: 'Golden Retriever', pet_weight: '28 kg', pet_owner: 'Laura Pérez' }, created_at: now, updated_at: now },
  ]

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

  function buildAppointment(id: string, employeeId: string, serviceIdx: number, clientIdx: number, dayOffset: number, hour: number, status: string): Appointment {
    const svc = services[serviceIdx]
    const cl = clients[clientIdx]
    const start = new Date(monday)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + svc.duration_minutes * 60000)
    return {
      id, business_id: BIZ,
      branch_id: BRANCH,
      client_id: cl.id, employee_id: employeeId, service_id: svc.id,
      assistant_employee_id: null, assistant_percentage: null,
      employee_percentage_override: null,
      group_id: null,
      start_time: start.toISOString(), end_time: end.toISOString(),
      status: status as Appointment['status'],
      payment_status: 'unpaid',
      price_override: null,
      duration_override: null,
      service_notes: null, internal_notes: null,
      reminder_sent_at: null,
      source: 'internal',
      created_by: ADMIN,
      created_at: now, updated_at: now,
    }
  }

  const appointments: Appointment[] = [
    buildAppointment('apt-01', EMP1, 0, 0, 0, 10, 'confirmed'),
    buildAppointment('apt-02', EMP1, 3, 4, 0, 14, 'confirmed'),
    buildAppointment('apt-03', EMP2, 1, 2, 0, 11, 'confirmed'),
    buildAppointment('apt-04', EMP3, 0, 3, 0, 10, 'completed'),
    buildAppointment('apt-05', EMP3, 4, 7, 0, 15, 'confirmed'),
    buildAppointment('apt-06', EMP1, 0, 5, 1, 9, 'pending'),
    buildAppointment('apt-07', EMP2, 2, 1, 1, 14, 'confirmed'),
    buildAppointment('apt-08', EMP3, 4, 3, 1, 11, 'confirmed'),
    buildAppointment('apt-09', EMP1, 5, 0, 2, 10, 'confirmed'),
    buildAppointment('apt-10', EMP2, 1, 6, 2, 12, 'pending'),
    buildAppointment('apt-11', EMP1, 3, 4, 3, 15, 'confirmed'),
    buildAppointment('apt-12', EMP3, 0, 5, 3, 9, 'completed'),
    buildAppointment('apt-13', EMP2, 2, 2, 4, 11, 'confirmed'),
    buildAppointment('apt-14', EMP1, 0, 7, 4, 13, 'cancelled'),
    buildAppointment('apt-15', EMP3, 5, 6, 5, 10, 'confirmed'),
  ]

  const transactions: Transaction[] = [
    {
      id: 'txn-01', business_id: BIZ, branch_id: BRANCH, appointment_id: 'apt-04',
      total_amount: 250, local_amount: 125, employee_amount: 125,
      assistant_amount: 0, local_percentage: 50, employee_percentage: 50,
      assistant_percentage: 0,
      method: 'cash', exchange_rate_used: 36.50, payments_breakdown: [], paid_at: dateOffset(-1).toISOString(),
      created_by: ADMIN, notes: null, created_at: now,
    },
    {
      id: 'txn-02', business_id: BIZ, branch_id: BRANCH, appointment_id: 'apt-12',
      total_amount: 250, local_amount: 125, employee_amount: 125,
      assistant_amount: 0, local_percentage: 50, employee_percentage: 50,
      assistant_percentage: 0,
      method: 'card', exchange_rate_used: 36.50, payments_breakdown: [], paid_at: dateOffset(-2).toISOString(),
      created_by: ADMIN, notes: null, created_at: now,
    },
  ]

  const product_categories: ProductCategory[] = [
    { id: CAT1, business_id: BIZ, branch_id: null, parent_id: null, name: 'Shampoos y Tratamientos', description: 'Productos para el cuidado capilar', active: true, metadata: {}, created_at: now, updated_at: now },
    { id: CAT2, business_id: BIZ, branch_id: null, parent_id: null, name: 'Antipulgas y Accesorios', description: 'Accesorios para mascotas', active: true, metadata: {}, created_at: now, updated_at: now },
  ]

  const products: Product[] = [
    { id: PROD1, business_id: BIZ, branch_id: null, category_id: CAT1, name: 'Shampoo Kerastase', description: 'Shampoo profesional para cabello teñido', sku: 'KER-SHM-001', barcode: '7501234567890', unit: 'botella', unit_cost: 180, unit_price: 350, reorder_point: 5, active: true, is_sellable: true, metadata: {}, created_at: now, updated_at: now },
    { id: PROD2, business_id: BIZ, branch_id: null, category_id: CAT2, name: 'Collar Antipulgas', description: 'Collar antipulgas para perros', sku: 'COL-ANT-001', barcode: '7509876543210', unit: 'unidad', unit_cost: 250, unit_price: 450, reorder_point: 3, active: true, is_sellable: true, metadata: {}, created_at: now, updated_at: now },
  ]

  const product_variants: ProductVariant[] = [
    { id: VAR1, product_id: PROD1, branch_id: null, name: '250ml', sku: 'KER-SHM-250', unit_cost: 180, unit_price: 350, metadata: {}, active: true, created_at: now, updated_at: now },
    { id: VAR2, product_id: PROD1, branch_id: null, name: '500ml', sku: 'KER-SHM-500', unit_cost: 300, unit_price: 580, metadata: {}, active: true, created_at: now, updated_at: now },
  ]

  const inventory_locations: InventoryLocation[] = [
    { id: LOC1, business_id: BIZ, branch_id: null, name: 'Vitrina Principal', is_default: true, active: true, metadata: {}, created_at: now, updated_at: now },
    { id: LOC2, business_id: BIZ, branch_id: null, name: 'Mostrador Tienda', is_default: false, active: true, metadata: {}, created_at: now, updated_at: now },
  ]

  const inventory_stock: InventoryStock[] = [
    { id: 'stk-01', business_id: BIZ, branch_id: BRANCH, location_id: LOC1, product_id: PROD1, variant_id: VAR1, quantity: 20, reserved_qty: 0, updated_at: now },
    { id: 'stk-02', business_id: BIZ, branch_id: BRANCH, location_id: LOC1, product_id: PROD1, variant_id: VAR2, quantity: 10, reserved_qty: 0, updated_at: now },
    { id: 'stk-03', business_id: BIZ, branch_id: BRANCH, location_id: LOC2, product_id: PROD2, variant_id: null, quantity: 50, reserved_qty: 0, updated_at: now },
  ]

  const inventory_movements: InventoryMovement[] = [
    { id: 'mov-01', business_id: BIZ, branch_id: BRANCH, location_id: LOC1, product_id: PROD1, variant_id: VAR1, movement_type: 'purchase', quantity: 20, unit_cost: 180, reference_type: null, reference_id: null, notes: 'Compra inicial', created_by: ADMIN, created_at: now },
    { id: 'mov-02', business_id: BIZ, branch_id: BRANCH, location_id: LOC1, product_id: PROD1, variant_id: VAR2, movement_type: 'purchase', quantity: 10, unit_cost: 300, reference_type: null, reference_id: null, notes: 'Compra inicial', created_by: ADMIN, created_at: now },
    { id: 'mov-03', business_id: BIZ, branch_id: BRANCH, location_id: LOC2, product_id: PROD2, variant_id: null, movement_type: 'purchase', quantity: 50, unit_cost: 250, reference_type: null, reference_id: null, notes: 'Compra inicial', created_by: ADMIN, created_at: now },
  ]

  const branches: Branch[] = [
    { id: BRANCH, business_id: BIZ, name: 'Sucursal Principal', address: 'Av. Principal 123', phone: '+525551234500', is_default: true, active: true, ves_exchange_rate: 36.5, created_at: now, updated_at: now },
  ]

  const employee_payments: EmployeePayment[] = [
    { id: 'ep-01', business_id: BIZ, branch_id: null, employee_id: EMP1, amount: 125, currency: 'USD', original_amount: 0, exchange_rate_used: 1, payment_method: 'cash', type: 'payment', concept: null, notes: 'Pago comisión servicios', payment_date: dateOffset(-1).toISOString().slice(0, 10), created_by: ADMIN, created_at: now, updated_at: now },
    { id: 'ep-02', business_id: BIZ, branch_id: null, employee_id: EMP2, amount: 80, currency: 'USD', original_amount: 0, exchange_rate_used: 1, payment_method: 'transfer', type: 'payment', concept: null, notes: 'Anticipo semanal', payment_date: dateOffset(-3).toISOString().slice(0, 10), created_by: ADMIN, created_at: now, updated_at: now },
    { id: 'ep-03', business_id: BIZ, branch_id: null, employee_id: EMP3, amount: 90, currency: 'USD', original_amount: 0, exchange_rate_used: 1, payment_method: 'cash', type: 'payment', concept: null, notes: 'Pago comisión servicios', payment_date: dateOffset(-2).toISOString().slice(0, 10), created_by: ADMIN, created_at: now, updated_at: now },
  ]

  return {
    businesses, profiles, employee_schedules,
    services, service_categories: [], service_variants: [],
    employee_services, clients,
    client_preferred_services: [],
    appointments, transactions, expenses: [],
    employee_absences: [],
    product_categories, products, product_variants,
    inventory_locations, inventory_stock, inventory_movements,
    branches,
    employee_payments,
  }
}
