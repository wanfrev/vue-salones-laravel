import { z } from 'zod'

const paymentMethodSchema = z.enum(['cash', 'cash_ves', 'card', 'transfer', 'other', 'zelle', 'binance', 'cashea', 'pago_movil', 'punto_venta', 'mixed', 'gift_card', 'credito'])

export const serviceItemSchema = z.object({
  serviceId: z.string().min(1, 'Selecciona un servicio'),
  employeeId: z.string().min(1, 'Selecciona un empleado'),
  assistantEmployeeId: z.string().default(''),
  assistantPercentage: z.number().min(0).max(100).default(0),
  employeePercentageOverride: z.number().min(0).max(100).optional(),
  duration: z.number().positive('La duración debe ser positiva'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
})

const citaAssociatedProductSchema = z.object({
  productId: z.string(),
  productName: z.string().optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  unitCost: z.number().min(0).optional(),
})

export const citaFormSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'El nombre del cliente es requerido'),
  clientPhone: z.string().default(''),
  petId: z.string().optional(),
  service: z.string().min(1, 'Selecciona un servicio'),
  employee: z.string().min(1, 'Selecciona un empleado'),
  assistantEmployee: z.string().default(''),
  assistantPercentage: z.number().min(0).max(100).default(0),
  employeePercentageOverride: z.number().min(0).max(100).optional(),
  duration: z.number().positive('La duración debe ser positiva'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  extraServices: z.array(serviceItemSchema).default([]),
  date: z.string().min(1, 'Selecciona una fecha'),
  time: z.string().min(1, 'Selecciona una hora'),
  status: z.enum(['confirmed', 'pending', 'paid', 'completed', 'in_progress', 'no_show']).default('pending'),
  notes: z.string().default(''),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  associatedProducts: z.array(citaAssociatedProductSchema).optional(),
  clinicalHistory: z.record(z.string()).optional(),
  source: z.string().optional(),
})

const posProductItemSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  variantId: z.string().nullable(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitCost: z.number().min(0, 'El costo no puede ser negativo'),
  productName: z.string().optional(),
  variantName: z.string().nullable().optional(),
  unitPrice: z.number().optional(),
  subtotal: z.number().optional(),
})

const paymentBreakdownItemSchema = z.object({
  method: paymentMethodSchema,
  inputAmount: z.number().min(0, 'El monto no puede ser negativo'),
  currency: z.enum(['USD', 'VES']),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
})

export const posSaleSchema = z.object({
  appointmentId: z.string().min(1, 'Selecciona una cita'),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  method: paymentMethodSchema,
  products: z.array(posProductItemSchema).default([]),
  notes: z.string().default(''),
  exchangeRate: z.number().min(0, 'La tasa de cambio no puede ser negativa'),
  paymentsBreakdown: z.array(paymentBreakdownItemSchema).min(1, 'Agrega al menos un método de pago'),
})

export const expenseFormSchema = z.object({
  name: z.string().min(1, 'El concepto es requerido'),
  category: z.string().min(1, 'Selecciona una categoría'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  currency: z.enum(['USD', 'VES']),
  expenseDate: z.string().min(1, 'Selecciona una fecha'),
  notes: z.string().default(''),
})

export const clienteFormSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es requerido'),
  phone: z.string().min(1, 'El teléfono del cliente es requerido'),
  email: z.string().email('Email inválido').or(z.literal('')).default(''),
  code: z.string().max(20, 'Máximo 20 caracteres').default(''),
  notes: z.string().default(''),
  birthday: z.string().default(''),
  preferredServices: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  pets: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    breed: z.string().optional(),
    weight: z.string().optional(),
    birthday: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    _delete: z.boolean().optional(),
  })).optional(),
})

export const supplierFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().default(''),
  company: z.string().default(''),
  totalDebt: z.number().min(0, 'La deuda no puede ser negativa'),
  debtCurrency: z.enum(['USD', 'VES']),
  notes: z.string().default(''),
})

export const supplierPaymentFormSchema = z.object({
  supplierId: z.string().min(1, 'Selecciona un proveedor'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  currency: z.enum(['USD', 'VES']),
  paymentMethod: z.string().min(1, 'Selecciona un método'),
  paymentDate: z.string().min(1, 'Selecciona una fecha'),
  notes: z.string().default(''),
})

const staffingCompanyRoleSchema = z.object({
  role: z.string().min(1, 'El rol es requerido'),
  payRate: z.number().min(0, 'La tarifa no puede ser negativa'),
  billRate: z.number().min(0, 'La tarifa no puede ser negativa'),
  overtimeThresholdHours: z.number().min(0, 'Las horas no pueden ser negativas').default(40),
  overtimePayRate: z.number().min(0, 'La tarifa OT no puede ser negativa').optional(),
  overtimeBillRate: z.number().min(0, 'La tarifa OT cobrada no puede ser negativa').optional(),
}).refine(r => r.billRate >= r.payRate, {
  message: 'Lo que cobras a la empresa no puede ser menor a lo que le pagas al empleado',
  path: ['billRate'],
}).refine(r => (r.overtimeBillRate == null || r.overtimePayRate == null) || r.overtimeBillRate >= r.overtimePayRate, {
  message: 'El cobro de OT a la empresa no puede ser menor al pago de OT al empleado',
  path: ['overtimeBillRate'],
})

export const staffingCompanyFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  legalName: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  zip: z.string().default(''),
  workSite: z.string().default(''),
  contactName: z.string().default(''),
  contactPhone: z.string().default(''),
  contactEmail: z.string().email('El email no es válido').or(z.literal('')).default(''),
  paymentTermsDays: z.number().int().min(0).max(365).default(15),
  taxRate: z.number().min(0, 'El porcentaje no puede ser negativo').max(1, 'Usa una fracción: 0.04 = 4%').default(0.04),
  roles: z.array(staffingCompanyRoleSchema).default([]),
  payoutRounding: z.enum(['floor', 'cent', 'exact']).default('cent'),
  status: z.enum(['active', 'inactive', 'on_hold']).default('active'),
  notes: z.string().default(''),
})

