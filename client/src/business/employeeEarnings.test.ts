import { describe, it, expect } from 'vitest'
import { computeServiceEarnings, type EmployeeCompProfile } from './employeeEarnings'

describe('computeServiceEarnings', () => {
  it('returns 0 earnings for salary-type employees', () => {
    const profile: EmployeeCompProfile = { pay_type: 'salary', pay_percentage: 50, base_salary: 100 }
    const result = computeServiceEarnings(100, profile)
    expect(result.percentage).toBe(0)
    expect(result.earnings).toBe(0)
  })

  it('uses profile percentage for percentage-type employees', () => {
    const profile: EmployeeCompProfile = { pay_type: 'percentage', pay_percentage: 30 }
    const result = computeServiceEarnings(200, profile)
    expect(result.percentage).toBe(30)
    expect(result.earnings).toBe(60)
  })

  it('uses fallback percentage when profile has no pay_percentage', () => {
    const result = computeServiceEarnings(200, null, 25)
    expect(result.percentage).toBe(25)
    expect(result.earnings).toBe(50)
  })

  it('fallbackPercentage takes precedence over profile pay_percentage', () => {
    const profile: EmployeeCompProfile = { pay_type: 'percentage', pay_percentage: 50 }
    const result = computeServiceEarnings(100, profile, 70)
    expect(result.percentage).toBe(70)
    expect(result.earnings).toBe(70)
  })

  it('uses profile percentage for mixed-type employees', () => {
    const profile: EmployeeCompProfile = { pay_type: 'mixed', pay_percentage: 40, base_salary: 10 }
    const result = computeServiceEarnings(100, profile)
    expect(result.percentage).toBe(40)
    expect(result.earnings).toBe(40)
  })

  it('defaults to 0 percentage when nothing is provided', () => {
    const result = computeServiceEarnings(100, null)
    expect(result.percentage).toBe(0)
    expect(result.earnings).toBe(0)
  })

  it('clamps negative percentages to 0', () => {
    const profile: EmployeeCompProfile = { pay_type: 'percentage', pay_percentage: -10 }
    const result = computeServiceEarnings(100, profile)
    expect(result.percentage).toBe(0)
    expect(result.earnings).toBe(0)
  })

  it('computes zero for zero total amount', () => {
    const profile: EmployeeCompProfile = { pay_type: 'percentage', pay_percentage: 50 }
    const result = computeServiceEarnings(0, profile)
    expect(result.percentage).toBe(50)
    expect(result.earnings).toBe(0)
  })
})
