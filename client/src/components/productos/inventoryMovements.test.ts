import { describe, expect, it } from 'vitest'
import { MAX_RANGE_DAYS, originLabel, personLabel, rangeError, rangeForPreset, signedQty, typeTone, unitsText } from './inventoryMovements'

// Jueves 5 de noviembre de 2026
const TODAY = new Date(2026, 10, 5, 15, 30)

describe('rangeForPreset', () => {
  it('«Este mes» va del 1 de noviembre a hoy', () => {
    expect(rangeForPreset('month', TODAY)).toEqual({ start: '2026-11-01', end: '2026-11-05' })
  })

  it('«Mes pasado» es el octubre completo', () => {
    expect(rangeForPreset('last_month', TODAY)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
  })

  it('«Mes pasado» en enero es diciembre del año anterior', () => {
    expect(rangeForPreset('last_month', new Date(2027, 0, 15))).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })

  it('«Hoy» es un solo día y los «últimos N días» incluyen hoy', () => {
    expect(rangeForPreset('today', TODAY)).toEqual({ start: '2026-11-05', end: '2026-11-05' })
    expect(rangeForPreset('7', TODAY)).toEqual({ start: '2026-10-30', end: '2026-11-05' })
    expect(rangeForPreset('30', TODAY)).toEqual({ start: '2026-10-07', end: '2026-11-05' })
    expect(rangeForPreset('90', TODAY)).toEqual({ start: '2026-08-08', end: '2026-11-05' })
  })

  it('«Este año» va desde el 1 de enero', () => {
    expect(rangeForPreset('year', TODAY)).toEqual({ start: '2026-01-01', end: '2026-11-05' })
  })

  it('con fechas elegidas usa esas fechas tal cual', () => {
    expect(rangeForPreset('custom', TODAY, { start: '2026-10-05', end: '2026-10-12' })).toEqual({ start: '2026-10-05', end: '2026-10-12' })
  })

  it('ningún período ofrecido pasa del máximo que acepta el servidor, ni a fin de año', () => {
    for (const p of ['today', '7', '30', 'month', 'last_month', '90', 'year'] as const) {
      expect(rangeError(rangeForPreset(p, TODAY))).toBeNull()
      expect(rangeError(rangeForPreset(p, new Date(2028, 11, 31)))).toBeNull() // año bisiesto completo
    }
  })
})

describe('rangeError', () => {
  it('pide las dos fechas', () => {
    expect(rangeError({ start: '', end: '2026-10-31' })).toMatch(/fecha inicial y la final/)
    expect(rangeError({ start: '2026-10-01', end: '' })).toMatch(/fecha inicial y la final/)
  })

  it('rechaza una fecha final anterior a la inicial', () => {
    expect(rangeError({ start: '2026-10-10', end: '2026-10-01' })).toMatch(/anterior/)
    expect(rangeError({ start: '2026-10-10', end: '2026-10-10' })).toBeNull()
  })

  it('acepta hasta 366 días y rechaza más (igual que el servidor)', () => {
    expect(MAX_RANGE_DAYS).toBe(366)
    expect(rangeError({ start: '2025-11-05', end: '2026-11-05' })).toBeNull() // 365 días
    expect(rangeError({ start: '2025-11-04', end: '2026-11-05' })).toBeNull() // 366 días
    expect(rangeError({ start: '2025-11-03', end: '2026-11-05' })).toMatch(/12 meses/) // 367 días
  })
})

describe('formato', () => {
  it('cantidad con signo explícito y sin ceros sobrantes', () => {
    expect(signedQty(10)).toBe('+10')
    expect(signedQty(-2)).toBe('−2')
    expect(signedQty(1.5)).toBe('+1.5')
    expect(signedQty(-0.25)).toBe('−0.25')
    expect(signedQty(0)).toBe('0')
    expect(unitsText(3)).toBe('3')
    expect(unitsText(2.5)).toBe('2.5')
  })

  it('el origen se dice en palabras y sin referencia es manual', () => {
    expect(originLabel('appointment')).toBe('En una cita')
    expect(originLabel('direct')).toBe('Venta directa')
    expect(originLabel('employee_payment')).toBe('Consumo de empleado')
    expect(originLabel('purchase_invoice')).toBe('Factura de compra')
    expect(originLabel('transfer')).toBe('Transferencia entre sucursales')
    expect(originLabel(null)).toBe('Manual')
    expect(originLabel('algo_nuevo')).toBe('algo_nuevo')
  })

  it('nombra a la persona según su rol', () => {
    expect(personLabel('client')).toBe('Cliente')
    expect(personLabel('employee')).toBe('Empleado')
    expect(personLabel(null)).toBe('Persona')
  })

  it('cada tipo tiene su color y los desconocidos uno neutro', () => {
    expect(typeTone('sale').text).toBe('text-primary')
    expect(typeTone('purchase').text).toBe('text-success')
    expect(typeTone('consumption').text).toBe('text-danger')
    expect(typeTone('adjustment').text).toBe('text-warning')
    expect(typeTone('transfer_in').text).toBe('text-info')
    expect(typeTone('lo_que_sea').text).toBe('text-info')
  })
})
