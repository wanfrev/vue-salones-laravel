import { describe, it, expect } from 'vitest'
import { mapCitaFormToAppointmentInsert } from './agendaMapper'
import type { CitaFormData } from '../types/cita'
import type { Service } from '../types/database'

const mockService: Service = {
  id: 'svc-1',
  business_id: 'biz-1',
  name: 'Corte',
  duration_minutes: 30,
  price: 50,
  local_percentage: 50,
  color: '#000',
  category: 'general',
  active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  branch_id: null,
  description: '',
  icon: '',
}

const baseFormData: CitaFormData = {
  clientName: 'Cliente Test',
  clientPhone: '+584141234567',
  service: 'svc-1',
  employee: 'emp-1',
  assistantEmployee: '',
  assistantPercentage: 0,
  duration: 30,
  price: 50,
  extraServices: [],
  date: '2024-06-15',
  time: '10:00',
  status: 'confirmed',
  notes: '',
}

describe('mapCitaFormToAppointmentInsert — assistant fields', () => {
  it('sets assistant_employee_id to null when no assistant selected', () => {
    const result = mapCitaFormToAppointmentInsert('biz-1', baseFormData, mockService, 'cli-1', null, null)
    expect(result.assistant_employee_id).toBeNull()
    expect(result.assistant_percentage).toBe(0)
  })

  it('includes assistant_employee_id when assistant is selected', () => {
    const data = { ...baseFormData, assistantEmployee: 'asst-1', assistantPercentage: 25 }
    const result = mapCitaFormToAppointmentInsert('biz-1', data, mockService, 'cli-1', null, null)
    expect(result.assistant_employee_id).toBe('asst-1')
    expect(result.assistant_percentage).toBe(25)
  })

  it('handles undefined assistant fields gracefully', () => {
    const data = { ...baseFormData, assistantEmployee: undefined as any, assistantPercentage: undefined as any }
    const result = mapCitaFormToAppointmentInsert('biz-1', data, mockService, 'cli-1', null, null)
    expect(result.assistant_employee_id).toBeNull()
    expect(result.assistant_percentage).toBe(0)
  })

  it('includes employee_percentage_override when set', () => {
    const data = { ...baseFormData, employeePercentageOverride: 70 }
    const result = mapCitaFormToAppointmentInsert('biz-1', data, mockService, 'cli-1', null, null)
    expect(result.employee_percentage_override).toBe(70)
  })

  it('sets employee_percentage_override to null when not set', () => {
    const result = mapCitaFormToAppointmentInsert('biz-1', baseFormData, mockService, 'cli-1', null, null)
    expect(result.employee_percentage_override).toBeNull()
  })
})
