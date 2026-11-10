import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const api = vi.hoisted(() => ({
  recordSale: vi.fn(),
  recordDirectSale: vi.fn(),
  recordDirectServiceSale: vi.fn(),
  recordStandaloneTip: vi.fn(),
}))
const store = vi.hoisted(() => ({ features: {} as Record<string, boolean> }))

vi.mock('../../services/posService', () => ({
  ...api,
  posKeys: { pending: () => ['pos-pending'], products: () => ['pos-products'] },
}))
vi.mock('../common/useAuth', () => ({ useAuth: () => ({ authStore: { businessId: 'b1', role: 'admin' } }) }))
vi.mock('../common/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null, nicheType: 'salon', features: store.features }) }))
vi.mock('../finanzas/useBanks', () => ({ useBanks: () => ({ banks: ref([]) }) }))

import { usePOSPayment } from './usePOSPayment'

function setup() {
  let pos!: ReturnType<typeof usePOSPayment>
  const Host = defineComponent({ setup() { pos = usePOSPayment(); return () => h('div') } })
  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] } })
  return pos
}

const sale = { serviceAmount: 53, products: [], exchangeRate: 100, tipAmount: 0, productsAmount: 0 }
const sent = () => api.recordSale.mock.calls.map(c => c[0] as Record<string, any>)
const sum = (items: any[], key = 'amount') => Math.round(items.reduce((s, i) => s + i[key], 0) * 100) / 100

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ id: 'tx' })
  store.features = { discount_enabled: true }
  localStorage.clear()
})

