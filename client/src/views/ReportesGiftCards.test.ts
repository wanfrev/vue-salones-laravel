import { describe, it, expect, beforeAll } from 'vitest'
import { vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import Reportes from './Reportes.vue'
import GiftCards from './GiftCards.vue'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { dailyReportsKeys } from '../services/dailyReportService'
import { giftCardsKeys } from '../services/giftCardsService'
import { resolvePeriodDates, currentMonthKey } from '../lib/periodUtils'

// Sin servidor: cualquier petición pendiente (tasa, sucursales…) se queda esperando en vez de fallar con ruido.
beforeAll(() => { vi.stubGlobal('fetch', () => new Promise(() => {})) })

function setup(view: any, seed: (qc: QueryClient) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: view }] })
  seed(qc)
  const wrapper = mount(view, { global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient: qc }]] } })
  useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
  ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: { gift_cards: true } }
  return { wrapper, qc, pinia }
}

const report = (over: Record<string, unknown> = {}) => ({
  id: 'r1', business_id: 'b1', date: '2026-10-20', exchange_rate: 164, z_report_bs: 50000, z_report_usd: 300,
  total_bs: 50000, total_usd: 300, credit_usd: 0, credit_bs: 0, credits_detail: [], user: { id: 'u', name: 'Camila' },
  pos_bs: 0, pago_movil_bs: 0, cash_bs: 0, transfer_bs: 0, cash_usd: 0, zelle_usd: 0, binance_usd: 0, cashea_usd: 0, card_usd: 0, gift_card_usd: 0, other_usd: 0, other_bs: 0,
  ...over,
})

describe('Reportes', () => {
  it('lista los reportes con fecha, usuario, tasa, totales y descuadre', async () => {
    const { wrapper } = setup(Reportes, (qc) => {
      qc.setQueryData(dailyReportsKeys.all('b1', null), [
        report(),
        report({ id: 'r2', date: '2026-10-19', z_report_bs: 60000, credit_usd: 45, credits_detail: [{ name: 'Ana', amount: 45 }], user: undefined }),
      ])
    })
    await flushPromises()
    const rows = wrapper.findAll('[data-testid="report-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Por: Camila')
    expect(rows[0].text()).toContain('164.00 Bs/$')
    expect(rows[0].text()).toContain('50,000.00 Bs')
    expect(rows[0].find('[title^="Descuadre"]').exists()).toBe(true) // 50000 + 300×164 ≠ 50000
    expect(rows[1].text()).toContain('1 persona(s)')
    expect(rows[1].text()).toContain('$45.00 USD')
  })

  it('busca por usuario, muestra «Sin resultados» y limpia la búsqueda', async () => {
    const { wrapper } = setup(Reportes, (qc) => {
      qc.setQueryData(dailyReportsKeys.all('b1', null), [report(), report({ id: 'r2', user: { id: 'v', name: 'Valentina' } })])
    })
    await flushPromises()
    const input = wrapper.get('input[placeholder="Buscar por fecha, tasa o usuario..."]')
    await input.setValue('valen')
    expect(wrapper.findAll('[data-testid="report-row"]')).toHaveLength(1)
    await input.setValue('zzz')
    expect(wrapper.text()).toContain('Sin resultados de búsqueda')
    await wrapper.findAll('button').find(b => b.text() === 'Limpiar búsqueda')!.trigger('click')
    expect(wrapper.findAll('[data-testid="report-row"]')).toHaveLength(2)
  })

  it('sin reportes muestra el mensaje vacío y pagina de a 20', async () => {
    const empty = setup(Reportes, (qc) => qc.setQueryData(dailyReportsKeys.all('b1', null), []))
    await flushPromises()
    expect(empty.wrapper.text()).toContain('No hay reportes registrados')

    const many = setup(Reportes, (qc) => {
      qc.setQueryData(dailyReportsKeys.all('b1', null), Array.from({ length: 25 }, (_, i) => report({ id: `r${i}` })))
    })
    await flushPromises()
    expect(many.wrapper.findAll('[data-testid="report-row"]')).toHaveLength(20)
    expect(many.wrapper.text()).toContain('1-20')
  })

  it('el dashboard muestra los indicadores y los cobros por persona al admin', async () => {
    const range = resolvePeriodDates('month', currentMonthKey(), currentMonthKey())
    const { wrapper } = setup(Reportes, (qc) => {
      qc.setQueryData(dailyReportsKeys.all('b1', null), [report()])
      qc.setQueryData(dailyReportsKeys.dashboard('b1', null, range.start, range.end), {
        fields: { pos_bs: 0, pago_movil_bs: 980000, cash_bs: 0, transfer_bs: 0, other_bs: 0, cash_usd: 2400, zelle_usd: 0, binance_usd: 0, cashea_usd: 0, card_usd: 0, gift_card_usd: 0, other_usd: 0 },
        totals: { total_bs: 1140000, total_usd: 3660, grand_total_bs: 0, grand_total_usd: 0, credit_bs: 8000, credit_usd: 135 },
        meta: { reports_count: 21, avg_exchange_rate: 164.5 },
        banks: { pago_movil_bs: [{ name: 'Banesco', amount_bs: 600000 }] },
        by_cashier: [{ user_id: 'u1', name: 'Camila Torres', usd_total: 1800, ves_total: 0, credito_issued: 45, usd_items: [{ method: 'cash_usd', amount: 1500 }], ves_items: [] }],
      })
    })
    await flushPromises()
    const text = wrapper.text()
    for (const s of ['$3,660.00', 'Ingresos USD', '1,140,000.00 Bs', '$135.00', 'Créditos Bs', '21 reporte(s) en el período', 'Banesco', 'Cobros por Persona', 'Camila Torres', '+ $45.00 en ventas a crédito']) {
      expect(text).toContain(s)
    }
  })
})

