import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn().mockResolvedValue([]) }))
vi.mock('../common/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null, nicheType: 'salon', features: {} }) }))
vi.mock('./useBanks', () => ({ useBanks: () => ({ banks: ref([]) }) }))

import { apiRequest } from '../../lib/api'
import { useFinancialSummary } from './useFinancialSummary'

const api = vi.mocked(apiRequest)

/**
 * Caso real (12/11/2026): Pierina Segovia, Secado $26 + Lavado $12, cobrada dos veces → 4 cobros del mismo grupo.
 * Para quitar SOLO los dos repetidos, la lista individual tiene que poder eliminar un cobro sin arrastrar al grupo.
 */
const tx = (id: string, appointment: string, service: string, amount: number) => ({
  id, appointment_id: appointment, group_id: 'g1', paid_at: '2026-11-12T21:14:34Z', total_amount: amount, uncollected_amount: 0,
  local_amount: amount * 0.4, employee_amount: amount * 0.6, assistant_amount: 0, employee_percentage: '60.00', tip_amount: 0, method: 'punto_venta',
  exchange_rate_used: 1007, notes: null, client_name: 'PIERINA SEGOVIA', employee_name: 'KATHERINE ROBLES', service_name: service,
  payments_breakdown: [{ method: 'punto_venta', currency: 'VES', inputAmount: amount * 1007, amount }],
})
const FOUR = [tx('secado-1', 'a1', 'Secado largo de cabello', 26), tx('lavado-1', 'a2', 'Lavado sencillo de cabello', 12),
  tx('lavado-2', 'a2', 'Lavado sencillo de cabello', 12), tx('secado-2', 'a1', 'Secado largo de cabello', 26)]

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['finanzas-transactions', 'b1', 'month', '2026-11', null, null], FOUR)
  let ctx!: ReturnType<typeof useFinancialSummary>
  const Host = defineComponent({
    setup() { ctx = useFinancialSummary(ref('b1') as any, ref('month') as any, ref([]) as any, ref('2026-11') as any); return () => h('div') },
  })
  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient: qc }]] } })
  return ctx
}

const deleted = () => api.mock.calls.filter(c => c[0] === 'DELETE').map(c => String(c[1]).replace('/transactions/', ''))
const confirmSpy = vi.fn()
const promptSpy = vi.fn()
const realConfirm = window.confirm
const realPrompt = window.prompt

beforeEach(() => {
  api.mockClear()
  confirmSpy.mockReset().mockReturnValue(true)
  promptSpy.mockReset().mockReturnValue('Cobro duplicado')
  window.confirm = confirmSpy as any
  window.prompt = promptSpy as any
})
afterEach(() => { window.confirm = realConfirm; window.prompt = realPrompt })

describe('Finanzas — eliminar cobros', () => {
  it('desde la lista individual (onlyThis) elimina SOLO ese cobro y no a los demás del grupo', async () => {
    const ctx = setup()
    await flushPromises()

    ctx.confirmDeleteTransaction('lavado-2', true)
    await flushPromises()

    expect(deleted()).toEqual(['lavado-2'])
  })

  it('la confirmación dice cuál cobro es y que los demás no se tocan', async () => {
    const ctx = setup()
    await flushPromises()

    ctx.confirmDeleteTransaction('secado-2', true)

    const message = String(confirmSpy.mock.calls[0][0])
    expect(message).toContain('PIERINA SEGOVIA')
    expect(message).toContain('Secado largo de cabello')
    expect(message).toContain('$26.00')
    expect(message).toContain('no se tocan')
  })

  it('desde la fila agrupada de «Cobros de citas» sigue eliminando todos los cobros del grupo', async () => {
    const ctx = setup()
    await flushPromises()

    ctx.confirmDeleteTransaction('lavado-1')
    await flushPromises()

    expect(String(confirmSpy.mock.calls[0][0])).toContain('4 cobros')
    expect(deleted().sort()).toEqual(['lavado-1', 'lavado-2', 'secado-1', 'secado-2'])
  })

  it('si la persona cancela la confirmación no se elimina nada', async () => {
    confirmSpy.mockReturnValue(false)
    const ctx = setup()
    await flushPromises()

    ctx.confirmDeleteTransaction('lavado-2', true)
    await flushPromises()

    expect(deleted()).toEqual([])
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('manda el motivo escrito junto con la eliminación', async () => {
    const ctx = setup()
    await flushPromises()

    ctx.confirmDeleteTransaction('lavado-2', true)
    await flushPromises()

    const call = api.mock.calls.find(c => c[0] === 'DELETE')!
    expect(call[2]).toEqual({ reason: 'Cobro duplicado' })
  })
})