describe('usePOSPayment — descuento por %', () => {
  it('cobra el servicio por su precio inicial y manda el descuento como una línea aparte (la comisión no baja)', async () => {
    const pos = setup()
    pos.discountPercent.value = 5

    await pos.processPayment({ appointmentId: 'a1', ...sale })
    await flushPromises()

    const [call] = sent()
    expect(call.serviceAmount).toBe(53) // el servidor calcula la comisión sobre este monto: no se rebaja
    expect(call.method).toBe('cash')
    expect(call.paymentsBreakdown).toEqual([
      { method: 'cash', inputAmount: 50.35, currency: 'USD', amount: 50.35, gift_card_id: undefined, giftCardId: undefined, bank_id: undefined, bank_name: undefined },
      { method: 'descuento', percentage: 5, inputAmount: 2.65, currency: 'USD', amount: 2.65 },
    ])
    expect(sum(call.paymentsBreakdown)).toBe(53) // el desglose siempre suma el valor de la venta
  })

  it('sin porcentaje, o con el negocio sin descuentos, el cobro sale exactamente como siempre', async () => {
    const off = setup()
    await off.processPayment({ appointmentId: 'a1', ...sale })

    store.features = {}
    const disabled = setup()
    disabled.discountPercent.value = 5
    await disabled.processPayment({ appointmentId: 'a2', ...sale })
    await flushPromises()

    for (const call of sent()) {
      expect(call.paymentsBreakdown).toHaveLength(1)
      expect(call.paymentsBreakdown[0].amount).toBe(53)
      expect(call.paymentsBreakdown.some((s: any) => s.method === 'descuento')).toBe(false)
    }
  })

  it('con Cashea o con cortesía no aplica descuento', async () => {
    for (const method of ['cashea', 'cortesia'] as const) {
      api.recordSale.mockClear()
      const pos = setup()
      pos.selectMethod(method)
      pos.discountPercent.value = 5
      expect(pos.discountAllowed.value).toBe(false)
      expect(pos.discountFor(53)).toBe(0)
    }
  })

  it('en bolívares lo cobrable se convierte con la tasa y el descuento va en dólares', async () => {
    const pos = setup()
    pos.selectMethod('pago_movil')
    pos.discountPercent.value = 5

    await pos.processPayment({ appointmentId: 'a1', ...sale })
    await flushPromises()

    const [pay, discount] = sent()[0].paymentsBreakdown
    expect(pay.currency).toBe('VES')
    expect(pay.inputAmount).toBe(5035) // 50,35 × 100 Bs
    expect(pay.amount).toBe(50.35)
    expect(discount).toMatchObject({ method: 'descuento', currency: 'USD', amount: 2.65 })
  })

  it('con pago mixto, lo escrito suma lo cobrable y se agrega la línea del descuento', async () => {
    const pos = setup()
    pos.selectMethod('mixed')
    pos.paymentsBreakdown.value = [
      { method: 'cash', inputAmount: 30, currency: 'USD', amount: 30 },
      { method: 'zelle', inputAmount: 20.35, currency: 'USD', amount: 20.35 },
    ]
    pos.discountPercent.value = 5

    await pos.processPayment({ appointmentId: 'a1', ...sale })
    await flushPromises()

    const breakdown = sent()[0].paymentsBreakdown
    expect(breakdown.map((s: any) => s.method)).toEqual(['cash', 'zelle', 'descuento'])
    expect(sum(breakdown)).toBe(53)
  })

  it('un grupo de dos servicios: cada cita lleva su propio descuento y cada desglose suma el valor de esa cita', async () => {
    const pos = setup()
    pos.discountPercent.value = 10

    await pos.processPayment({
      appointmentId: 'g1', serviceAmount: 100, products: [], exchangeRate: 100, tipAmount: 0, productsAmount: 0,
      isGroup: true, groupIds: ['a1', 'a2'], groupPrice: 100,
      members: [{ price: 70, employeeId: 'e1' }, { price: 30, employeeId: 'e2' }],
    })
    await flushPromises()

    const calls = sent()
    expect(calls.map(c => c.serviceAmount)).toEqual([70, 30]) // la comisión de cada una, sobre su precio inicial
    const discounts = calls.map(c => c.paymentsBreakdown.find((s: any) => s.method === 'descuento').amount)
    expect(discounts).toEqual([7, 3])
    expect(calls.map(c => sum(c.paymentsBreakdown))).toEqual([70, 30])
  })

  it('un grupo con pago mixto: lo escrito (lo cobrable) se reparte entre las citas y cada una suma su valor', async () => {
    const pos = setup()
    pos.selectMethod('mixed')
    pos.paymentsBreakdown.value = [
      { method: 'cash', inputAmount: 60, currency: 'USD', amount: 60 },
      { method: 'zelle', inputAmount: 30, currency: 'USD', amount: 30 },
    ]
    pos.discountPercent.value = 10

    await pos.processPayment({
      appointmentId: 'g1', serviceAmount: 100, products: [], exchangeRate: 100, tipAmount: 0, productsAmount: 0,
      isGroup: true, groupIds: ['a1', 'a2'], groupPrice: 100,
      members: [{ price: 70, employeeId: 'e1' }, { price: 30, employeeId: 'e2' }],
    })
    await flushPromises()

    const [first, second] = sent()
    const money = (call: Record<string, any>) => sum(call.paymentsBreakdown.filter((s: any) => s.method !== 'descuento'))
    expect(money(first)).toBe(63) // 70 − 7 de descuento
    expect(money(second)).toBe(27) // 30 − 3
    expect(sum(first.paymentsBreakdown)).toBe(70)
    expect(sum(second.paymentsBreakdown)).toBe(30)
  })

  it('un cobro directo de servicios también lleva el descuento', async () => {
    const pos = setup()
    pos.discountPercent.value = 5

    await pos.processDirectServiceSale({
      services: [{ serviceId: 's1', employeeId: 'e1', price: 100 }], serviceAmount: 100, products: [], exchangeRate: 100,
    })
    await flushPromises()

    const [call] = api.recordDirectServiceSale.mock.calls.map(c => c[0] as Record<string, any>)
    expect(call.serviceAmount).toBe(100)
    expect(call.paymentsBreakdown.map((s: any) => [s.method, s.amount])).toEqual([['cash', 95], ['descuento', 5]])
  })

  it('la venta de solo productos nunca lleva descuento', async () => {
    const pos = setup()
    pos.discountPercent.value = 5

    await pos.processDirectSale({ totalAmount: 30, products: [], exchangeRate: 100 })
    await flushPromises()

    const [call] = api.recordDirectSale.mock.calls.map(c => c[0] as Record<string, any>)
    expect(call.paymentsBreakdown).toHaveLength(1)
    expect(call.paymentsBreakdown[0].amount).toBe(30)
  })

  it('el descuento se calcula sobre el precio del servicio y no pasa del 100 %', () => {
    const pos = setup()
    pos.discountPercent.value = 5
    expect(pos.discountFor(53)).toBe(2.65)
    expect(pos.discountFor(0)).toBe(0)
    pos.discountPercent.value = 250
    expect(pos.discountFor(40)).toBe(40)
  })

  it('al terminar el cobro el descuento se limpia para la siguiente venta', async () => {
    const pos = setup()
    pos.discountPercent.value = 5

    await pos.processPayment({ appointmentId: 'a1', ...sale })
    await flushPromises()

    expect(pos.discountPercent.value).toBe(0)
  })
})
