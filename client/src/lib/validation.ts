import { z } from 'zod'

const paymentMethodSchema = z.enum(['cash', 'cash_ves', 'card', 'transfer', 'other', 'zelle', 'binance', 'cashea', 'pago_movil', 'punto_venta', 'mixed', 'gift_card'])

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

export const empleadoFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'El email es obligatorio').email('El email no es válido'),
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
