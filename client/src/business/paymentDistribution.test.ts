import { describe, it, expect } from 'vitest'
import { distributeGroupPayment } from './paymentDistribution'

describe('distributeGroupPayment', () => {
  it('preserves current total when desired is 0', () => {
    const txs = [
      { id: 'a', totalAmount: 100, tipAmount: 0 },
      { id: 'b', totalAmount: 50, tipAmount: 0 },
    ]

    const result = distributeGroupPayment(txs, 0)

    expect(result).toHaveLength(2)
    expect(result[0].newTotal).toBeCloseTo(100, 2)
    expect(result[1].newTotal).toBeCloseTo(50, 2)
  })

  it('distributes proportionally to current amounts', () => {
    const txs = [
      { id: 'a', totalAmount: 100, tipAmount: 0 },
      { id: 'b', totalAmount: 100, tipAmount: 0 },
    ]

    const result = distributeGroupPayment(txs, 100)

    expect(result[0].newTotal).toBeCloseTo(50, 2)
    expect(result[1].newTotal).toBeCloseTo(50, 2)
  })

  it('handles uneven proportions', () => {
    const txs = [
      { id: 'a', totalAmount: 300, tipAmount: 0 },
      { id: 'b', totalAmount: 100, tipAmount: 0 },
    ]

    const result = distributeGroupPayment(txs, 200)

    expect(result[0].newTotal).toBeCloseTo(150, 2)
    expect(result[1].newTotal).toBeCloseTo(50, 2)
  })

  it('preserves tip amounts', () => {
    const txs = [
      { id: 'a', totalAmount: 110, tipAmount: 10 },
      { id: 'b', totalAmount: 55, tipAmount: 5 },
    ]

    const result = distributeGroupPayment(txs, 0)

    expect(result[0].tip).toBe(10)
    expect(result[1].tip).toBe(5)
    expect(result[0].newTotal).toBeCloseTo(110, 2)
    expect(result[1].newTotal).toBeCloseTo(55, 2)
  })

  it('distributes evenly when all amounts are zero', () => {
    const txs = [
      { id: 'a', totalAmount: 0, tipAmount: 0 },
      { id: 'b', totalAmount: 0, tipAmount: 0 },
    ]

    const result = distributeGroupPayment(txs, 100)

    expect(result[0].newTotal).toBeCloseTo(50, 2)
    expect(result[1].newTotal).toBeCloseTo(50, 2)
  })

  it('handles single transaction', () => {
    const txs = [
      { id: 'a', totalAmount: 200, tipAmount: 20 },
    ]

    const result = distributeGroupPayment(txs, 150)

    expect(result[0].newTotal).toBeCloseTo(170, 2)
    expect(result[0].tip).toBe(20)
  })

  it('returns empty for empty input', () => {
    const result = distributeGroupPayment([], 100)
    expect(result).toEqual([])
  })

  it('sums exactly to desired total', () => {
    const txs = [
      { id: 'a', totalAmount: 33.33, tipAmount: 0 },
      { id: 'b', totalAmount: 33.33, tipAmount: 0 },
      { id: 'c', totalAmount: 33.34, tipAmount: 0 },
    ]

    const result = distributeGroupPayment(txs, 100)
    const sum = result.reduce((s, r) => s + r.newTotal, 0)

    expect(sum).toBeCloseTo(100, 2)
  })
})
