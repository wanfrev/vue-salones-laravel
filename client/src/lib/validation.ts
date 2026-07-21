import { z } from 'zod'

const paymentMethodSchema = z.enum(['cash', 'cash_ves', 'card', 'transfer', 'other', 'zelle', 'pago_movil', 'punto_venta', 'mixed'])

export const serviceItemSchema = z.object({
  serviceId: z.string().min(1, 'Selecciona un servicio'),
  employeeId: z.string().min(1, 'Selecciona un empleado'),
  assistantEmployeeId: z.string().default(''),
  assistantPercentage: z.number().min(0).max(100).default(0),
  employeePercentageOverride: z.number().min(0).max(100).optional(),
  duration: z.number().positive('La duración debe ser positiva'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
})

export const citaFormSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'El nombre del cliente es requerido'),
  clientPhone: z.string().min(1, 'El teléfono del cliente es requerido'),
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
  status: z.enum(['confirmed', 'pending', 'cancelled', 'paid']).default('pending'),
  notes: z.string().default(''),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
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
  date: z.string().min(1, 'Selecciona una fecha'),
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
