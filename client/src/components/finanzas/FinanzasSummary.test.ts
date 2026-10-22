import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import KpiCards from './KpiCards.vue'
import CurrencyBreakdown from './CurrencyBreakdown.vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'

const plugins = [createPinia(), VueQueryPlugin]

const kpiProps = { incomeTotal: 100, vesIncomeTotal: 16400, tipsTotal: 5, expenseTotal: 40, netTotal: 50, profitTotal: 60, margin: 50 }
const mountKpis = (extra: Record<string, unknown> = {}) => mount(KpiCards, { props: { ...kpiProps, ...extra }, global: { plugins } })

describe('KpiCards', () => {
  it('muestra ingresos, gastos, ganancia neta y margen', () => {
    const text = mountKpis().text()
    expect(text).toContain('Ingresos')
    expect(text).toContain('$100.00')
    expect(text).toContain('Gastos')
    expect(text).toContain('$40.00')
    expect(text).toContain('Ganancia neta')
    expect(text).toContain('$50.00')
    expect(text).toContain('Margen')
    expect(text).toContain('50.0%')
    expect(text).toContain('+$5.00 propinas')
  })

  it('«Ganancia» solo en tienda o staffing; «Ganancia neta» no existe en staffing', () => {
    expect(mountKpis().text()).not.toMatch(/Ganancia(?! neta)/)
    expect(mountKpis({ isTienda: true }).text()).toMatch(/Ganancia(?! neta)/)
    const staffing = mountKpis({ isStaffing: true }).text()
    expect(staffing).toMatch(/Ganancia(?! neta)/)
    expect(staffing).not.toContain('Ganancia neta')
  })

  it('cada indicador emite su clic y las propinas emiten el suyo sin abrir ingresos', async () => {
    const wrapper = mountKpis({ isTienda: true })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')
    expect(wrapper.emitted('click-income')).toHaveLength(1)
    expect(wrapper.emitted('click-expense')).toHaveLength(1)
    expect(wrapper.emitted('click-profit')).toHaveLength(1)
    expect(wrapper.emitted('click-net')).toHaveLength(1)
    await wrapper.get('[role="button"]').trigger('click')
    expect(wrapper.emitted('click-tips')).toHaveLength(1)
    expect(wrapper.emitted('click-income')).toHaveLength(1)
  })

  it('marca el indicador activo', () => {
    expect(mountKpis({ activeCard: 'expense' }).findAll('button')[1].classes().join(' ')).toContain('shadow-warning')
  })
})

describe('CurrencyBreakdown', () => {
  const data = {
    title: 'Desglose de Ingresos', usdTotal: 100, vesTotal: 1640, usdLabel: 'Método de pago', vesLabel: 'Método de pago', pendingCredit: 25,
    usdItems: [{ label: 'Efectivo USD', amount: 100 }],
    vesItems: [{ label: 'Pago móvil', amount: 1640, subItems: [{ label: 'Banesco', amount: 1000 }] }],
  }

  it('muestra totales, métodos, bancos y el pendiente de créditos', () => {
    const text = mount(CurrencyBreakdown, { props: { data }, global: { plugins } }).text()
    expect(text).toContain('Desglose de Ingresos')
    expect(text).toContain('$100.00')
    expect(text).toContain('Efectivo USD')
    expect(text).toContain('Pago móvil')
    expect(text).toContain('Banesco')
    expect(text).toContain('Pendiente por cobrar de créditos')
    expect(text).toContain('$25.00')
  })

  it('cerrar emite close y hide-close lo oculta', async () => {
    const wrapper = mount(CurrencyBreakdown, { props: { data }, global: { plugins } })
    await wrapper.get('[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(mount(CurrencyBreakdown, { props: { data, hideClose: true }, global: { plugins } }).find('[aria-label="Cerrar"]').exists()).toBe(false)
  })
})

describe('RecentTransactionsCard', () => {
  const txs = [
    { id: 'a', date: '22/10/2026', description: 'Corte', type: 'ingreso', sourceLabel: 'Cobro de cita', employee: 'Ana', method: 'Pago móvil', amount: 25, exchangeRateUsed: 164, tipAmount: 3 },
    { id: 'b', date: '22/10/2026', description: 'Venta', type: 'ingreso', sourceLabel: 'Venta directa', employee: 'Beto', method: 'Efectivo', amount: 48, receiptCode: 'A-1', exchangeRateUsed: 164,
      items: [{ id: 'i1', product: 'Shampoo', quantity: 2, unitPrice: 12, total: 24 }] },
    { id: 'c', date: '21/10/2026', description: 'Insumos', type: 'gasto', sourceLabel: 'Gasto operativo', method: 'Transferencia', amount: 10, exchangeRateUsed: 164 },
    { id: 'd', date: '20/10/2026', description: 'Pago Camila', type: 'nomina', sourceLabel: 'Nómina', method: 'Efectivo', amount: 80, exchangeRateUsed: 164 },
  ]
  const mountTx = (canViewAll = true) => mount(RecentTransactionsCard, { props: { transactions: txs, canViewAll }, global: { plugins } })

  it('muestra fecha, descripción, origen, empleado, método, tipo, monto y propina', () => {
    const rows = mountTx().findAll('[data-testid="recent-tx"]')
    expect(rows).toHaveLength(4)
    const first = rows[0].text()
    for (const s of ['22/10/2026', 'Corte', 'Cobro de cita', 'Ana', 'Pago móvil', 'Ingreso', '+$25.00', '+$3.00 propina']) expect(first).toContain(s)
    expect(rows[1].text()).toContain('Vendido por: Beto')
    expect(rows[1].text()).toContain('Factura #A-1')
    expect(rows[2].text()).toContain('Gasto')
    expect(rows[2].text()).toContain('-$10.00')
    expect(rows[3].text()).toContain('Nómina')
  })

  it('una factura se expande para ver sus productos; un cobro simple no', async () => {
    const wrapper = mountTx()
    const rows = wrapper.findAll('[data-testid="recent-tx"]')
    expect(rows[1].text()).toContain('Factura (1 prod.)')
    expect(rows[1].text()).not.toContain('Productos incluidos')
    await rows[1].get('div').trigger('click')
    expect(rows[1].text()).toContain('Productos incluidos en la factura')
    expect(rows[1].text()).toContain('Shampoo')
    await rows[0].get('div').trigger('click')
    expect(rows[0].text()).not.toContain('Productos incluidos')
  })

  it('«Ver todas» solo si hay más y emite viewAll', async () => {
    expect(mountTx(false).text()).not.toContain('Ver todas')
    const wrapper = mountTx(true)
    await wrapper.findAll('button').find(b => b.text().includes('Ver todas'))!.trigger('click')
    expect(wrapper.emitted('viewAll')).toHaveLength(1)
  })
})
