import { describe, it, expect } from 'vitest'
import { citaFormSchema } from './validation'

describe('citaFormSchema', () => {
  const validCita = {
    clientName: 'Juan Pérez',
    clientPhone: '+584141234567',
    service: 'svc-1',
    employee: 'emp-1',
    duration: 30,
    price: 25,
    date: '2026-06-24',
    time: '14:00',
    status: 'confirmed' as const,
  }

  it('accepts a valid cita', () => {
    const result = citaFormSchema.safeParse(validCita)
    expect(result.success).toBe(true)
  })

  it('rejects empty client name', () => {
    const result = citaFormSchema.safeParse({ ...validCita, clientName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty client phone', () => {
    const result = citaFormSchema.safeParse({ ...validCita, clientPhone: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty service', () => {
    const result = citaFormSchema.safeParse({ ...validCita, service: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty employee', () => {
    const result = citaFormSchema.safeParse({ ...validCita, employee: '' })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = citaFormSchema.safeParse({ ...validCita, price: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects zero or negative duration', () => {
    const result = citaFormSchema.safeParse({ ...validCita, duration: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty date', () => {
    const result = citaFormSchema.safeParse({ ...validCita, date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty time', () => {
    const result = citaFormSchema.safeParse({ ...validCita, time: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = citaFormSchema.safeParse({ ...validCita, status: 'invalid_status' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid statuses', () => {
    for (const status of ['confirmed', 'pending', 'cancelled', 'paid'] as const) {
      const result = citaFormSchema.safeParse({ ...validCita, status })
      expect(result.success).toBe(true)
    }
  })

  it('uses defaults for optional fields', () => {
    const result = citaFormSchema.parse(validCita)
    expect(result.assistantEmployee).toBe('')
    expect(result.assistantPercentage).toBe(0)
    expect(result.extraServices).toEqual([])
    expect(result.notes).toBe('')
    expect(result.status).toBe('confirmed')
  })

  it('accepts extra services', () => {
    const result = citaFormSchema.safeParse({
      ...validCita,
      extraServices: [{
        serviceId: 'svc-2',
        employeeId: 'emp-2',
        assistantEmployeeId: '',
        assistantPercentage: 0,
        duration: 45,
        price: 40,
      }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extraServices).toHaveLength(1)
    }
  })

  it('rejects extra service with empty serviceId', () => {
    const result = citaFormSchema.safeParse({
      ...validCita,
      extraServices: [{ serviceId: '', employeeId: 'emp-2', duration: 30, price: 20 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects extra service with empty employeeId', () => {
    const result = citaFormSchema.safeParse({
      ...validCita,
      extraServices: [{ serviceId: 'svc-2', employeeId: '', duration: 30, price: 20 }],
    })
    expect(result.success).toBe(false)
  })
})
