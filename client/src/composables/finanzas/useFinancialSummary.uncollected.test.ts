import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn().mockResolvedValue([]) }))
vi.mock('../common/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null, nicheType: 'salon', features: {} }) }))
vi.mock('./useBanks', () => ({ useBanks: () => ({ banks: ref([]) }) }))

import { useFinancialSummary } from './useFinancialSummary'

/**
 * Venta de $53 (manicure) donde la clienta paga $17: el resto es crédito ($19) y cortesía ($17). La comisión de la
 * manicurista sale sobre los $53, pero a Finanzas solo entran los $17 cobrados.
 */
const mixedTx = (over: Record<string, unknown> = {}) => ({
  id: 'tx1', appointment_id: 'a1', group_id: null, paid_at: '2026-11-05T15:00:00Z',
  total_amount: 53, uncollected_amount: 36, local_amount: 31.8, employee_amount: 21.2, assistant_amount: 0, employee_percentage: 40, tip_amount: 0,
  method: 'mixed', exchange_rate_used: 1, notes: null, client_name: 'Maria Nava', employee_name: 'Manicurista', service_name: 'Pedicure semipermanente',
  payments_breakdown: [
    { method: 'cash', currency: 'USD', inputAmount: 17, amount: 17 },
    { method: 'credito', currency: 'USD', inputAmount: 19, amount: 19 },
    { method: 'cortesia', currency: 'USD', inputAmount: 17, amount: 17 },
  ],
  ...over,
})

function setup(transactions: any[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const month = ref('2026-11')
  qc.setQueryData(['finanzas-transactions', 'b1', 'month', '2026-11', null, null], transactions)
  let ctx!: ReturnType<typeof useFinancialSummary>
  const Host = defineComponent({
    setup() { ctx = useFinancialSummary(ref('b1') as any, ref('month') as any, ref([]) as any, month as any); return () => h('div') },
  })
  mount(Host, { global: { plugins: [[VueQueryPlugin, { queryClient: qc }]] } })
  return ctx
}

describe('Finanzas con un pago mixto que incluye crédito y cortesía', () => {
  it('el cobro cuenta solo lo cobrado ($17), no el valor completo de la venta ($53)', async () => {
    const ctx = setup([mixedTx()])
    await flushPromises()

    expect(ctx.appointmentIncomeDetails.value).toHaveLength(1)
    expect(ctx.appointmentIncomeDetails.value[0].amount).toBe(17)
    const income = ctx.allTransactions.value.filter((r: any) => r.type === 'ingreso')
    expect(income.map((r: any) => r.amount)).toEqual([17])
    expect(income.map((r: any) => r.total)).toEqual([17])
  })

  it('el ingreso por servicio y el total en bolívares tampoco cuentan crédito ni cortesía', async () => {
    const ctx = setup([mixedTx({ exchange_rate_used: 100 })])
    await flushPromises()

    expect(ctx.servicesRevenue.value.find(s => s.name === 'Pedicure semipermanente')?.amount).toBe(17)
    // 17 $ cobrados a 100 Bs; sin las líneas de crédito ($19) ni cortesía ($17)
    expect(ctx.vesIncomeTotal.value).toBe(1700)
  })

  it('la comisión de la manicurista sigue saliendo sobre el valor completo', async () => {
    const ctx = setup([mixedTx()])
    await flushPromises()

    const row = ctx.employeeEarningsByEmployee.value.find(e => e.employeeName === 'Manicurista')!
    expect(row.commissionTotal).toBe(21.2)
    const pay = ctx.employeePayments.value[0]
    expect(pay.earnings).toBe(21.2)
    expect(pay.amount).toBe(53) // la base de su comisión es la venta completa
  })

  it('un cobro sin parte no cobrada, o de un servidor sin el campo, se ve igual que siempre', async () => {
    const plain = mixedTx({ id: 'tx2', method: 'cash', uncollected_amount: 0, payments_breakdown: [{ method: 'cash', currency: 'USD', inputAmount: 53, amount: 53 }] })
    const { uncollected_amount: _omit, ...legacy } = mixedTx({ id: 'tx3', method: 'cash', payments_breakdown: [{ method: 'cash', currency: 'USD', inputAmount: 40, amount: 40 }], total_amount: 40 })
    const ctx = setup([plain, legacy])
    await flushPromises()

    expect(ctx.allTransactions.value.filter((r: any) => r.type === 'ingreso').map((r: any) => r.amount).sort()).toEqual([40, 53])
  })

  it('un crédito o cortesía de venta completa sigue sin ser ingreso', async () => {
    const ctx = setup([mixedTx({ id: 'tx4', method: 'cortesia', uncollected_amount: 0 }), mixedTx({ id: 'tx5', method: 'credito', uncollected_amount: 0 })])
    await flushPromises()

    expect(ctx.allTransactions.value.filter((r: any) => r.type === 'ingreso')).toHaveLength(0)
    expect(ctx.vesIncomeTotal.value).toBe(0)
  })
})
