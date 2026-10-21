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

vi.mock('../../services/posService', () => ({
  ...api,
  posKeys: { pending: () => ['pos-pending'], products: () => ['pos-products'] },
}))
vi.mock('../common/useAuth', () => ({ useAuth: () => ({ authStore: { businessId: 'b1', role: 'admin' } }) }))
vi.mock('../common/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null, nicheType: 'psicologia', features: {} }) }))
vi.mock('../finanzas/useBanks', () => ({ useBanks: () => ({ banks: ref([]) }) }))

import { usePOSPayment } from './usePOSPayment'
import { useCasheaDraft } from './useCasheaDraft'

function setup() {
  let pos!: ReturnType<typeof usePOSPayment>
  const Host = defineComponent({ setup() { pos = usePOSPayment(); return () => h('div') } })
  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] } })
  return pos
}

const sent = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.map(c => c[0] as Record<string, any>)

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ id: 'tx' })
  localStorage.clear()
  useCasheaDraft().reset()
})

describe('usePOSPayment — cobro con Cashea', () => {
  it('a single appointment is charged at the Cashea amount and carries the Cashea block', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    useCasheaDraft().draft.total = 164

    await pos.processPayment({ appointmentId: 'a1', serviceAmount: 120, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()

    const [call] = sent(api.recordSale)
    expect(call.serviceAmount).toBe(164)
    expect(call.method).toBe('cashea')
    expect(call.cashea).toEqual({ fee_percentage: 10, down_payment_percentage: 40 })
  })

  it('a program (group of appointments) splits the Cashea amount among them, each with the Cashea block', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    useCasheaDraft().draft.total = 164

    await pos.processPayment({
      appointmentId: 'a1', serviceAmount: 120, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0,
      isGroup: true, groupIds: ['a1', 'a2'], groupPrice: 120,
      members: [{ appointmentId: 'a1', employeeId: 'e1', price: 60 }, { appointmentId: 'a2', employeeId: 'e1', price: 60 }],
    })
    await flushPromises()

    const calls = sent(api.recordSale)
    expect(calls.map(c => c.serviceAmount)).toEqual([82, 82])
    expect(calls.every(c => c.cashea?.fee_percentage === 10)).toBe(true)
  })

  it('without typing an amount, it charges the price', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    await pos.processPayment({ appointmentId: 'a1', serviceAmount: 120, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()
    expect(sent(api.recordSale)[0].serviceAmount).toBe(120)
  })

  it('a direct service sale spreads the Cashea amount over the services', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    useCasheaDraft().draft.total = 164

    await pos.processDirectServiceSale({
      services: [{ serviceId: 's1', employeeId: 'e1', price: 90 }, { serviceId: 's2', employeeId: 'e1', price: 30 }],
      serviceAmount: 120, products: [], exchangeRate: 1,
    })
    await flushPromises()

    const [call] = sent(api.recordDirectServiceSale)
    expect(call.serviceAmount).toBe(164)
    expect(call.services.map((s: any) => s.price)).toEqual([123, 41])
    expect(call.cashea).toBeTruthy()
  })

  it('a product sale sends the Cashea block with its total', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    await pos.processDirectSale({ totalAmount: 124, products: [], exchangeRate: 1 })
    await flushPromises()
    expect(sent(api.recordDirectSale)[0]).toMatchObject({ totalAmount: 124, method: 'cashea' })
    expect(sent(api.recordDirectSale)[0].cashea).toBeTruthy()
  })

  it('other methods never send the Cashea block nor change the amount', async () => {
    const pos = setup()
    pos.selectMethod('zelle')
    useCasheaDraft().draft.total = 164
    await pos.processPayment({ appointmentId: 'a1', serviceAmount: 120, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()

    const [call] = sent(api.recordSale)
    expect(call.serviceAmount).toBe(120)
    expect(call.cashea).toBeUndefined()
  })

  it('the Cashea amount is cleared after charging, the day fee is kept', async () => {
    const pos = setup()
    pos.selectMethod('cashea')
    useCasheaDraft().draft.total = 130
    await pos.processPayment({ appointmentId: 'a1', serviceAmount: 120, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()
    expect(useCasheaDraft().draft.total).toBeNull()
    expect(useCasheaDraft().draft.feePercentage).toBe(10)
  })

  it('Cashea cannot be one line of a mixed payment', () => {
    const pos = setup()
    expect(pos.paymentMethods.value.some(m => m.value === 'cashea')).toBe(true)
    expect(pos.mixedMethods.value.some(m => m.value === 'cashea')).toBe(false)
  })
})
