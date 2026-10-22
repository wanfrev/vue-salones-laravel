import { describe, expect, it } from 'vitest'
import {
  formatPaymentLine, formatProductLine, formatStaff, formatUsd, isInactiveVisit, paymentStatusLabel,
  visitStateClass, visitStateLabel,
} from './visitFormat'

describe('visitFormat', () => {
  it('etiqueta el estado y distingue la venta directa de una cita', () => {
    expect(visitStateLabel({ kind: 'appointment', state: 'attended' })).toBe('Atendida')
    expect(visitStateLabel({ kind: 'appointment', state: 'no_show' })).toBe('No asistió')
    expect(visitStateLabel({ kind: 'sale', state: 'attended' })).toBe('Venta directa')
    expect(visitStateClass({ kind: 'appointment', state: 'no_show' })).toContain('danger')
    expect(visitStateClass({ kind: 'sale', state: 'attended' })).toContain('primary')
  })

  it('cancelada y no asistió se consideran inactivas', () => {
    expect(isInactiveVisit({ state: 'cancelled' })).toBe(true)
    expect(isInactiveVisit({ state: 'no_show' })).toBe(true)
    expect(isInactiveVisit({ state: 'attended' })).toBe(false)
    expect(isInactiveVisit({ state: 'pending' })).toBe(false)
  })

  it('formatea montos en USD sin ceros de más', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.5')
    expect(formatUsd(20)).toBe('$20')
    expect(formatUsd(0)).toBe('$0')
  })

  it('arma la línea de pago con moneda y banco', () => {
    expect(formatPaymentLine({ method: 'cash', amount: 10, currency: null, bank: null })).toBe('Efectivo ($) $10')
    expect(formatPaymentLine({ method: 'pago_movil', amount: 1200, currency: 'VES', bank: 'Banesco' })).toBe('Pago Móvil Bs 1,200 (Banesco)')
    expect(formatPaymentLine({ method: 'zelle', amount: 15.5, currency: 'USD', bank: null })).toBe('Zelle $15.5')
  })

  it('omite la cantidad 1 en los productos', () => {
    expect(formatProductLine({ name: 'Shampoo', quantity: 1 })).toBe('Shampoo')
    expect(formatProductLine({ name: 'Shampoo', quantity: 2 })).toBe('Shampoo ×2')
  })

  it('junta profesional y ayudante', () => {
    expect(formatStaff({ employee: 'Lucía', assistant: 'Ana' })).toBe('Lucía + Ana')
    expect(formatStaff({ employee: 'Lucía', assistant: null })).toBe('Lucía')
    expect(formatStaff({ employee: null, assistant: null })).toBe('')
  })

  it('etiqueta el estado de pago', () => {
    expect(paymentStatusLabel('partial')).toBe('Pago parcial')
  })
})
