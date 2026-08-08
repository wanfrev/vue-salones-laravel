import { describe, it, expect, vi, beforeEach } from 'vitest'

// The composable reaches for two stores; only the currency-relevant slices matter here.
const businessState = {
  isSingleCurrency: false,
  employeeExchangeRate: null as number | null,
  currentBranch: null as { ves_exchange_rate: number | null } | null,
  business: { ves_exchange_rate: 40, currency: 'USD' } as Record<string, unknown> | null,
  selectedBranchId: null as string | null,
  updateBranch: vi.fn(),
  updateBusiness: vi.fn(),
}

vi.mock('../../store/business', () => ({
  useBusinessStore: () => businessState,
}))

vi.mock('../common/useAuth', () => ({
  useAuth: () => ({
    authStore: { profile: null, businessId: 'biz-1' },
  }),
}))

vi.mock('../../lib/api', () => ({ db: {} }))

const { useCurrency } = await import('./useCurrency')

describe('useCurrency in dual-currency mode (every niche except staffing)', () => {
  beforeEach(() => {
    businessState.isSingleCurrency = false
  })

  it('converts to VES at the business rate', () => {
    const { formatVESInline, formatSecondary } = useCurrency()

    expect(formatVESInline(10)).toBe('400,00')
    expect(formatSecondary(10)).toBe('400,00 Bs')
  })

  it('formatDual shows both currencies', () => {
    expect(useCurrency().formatDual(10)).toBe('$10.00 / 400,00 Bs')
  })
})

describe('useCurrency in single-currency mode (staffing)', () => {
  beforeEach(() => {
    businessState.isSingleCurrency = true
  })

  it('collapses every secondary amount to an empty string', () => {
    const { formatVES, formatVESEs, formatVESInline, formatEmployeeVESInline } = useCurrency()

    expect(formatVES(10)).toBe('')
    expect(formatVESEs(400)).toBe('')
    expect(formatVESInline(10)).toBe('')
    expect(formatEmployeeVESInline(10)).toBe('')
  })

  /**
   * The unit has to come from inside the composable. If a call site appends ' Bs' itself, a
   * collapsed conversion leaves a stray unit dangling in the template — this is the guarantee
   * that made formatSecondary worth introducing.
   */
  it('formatSecondary returns nothing at all, not a bare unit', () => {
    const { formatSecondary, formatEmployeeSecondary } = useCurrency()

    expect(formatSecondary(10)).toBe('')
    expect(formatEmployeeSecondary(10)).toBe('')
  })

  it('formatDual degrades to USD only', () => {
    expect(useCurrency().formatDual(10)).toBe('$10.00')
  })

  it('still formats USD normally', () => {
    expect(useCurrency().formatUSD(1234.5)).toBe('$1,234.50')
  })

  it('exposes the mode so components can hide rate controls', () => {
    expect(useCurrency().isSingleCurrency.value).toBe(true)
  })
})
