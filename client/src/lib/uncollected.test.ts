import { describe, expect, it } from 'vitest'
import { collectedAmount, hasCreditPortion, isUncollectedSplit, uncollectedOf } from './uncollected'

describe('uncollected', () => {
  it('crédito y cortesía no son dinero cobrado; el resto sí', () => {
    expect(isUncollectedSplit({ method: 'credito' })).toBe(true)
    expect(isUncollectedSplit({ method: 'cortesia' })).toBe(true)
    for (const m of ['cash', 'cash_ves', 'zelle', 'pago_movil', 'gift_card', 'card']) expect(isUncollectedSplit({ method: m })).toBe(false)
    expect(isUncollectedSplit(null)).toBe(false)
    expect(isUncollectedSplit(undefined)).toBe(false)
  })

  it('lo no cobrado sale del servidor y se tolera su ausencia o un valor raro', () => {
    expect(uncollectedOf({ uncollected_amount: 36 })).toBe(36)
    expect(uncollectedOf({ uncollected_amount: '36.50' })).toBe(36.5)
    expect(uncollectedOf({})).toBe(0)
    expect(uncollectedOf({ uncollected_amount: null })).toBe(0)
    expect(uncollectedOf({ uncollected_amount: 'abc' })).toBe(0)
    expect(uncollectedOf({ uncollected_amount: -5 })).toBe(0)
  })

  it('lo cobrado es el valor de la venta menos lo no cobrado, nunca negativo', () => {
    expect(collectedAmount({ total_amount: 53, uncollected_amount: 36 })).toBe(17)
    expect(collectedAmount({ total_amount: 53 })).toBe(53) // caché vieja sin el campo: como antes
    expect(collectedAmount({ total_amount: '53', uncollected_amount: '36' })).toBe(17)
    expect(collectedAmount({ total_amount: 10, uncollected_amount: 40 })).toBe(0)
    expect(collectedAmount({})).toBe(0)
  })

  it('un crédito en el pago: todo a crédito, o una línea de crédito con monto en un mixto', () => {
    expect(hasCreditPortion('credito', [])).toBe(true)
    expect(hasCreditPortion('mixed', [{ method: 'cash', inputAmount: 17 }, { method: 'credito', inputAmount: 19 }])).toBe(true)
    expect(hasCreditPortion('mixed', [{ method: 'cash', inputAmount: 17 }, { method: 'credito', inputAmount: 0 }])).toBe(false)
    expect(hasCreditPortion('mixed', [{ method: 'cash', inputAmount: 17 }, { method: 'cortesia', inputAmount: 36 }])).toBe(false)
    expect(hasCreditPortion('cash', [{ method: 'credito', inputAmount: 19 }])).toBe(false)
    expect(hasCreditPortion('mixed', null)).toBe(false)
  })
})