describe('GiftCards', () => {
  const gc = (over: Record<string, unknown> = {}) => ({
    id: 'g1', code: 'GC-AB12CD', buyerName: 'María', buyerPhone: '0414', recipientName: 'Lucía', recipientPhone: null, amount: 50,
    status: 'active', notes: 'Cumpleaños', createdAt: '', ...over,
  })
  const cards = [
    gc(),
    gc({ id: 'g2', code: null, buyerName: null, buyerPhone: null, amount: 120 }),
    gc({ id: 'g3', status: 'redeemed', amount: 0 }),
    gc({ id: 'g4', status: 'expired' }),
  ]

  it('muestra las activas con código, comprador, beneficiario, notas y saldo, y cuenta las pestañas', async () => {
    const { wrapper } = setup(GiftCards, (qc) => qc.setQueryData(giftCardsKeys.all('b1', null), cards))
    await flushPromises()
    expect(wrapper.findAll('[role="tab"]').map(t => t.text())).toEqual(['Activas (2)', 'Historial (2)'])
    const cells = wrapper.findAll('[data-testid="giftcard-cell"]')
    expect(cells).toHaveLength(2)
    expect(cells[0].text()).toContain('GC-AB12CD')
    expect(cells[0].text()).toContain('María')
    expect(cells[0].text()).toContain('Lucía')
    expect(cells[0].text()).toContain('Sin teléfono')
    expect(cells[0].text()).toContain('"Cumpleaños"')
    expect(cells[0].text()).toContain('$50.00')
    expect(cells[1].text()).toContain('SIN CÓDIGO')
  })

  it('el historial muestra canjeadas y expiradas con su estado', async () => {
    const { wrapper } = setup(GiftCards, (qc) => qc.setQueryData(giftCardsKeys.all('b1', null), cards))
    await flushPromises()
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    const cells = wrapper.findAll('[data-testid="giftcard-cell"]')
    expect(cells).toHaveLength(2)
    expect(cells[0].text()).toContain('Canjeada / Consumida')
    expect(cells[1].text()).toContain('Expirada')
  })

  it('sin gift cards muestra el mensaje vacío de cada pestaña', async () => {
    const { wrapper } = setup(GiftCards, (qc) => qc.setQueryData(giftCardsKeys.all('b1', null), []))
    await flushPromises()
    expect(wrapper.text()).toContain('No hay gift cards activas')
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.text()).toContain('No hay gift cards en el historial')
  })

  it('«Nueva Gift Card» y «Editar» abren el formulario', async () => {
    const { wrapper } = setup(GiftCards, (qc) => qc.setQueryData(giftCardsKeys.all('b1', null), cards))
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text().includes('Nueva Gift Card'))!.trigger('click')
    expect(document.body.textContent).toContain('Registra una nueva tarjeta de regalo')
  })
})
