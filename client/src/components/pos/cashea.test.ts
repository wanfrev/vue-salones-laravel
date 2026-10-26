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

  it('asks for the down payment method when there is a down payment, and only when the caller passes it', () => {
    expect(casheaProblem(124, 120, 10, 40, '')).toContain('método')
    expect(casheaProblem(124, 120, 10, 40, 'zelle')).toBeNull()
    expect(casheaProblem(124, 120, 10, 0, '')).toBeNull()   // sin inicial no hay con qué método pagarla
    expect(casheaProblem(124, 120, 10, 40)).toBeNull()      // llamadas sin el dato siguen como antes
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

  it('lets the cashier pick how the down payment was paid, stores it in the draft and sends it with the sale', async () => {
    const w = mount(CasheaFields, { props: { base: 120 } })
    const select = w.find('select[aria-label="Método con el que se pagó la inicial de Cashea"]')
    expect(select.exists()).toBe(true)
    expect(w.text()).toContain('Elige con qué método se pagó la inicial')
    expect(useCasheaDraft().payload()).toEqual({ fee_percentage: 10, down_payment_percentage: 40 })

    await select.setValue('zelle')
    expect(w.text()).not.toContain('Elige con qué método')
    expect(useCasheaDraft().payload()).toEqual({ fee_percentage: 10, down_payment_percentage: 40, down_payment_method: 'zelle' })

    useCasheaDraft().reset() // siguiente venta: hay que elegirlo de nuevo
    expect(useCasheaDraft().draft.downPaymentMethod).toBe('')
  })

  it('does not ask for a method when there is no down payment', async () => {
    const w = mount(CasheaFields, { props: { base: 120 } })
    await input(w, 'Inicial de Cashea').setValue('0')
    expect(w.find('select').exists()).toBe(false)
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
