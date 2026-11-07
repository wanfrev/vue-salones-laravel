import { describe, expect, it } from 'vitest'
import {
  amountForUsd, describePayment, hasVesLine, lineUsd, methodCurrency, methodHasBank, paymentError, totalUsd, toPayload, PAY_METHODS,
  type PaymentLine,
} from './giftCardPayment'

const line = (method: PaymentLine['method'], amount: number | null, bankId: string | null = null): PaymentLine => ({ method, amount, bankId })

describe('giftCardPayment', () => {
  it('la moneda y el banco los decide el método, como en el POS', () => {
    for (const m of ['cash', 'zelle', 'card', 'binance', 'other'] as const) expect(methodCurrency(m)).toBe('USD')
    for (const m of ['cash_ves', 'pago_movil', 'transfer', 'punto_venta'] as const) expect(methodCurrency(m)).toBe('VES')
    expect(PAY_METHODS.filter(m => m.bank).map(m => m.value).sort()).toEqual(['pago_movil', 'punto_venta', 'transfer'])
    expect(methodHasBank('cash')).toBe(false)
    expect(methodHasBank('pago_movil')).toBe(true)
  })

  it('no ofrece crédito, cortesía, otra gift card ni Cashea como forma de pago', () => {
    const values = PAY_METHODS.map(m => m.value as string)
    for (const bad of ['credito', 'cortesia', 'gift_card', 'cashea', 'mixed']) expect(values).not.toContain(bad)
  })

  it('una línea en dólares vale lo escrito; en bolívares, lo escrito entre la tasa', () => {
    expect(lineUsd(line('cash', 50), 100)).toBe(50)
    expect(lineUsd(line('pago_movil', 5000), 100)).toBe(50)
    expect(lineUsd(line('transfer', 1000), 164)).toBe(6.1)
    expect(lineUsd(line('pago_movil', 5000), 0)).toBe(0) // sin tasa no se puede convertir
    expect(lineUsd(line('cash', null), 100)).toBe(0)
    expect(lineUsd(line('cash', -5), 100)).toBe(0)
  })

  it('suma varias líneas y avisa si alguna es en bolívares', () => {
    const lines = [line('cash', 20), line('zelle', 10), line('cash_ves', 2000)]
    expect(totalUsd(lines, 100)).toBe(50)
    expect(hasVesLine(lines)).toBe(true)
    expect(hasVesLine([line('cash', 5)])).toBe(false)
  })

  it('convierte los dólares a lo que se escribe en la línea', () => {
    expect(amountForUsd('cash', 50, 100)).toBe(50)
    expect(amountForUsd('pago_movil', 50, 100)).toBe(5000)
    expect(amountForUsd('pago_movil', 50, 0)).toBe(0)
  })

  it('valida: líneas, montos, tasa y que sumen lo que deben', () => {
    expect(paymentError([], 100)).toMatch(/cómo se pagó/)
    expect(paymentError([line('cash', 0)], 100)).toMatch(/mayor a 0/)
    expect(paymentError([line('cash', null)], 100)).toMatch(/mayor a 0/)
    expect(paymentError([line('pago_movil', 5000)], 0)).toMatch(/tasa/)
    expect(paymentError([line('cash', 50)], 0)).toBeNull() // en dólares no hace falta tasa
    expect(paymentError([line('cash', 50)], 100, 50)).toBeNull()
    expect(paymentError([line('pago_movil', 4999)], 100, 50)).toBeNull() // tolera el redondeo de la tasa
    expect(paymentError([line('cash', 40)], 100, 50)).toMatch(/no coincide/)
    expect(paymentError([line('cash', 40)], 100, null)).toBeNull() // al registrarlo después no hay un monto que cuadrar
  })

  it('arma el cuerpo para el servidor: tasa solo con bolívares, banco solo en métodos con banco, fecha si hay', () => {
    expect(toPayload([line('cash', 50, 'b1')], 100)).toEqual({ lines: [{ method: 'cash', input_amount: 50, bank_id: null }] })
    expect(toPayload([line('pago_movil', 5000, 'b1')], 100, '2026-11-04')).toEqual({
      lines: [{ method: 'pago_movil', input_amount: 5000, bank_id: 'b1' }], exchange_rate: 100, paid_date: '2026-11-04',
    })
    expect(toPayload([line('transfer', 1000, '')], 100).lines[0].bank_id).toBeNull()
  })

  it('describe cómo se pagó, con el banco y la moneda de cada línea', () => {
    expect(describePayment([{ method: 'cash', currency: 'USD', inputAmount: 50, amount: 50 }])).toBe('Efectivo ($) $50.00')
    const text = describePayment([
      { method: 'cash', currency: 'USD', inputAmount: 20, amount: 20 },
      { method: 'pago_movil', currency: 'VES', inputAmount: 3000, amount: 30, bankName: 'Banesco' },
    ])
    expect(text).toContain('Efectivo ($) $20.00')
    expect(text).toContain('Pago Móvil (Banesco)')
    expect(text).toContain(' + ')
    expect(text).toMatch(/3[.,]000[.,]00 Bs/)
  })
})
