import { describe, it, expect } from 'vitest'
import { mapCitaFormToAppointmentInsert, mapAppointmentToCita } from '../mappers/agendaMapper'
import type { Service } from '../types/database'
import type { CitaFormData } from '../types/cita'

const mockService: Service = {
  id: 'svc-001',
  business_id: 'biz-1',
  branch_id: null,
  name: 'Corte de cabello',
  description: null,
  duration_minutes: 45,
  price: 25,
  local_percentage: 50,
  color: '#3B82F6',
  category: 'corte',
  icon: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const validFormData: CitaFormData = {
  clientName: 'Juan Pérez',
  clientPhone: '+584141234567',
  service: 'svc-001',
  employee: 'emp-001',
  assistantEmployee: '',
  assistantPercentage: 0,
  duration: 45,
  price: 25,
  extraServices: [],
  date: '2026-06-24',
  time: '14:00',
  status: 'confirmed',
  notes: '',
}

describe('mapCitaFormToAppointmentInsert', () => {
  it('maps basic form data to appointment insert', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      validFormData,
      mockService,
      'client-1',
      'creator-1'
    )

    expect(result.business_id).toBe('biz-1')
    expect(result.client_id).toBe('client-1')
    expect(result.employee_id).toBe('emp-001')
    expect(result.service_id).toBe('svc-001')
    expect(result.status).toBe('confirmed')
    expect(result.payment_status).toBe('unpaid')
  })

  it('computes correct start and end times', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      validFormData,
      mockService,
      'client-1',
    )

    const startDate = new Date(result.start_time)
    const endDate = new Date(result.end_time)

    expect(startDate.getHours()).toBe(14)
    expect(startDate.getMinutes()).toBe(0)
    expect(endDate.getHours()).toBe(14)
    expect(endDate.getMinutes()).toBe(45)
    expect(endDate.getTime() - startDate.getTime()).toBe(45 * 60 * 1000)
  })

  it('sets payment_status to paid when status is paid', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, status: 'paid' },
      mockService,
      'client-1',
    )

    expect(result.status).toBe('completed')
    expect(result.payment_status).toBe('paid')
  })

  it('sets price_override when price differs from catalog', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, price: 35 },
      mockService,
      'client-1',
    )

    expect(result.price_override).toBe(35)
  })

  it('does not set price_override when price matches catalog', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, price: 25 },
      mockService,
      'client-1',
    )

    expect(result.price_override).toBeNull()
  })

  it('sets duration_override when duration differs from catalog', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, duration: 60 },
      mockService,
      'client-1',
    )

    expect(result.duration_override).toBe(60)
  })

  it('does not set duration_override when duration matches catalog', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, duration: 45 },
      mockService,
      'client-1',
    )

    expect(result.duration_override).toBeNull()
  })

  it('sets assistant fields when provided', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, assistantEmployee: 'ast-1', assistantPercentage: 30 },
      mockService,
      'client-1',
    )

    expect(result.assistant_employee_id).toBe('ast-1')
    expect(result.assistant_percentage).toBe(30)
  })

  it('sets null assistant when empty', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      validFormData,
      mockService,
      'client-1',
    )

    expect(result.assistant_employee_id).toBeNull()
    expect(result.assistant_percentage).toBe(0)
  })

  it('handles pending status correctly', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, status: 'pending' },
      mockService,
      'client-1',
    )

    expect(result.status).toBe('pending')
    expect(result.payment_status).toBe('unpaid')
  })

  it('sets source to internal', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      validFormData,
      mockService,
      'client-1',
    )

    expect(result.source).toBe('internal')
  })

  it('sets notes when provided', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, notes: 'Cliente frecuente' },
      mockService,
      'client-1',
    )

    expect(result.internal_notes).toBe('Cliente frecuente')
  })

  it('sets notes to null when empty or whitespace', () => {
    const result = mapCitaFormToAppointmentInsert(
      'biz-1',
      { ...validFormData, notes: '   ' },
      mockService,
      'client-1',
    )

    expect(result.internal_notes).toBeNull()
  })
})

describe('mapAppointmentToCita', () => {
  const mockAppointment = {
    id: 'appt-1',
    business_id: 'biz-1',
    client_id: 'client-1',
    employee_id: 'emp-1',
    assistant_employee_id: null,
    assistant_percentage: null,
    service_id: 'svc-1',
    start_time: '2026-06-24T14:00:00.000Z',
    end_time: '2026-06-24T14:45:00.000Z',
    status: 'confirmed' as const,
    payment_status: 'unpaid' as const,
    price_override: null,
    duration_override: null,
    internal_notes: null,
    source: 'internal' as const,
    group_id: null,
    created_by: 'creator-1',
    created_at: '2026-06-24T00:00:00Z',
    updated_at: '2026-06-24T00:00:00Z',
    services: { id: 'svc-1', name: 'Corte', duration_minutes: 45, price: 25, color: '#333' },
    profiles: { id: 'emp-1', full_name: 'María García', avatar_url: null },
    assistant_profile: null,
    clients: { id: 'client-1', full_name: 'Juan Pérez', phone: '+584141234567', email: null },
  }

  it('maps appointment to cita view model', () => {
    const result = mapAppointmentToCita(mockAppointment as any)

    expect(result.id).toBe('appt-1')
    expect(result.clientName).toBe('Juan Pérez')
    expect(result.service).toBe('Corte')
    expect(result.employee).toBe('María García')
    expect(result.price).toBe(25)
    expect(result.duration).toBe(45)
    expect(result.status).toBe('confirmed')
    expect(result.paymentStatus).toBe('unpaid')
  })

  it('uses price_override when set', () => {
    const appt = { ...mockAppointment, price_override: 40 }
    const result = mapAppointmentToCita(appt as any)
    expect(result.price).toBe(40)
  })

  it('uses duration_override when set (ignoring end_time span)', () => {
    const appt = { ...mockAppointment, duration_override: 90, end_time: '2026-06-24T14:45:00.000Z' }
    const result = mapAppointmentToCita(appt as any)
    expect(result.duration).toBe(90)
  })

  it('normalizes paid status', () => {
    const appt = { ...mockAppointment, payment_status: 'paid' as const }
    const result = mapAppointmentToCita(appt as any)
    expect(result.status).toBe('paid')
  })

  it('normalizes no_show status to cancelled', () => {
    const appt = { ...mockAppointment, status: 'no_show' as const }
    const result = mapAppointmentToCita(appt as any)
    expect(result.status).toBe('cancelled')
  })

  it('handles missing relations gracefully', () => {
    const appt = { ...mockAppointment, services: null, profiles: null, clients: null }
    const result = mapAppointmentToCita(appt as any)
    expect(result.clientName).toBe('Cliente')
    expect(result.service).toBe('Servicio')
    expect(result.employee).toBe('Empleado')
  })
})
