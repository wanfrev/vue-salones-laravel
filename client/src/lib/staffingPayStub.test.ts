import { describe, expect, it } from 'vitest'
import { buildPayStub } from './staffingPayStub'

const base = {
  employeeName: 'Ana', role: 'Cook', regularHours: 40, overtimeHours: 5, payRate: 20,
  preTaxDeduction: 0, fixedFees: 0, adjustment: 0, perdiemTotal: 0, travelTotal: 0,
  gross: 950, taxWithheld: 95, net: 855, payout: 855,
}

describe('buildPayStub', () => {
  it('splits gross into regular and overtime pay', () => {
    const stub = buildPayStub(base)
    expect(stub.regularPay).toBe(800)
    expect(stub.overtimePay).toBe(150)
    expect(stub.taxPercent).toBeCloseTo(10)
  })

  it('adds the pre-tax deduction back so overtime pay is not understated', () => {
    // gross is already net of the deduction: 800 + 150 - 50 = 900
    const stub = buildPayStub({ ...base, preTaxDeduction: 50, gross: 900, taxWithheld: 90, net: 810, payout: 810 })
    expect(stub.overtimePay).toBe(150)
  })

  it('reports payout rounding only when payout differs from net', () => {
    expect(buildPayStub(base).rounding).toBe(0)
    expect(buildPayStub({ ...base, net: 855.4, payout: 855 }).rounding).toBe(-0.4)
  })

  it('does not divide by zero when gross is zero', () => {
    expect(buildPayStub({ ...base, gross: 0, taxWithheld: 0, regularHours: 0, overtimeHours: 0 }).taxPercent).toBe(0)
  })
})
