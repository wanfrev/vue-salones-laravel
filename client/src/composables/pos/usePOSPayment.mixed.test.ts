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

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ id: 'tx' })
  store.features = {}
  localStorage.clear()
})

describe('usePOSPayment — cortesía como una parte del pago mixto', () => {
  it('con la cortesía habilitada, el pago mixto la ofrece junto a crédito y efectivo', () => {
    store.features = { courtesy_charge_enabled: true }
    const values = setup().mixedMethods.value.map(m => m.value)

    expect(values).toContain('cortesia')
    expect(values).toContain('credito')
    expect(values).toContain('cash')
  })

  it('sin la cortesía habilitada no se ofrece, y Cashea y «Mixto» nunca son una línea del mixto', () => {
    const off = setup().mixedMethods.value.map(m => m.value)
    expect(off).not.toContain('cortesia')

    store.features = { courtesy_charge_enabled: true }
    const on = setup().mixedMethods.value.map(m => m.value)
    expect(on).not.toContain('cashea')
    expect(on).not.toContain('mixed')
  })

  it('cobra la venta completa (la comisión sale sobre $53) con el desglose: efectivo $17 + crédito $19 + cortesía $17', async () => {
    store.features = { courtesy_charge_enabled: true }
    const pos = setup()
    pos.selectMethod('mixed')
    pos.paymentsBreakdown.value = [
      { method: 'cash', inputAmount: 17, currency: 'USD', amount: 17 },
      { method: 'credito', inputAmount: 19, currency: 'USD', amount: 19 },
      { method: 'cortesia', inputAmount: 17, currency: 'USD', amount: 17 },
    ]

    await pos.processPayment({ appointmentId: 'a1', serviceAmount: 53, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()

    const [call] = api.recordSale.mock.calls.map(c => c[0] as Record<string, any>)
    expect(call.method).toBe('mixed')
    expect(call.serviceAmount).toBe(53)
    expect(call.paymentsBreakdown.map((s: any) => [s.method, s.amount])).toEqual([['cash', 17], ['credito', 19], ['cortesia', 17]])
  })
})
