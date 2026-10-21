import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { casheaProblem, casheaTotals, spreadOver } from './cashea'
import CasheaFields from './CasheaFields.vue'
import { useCasheaDraft } from '../../composables/pos/useCasheaDraft'

describe('casheaTotals — mismo cálculo que el servidor', () => {
  it('commission and down payment are percentages of the total; the business keeps total − commission', () => {
    expect(casheaTotals(164, 10, 40)).toEqual({ fee: 16.4, downPayment: 65.6, net: 147.6 })
    expect(casheaTotals(124, 10, 40)).toEqual({ fee: 12.4, downPayment: 49.6, net: 111.6 })
  })

  it('rounds to cents and survives empty values', () => {
    expect(casheaTotals(122.35, 9.5, 40)).toEqual({ fee: 11.62, downPayment: 48.94, net: 110.73 })
    expect(casheaTotals(Number.NaN, 10, 40)).toEqual({ fee: 0, downPayment: 0, net: 0 })
  })
})

describe('casheaProblem', () => {
  it('is ready with a total at or above the price and sane percentages', () => {
    expect(casheaProblem(124, 120, 10, 40)).toBeNull()
    expect(casheaProblem(120, 120, 10, 40)).toBeNull()
  })

  it('names what is wrong', () => {
    expect(casheaProblem(null, 120, 10, 40)).toContain('monto')
    expect(casheaProblem(110, 120, 10, 40)).toContain('no puede ser menor')
    expect(casheaProblem(124, 120, 60, 40)).toContain('comisión')
    expect(casheaProblem(124, 120, -1, 40)).toContain('comisión')
    expect(casheaProblem(124, 120, 10, 120)).toContain('inicial')
  })
})

describe('spreadOver', () => {
  it('spreads the Cashea amount over the services in proportion and adds up exactly', () => {
    const out = spreadOver([90, 30], 164)
    expect(out).toEqual([123, 41])
    const odd = spreadOver([10, 10, 10], 100)
    expect(odd.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10)
  })

  it('handles free services and empty lists', () => {
    expect(spreadOver([0, 0], 10)).toEqual([5, 5])
    expect(spreadOver([], 10)).toEqual([])
  })
})

describe('CasheaFields (panel de pago)', () => {
  beforeEach(() => {
    localStorage.clear()
    useCasheaDraft().reset()
  })

  const input = (w: ReturnType<typeof mount>, label: string) => w.find(`input[aria-label="${label}"]`)

  it('proposes the price and shows down payment, commission and the net that goes into Finanzas today', async () => {
    const w = mount(CasheaFields, { props: { base: 120 } })
    expect((input(w, 'Monto cobrado por Cashea').element as HTMLInputElement).placeholder).toBe('120.00')

    await input(w, 'Monto cobrado por Cashea').setValue('164')
    expect(w.text()).toContain('$65.60')   // inicial 40%
    expect(w.text()).toContain('$16.40')   // comisión 10%
    expect(w.text()).toContain('Entra hoy a Finanzas')
    expect(w.text()).toContain('$147.60')  // neto
    expect(w.text()).toContain('especialista se calcula sobre $147.60')
    expect(useCasheaDraft().draft.total).toBe(164)
  })

  it('warns when the Cashea amount is below the price', async () => {
    const w = mount(CasheaFields, { props: { base: 120 } })
    await input(w, 'Monto cobrado por Cashea').setValue('100')
    expect(w.text()).toContain('no puede ser menor que el precio')
  })

  it('remembers today\'s commission in this browser for the next sale', async () => {
    const w = mount(CasheaFields, { props: { base: 120 } })
    await input(w, 'Comisión de Cashea').setValue('9.5')

    useCasheaDraft().reset() // siguiente venta
    expect(useCasheaDraft().draft.feePercentage).toBe(9.5)
    expect(useCasheaDraft().draft.total).toBeNull()
    expect(useCasheaDraft().draft.downPaymentPercentage).toBe(40)
  })

  it('a commission saved on another day is not reused', () => {
    localStorage.setItem('luma.pos.cashea-fee', JSON.stringify({ date: '2000-01-01', fee: 7 }))
    useCasheaDraft().reset()
    expect(useCasheaDraft().draft.feePercentage).toBe(10)
  })
})
