import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { ALREADY_CHARGED_HINT, ALREADY_CHARGED_MESSAGE } from '../../lib/posErrors'

const api = vi.hoisted(() => ({
  recordSale: vi.fn(),
  recordDirectSale: vi.fn(),
  recordDirectServiceSale: vi.fn(),
  recordStandaloneTip: vi.fn(),
}))
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('../../services/posService', () => ({
  ...api,
  posKeys: { pending: () => ['pos-pending'], products: () => ['pos-products'] },
}))
vi.mock('../common/useAuth', () => ({ useAuth: () => ({ authStore: { businessId: 'b1', role: 'admin' } }) }))
vi.mock('../common/useNotification', () => ({ useNotification: () => notify }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null, nicheType: 'salon', features: {} }) }))
vi.mock('../finanzas/useBanks', () => ({ useBanks: () => ({ banks: ref([]) }) }))

import { usePOSPayment } from './usePOSPayment'

function setup() {
  let pos!: ReturnType<typeof usePOSPayment>
  const Host = defineComponent({ setup() { pos = usePOSPayment(); return () => h('div') } })
  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] } })
  return pos
}

// Secado $26 + Lavado $12: el grupo real que se cobró dos veces.
const group = { appointmentId: 'g1', serviceAmount: 38, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0, isGroup: true, groupIds: ['secado', 'lavado'], groupPrice: 38, members: [{ price: 26, employeeId: 'e1' }, { price: 12, employeeId: 'e1' }] }
const refused = () => new Error(`Esta cita ${ALREADY_CHARGED_HINT} por completo. Actualiza la pantalla.`)
const charged = () => api.recordSale.mock.calls.map(c => (c[0] as any).appointmentId)

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ id: 'tx' })
  notify.success.mockClear()
  notify.error.mockClear()
})

describe('usePOSPayment — cobro repetido', () => {
  it('si el servidor dice que todo el grupo ya estaba cobrado, no hay «cobro registrado» y se avisa', async () => {
    api.recordSale.mockRejectedValue(refused())
    const pos = setup()

    const result = await pos.processPayment(group)
    await flushPromises()

    expect(result.success).toBe(false)
    expect(notify.success).not.toHaveBeenCalled()
    expect(notify.error).toHaveBeenCalledWith(ALREADY_CHARGED_MESSAGE)
  })

  it('un grupo cobrado a medias se completa: se salta al que ya estaba cobrado y se cobra el que faltaba', async () => {
    api.recordSale.mockRejectedValueOnce(refused()).mockResolvedValueOnce({ id: 'tx-lavado' })
    const pos = setup()

    const result = await pos.processPayment(group)
    await flushPromises()

    expect(charged()).toEqual(['secado', 'lavado']) // se intentó con los dos
    expect(result.success).toBe(true)
    expect(result.transactions).toEqual([{ id: 'tx-lavado' }]) // solo el nuevo
    expect(notify.success).toHaveBeenCalled()
  })

  it('cualquier otro error sigue siendo un error: no se salta ni se esconde', async () => {
    api.recordSale.mockResolvedValueOnce({ id: 'tx-1' }).mockRejectedValueOnce(new Error('Sin conexión'))
    const pos = setup()

    const result = await pos.processPayment(group)
    await flushPromises()

    expect(result.success).toBe(false)
    expect(notify.error).toHaveBeenCalledWith('Sin conexión')
  })

  it('un cobro normal sigue funcionando igual', async () => {
    const pos = setup()

    const result = await pos.processPayment({ appointmentId: 'a1', serviceAmount: 53, products: [], exchangeRate: 1, tipAmount: 0, productsAmount: 0 })
    await flushPromises()

    expect(result.success).toBe(true)
    expect(charged()).toEqual(['a1'])
  })
})