export const staffingRateFormSchema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  role: z.string().min(1, 'El rol es requerido'),
  payRate: z.number().min(0, 'La tarifa no puede ser negativa'),
  billRate: z.number().min(0, 'La tarifa no puede ser negativa'),
  overtimeThresholdHours: z.number().min(0).max(168).nullable().default(null),
  overtimeMultiplier: z.number().min(1, 'El recargo no puede ser menor a 1').max(5).nullable().default(null),
  overtimePayRate: z.number().min(0).nullable().default(null),
  overtimeBillRate: z.number().min(0).nullable().default(null),
}).refine(r => r.billRate >= r.payRate, {
  // Billing below cost is almost always a typo, and it silently inverts the margin.
  message: 'Lo que cobras a la empresa no puede ser menor a lo que le pagas al empleado',
  path: ['billRate'],
})

export const staffingCompanyPaymentFormSchema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  invoiceId: z.string().default(''),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  paymentMethod: z.string().default(''),
  paymentDate: z.string().min(1, 'Selecciona una fecha'),
  reference: z.string().default(''),
  notes: z.string().default(''),
})

export const leadFormSchema = z.object({
  companyName: z.string().min(1, 'El nombre de la empresa es requerido'),
  workArea: z.string().default(''),
  address: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().email('El email no es válido').or(z.literal('')).default(''),
  status: z.enum(['new', 'called', 'answered', 'emailed', 'meeting', 'won', 'lost']).default('new'),
  visitDate: z.string().default(''),
  companyCategory: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']).or(z.literal('')).default(''),
  contactCard: z.string().default(''),
  state: z.string().default(''),
  notes: z.string().default(''),
})

export const empleadoFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').min(2, 'El nombre debe tener al menos 2 caracteres'),
  // Required for every niche except staffing (no login there) — enforced by isFormValid in
  // EmpleadoFormModal.vue, same pattern already used for `role` below. Blank must still parse
  // as valid email syntax if present, so `.email()` stays but requiredness is not schema-level.
  email: z.string().email('El email no es válido').or(z.literal('')).default(''),
  password: z.string().default(''),
  role: z.string().default(''),
  systemRole: z.string().default(''),
  payType: z.string().default('percentage'),
  payPercentage: z.number().min(0, 'El porcentaje debe estar entre 0 y 100').max(100, 'El porcentaje debe estar entre 0 y 100').default(0),
  baseSalary: z.number().min(0, 'El sueldo base no puede ser negativo').default(0),
  color: z.string().default('#869C84'),
})

export const servicioFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').min(2, 'El nombre debe tener al menos 2 caracteres'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  duration: z.number().positive('La duración debe ser mayor a 0 minutos'),
  category: z.string().default(''),
  employeeIds: z.array(z.string()).default([]),
  isFixedCommission: z.boolean().default(false),
  fixedCommissionAmount: z.number().min(0, 'La comisión no puede ser negativa').default(0),
  commissionPercentage: z.number().min(0, 'El porcentaje debe estar entre 0 y 100').max(100, 'El porcentaje debe estar entre 0 y 100').default(0),
})

export const productoFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').min(2, 'El nombre debe tener al menos 2 caracteres'),
  unit: z.string().min(1, 'La unidad de medida es requerida'),
  unitPrice: z.number().min(0, 'El precio no puede ser negativo'),
  unitCost: z.number().min(0, 'El costo no puede ser negativo'),
  categoryId: z.string().default(''),
  stock: z.number().min(0, 'El stock no puede ser negativo').default(0),
  minimumStock: z.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
  hasVariants: z.boolean().default(false),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'El nombre de la variante es obligatorio'),
    unitPrice: z.number().min(0, 'El precio no puede ser negativo').default(0),
    unitCost: z.number().min(0, 'El costo no puede ser negativo').default(0),
    stock: z.number().min(0, 'El stock no puede ser negativo').default(0),
    _delete: z.boolean().optional(),
  })).default([]),
})

export const giftCardFormSchema = z.object({
  code: z.string().optional(),
  buyerName: z.string().min(1, 'El nombre del comprador es requerido'),
  buyerPhone: z.string().default(''),
  recipientName: z.string().min(1, 'El nombre del beneficiario es requerido'),
  recipientPhone: z.string().default(''),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  notes: z.string().default(''),
  status: z.enum(['active', 'redeemed', 'expired']).default('active'),
})

export const employeePaymentFormSchema = z.object({
  employeeId: z.string().min(1, 'Selecciona un empleado'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.enum(['USD', 'VES']),
  paymentMethod: z.string().min(1, 'Selecciona un método de pago'),
  paymentDate: z.string().min(1, 'Selecciona una fecha'),
  notes: z.string().default(''),
})
