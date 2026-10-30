import { describe, it, expect } from 'vitest'
import { summarizePeriod } from './periodSummary'

const a = (status: string, over: Record<string, unknown> = {}) => ({ status, payment_status: 'unpaid', group_id: null, employee_id: 'e1', ...over })

describe('summarizePeriod', () => {
  it('cuenta las citas y las pendientes', () => {
    expect(summarizePeriod([a('pending'), a('confirmed'), a('pending'), a('confirmed', { payment_status: 'paid' })])).toEqual({ total: 4, pending: 2 })
  })

  it('una cita pagada deja de estar pendiente aunque su estado siga «pending»', () => {
    expect(summarizePeriod([a('pending', { payment_status: 'paid' })])).toEqual({ total: 1, pending: 0 })
  })

  it('una visita con varios servicios de la misma profesional cuenta una vez; con otra profesional, otra más', () => {
    const rows = [a('pending', { group_id: 'g' }), a('pending', { group_id: 'g' }), a('pending', { group_id: 'g', employee_id: 'e2' })]

    expect(summarizePeriod(rows)).toEqual({ total: 2, pending: 2 })
  })

  it('sin citas da ceros', () => {
    expect(summarizePeriod([])).toEqual({ total: 0, pending: 0 })
  })
})
