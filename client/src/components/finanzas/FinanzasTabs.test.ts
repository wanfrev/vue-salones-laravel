import { describe, it, expect, beforeAll, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { ref } from 'vue'
import DetailMovimientos from './DetailMovimientos.vue'
import PropinasSection from './PropinasSection.vue'
import SupplierPaymentsSection from './SupplierPaymentsSection.vue'
import CreditosSection from './CreditosSection.vue'
import BankAccountsSection from './BankAccountsSection.vue'
import CuadreDelDiaSection from './CuadreDelDiaSection.vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { banksKeys } from '../../services/banksService'
import { dailyReportsKeys } from '../../services/dailyReportService'
import { transactionAuditLogKeys } from '../../services/transactionAuditLogService'
import { serviciosKeys } from '../../services/serviciosService'

// Sin servidor: cualquier petición pendiente se queda esperando en vez de fallar con ruido.
beforeAll(() => { vi.stubGlobal('fetch', () => new Promise(() => {})) })

const period = { start: '2026-10-01', end: '2026-10-31' }
const noop = () => {}

function setup(component: any, props: Record<string, unknown>, seed: (qc: QueryClient) => void = () => {}, niche = 'salon') {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] })
  seed(qc)
  const wrapper = mount(component, { props, global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient: qc }]] } })
  useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
  ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: niche, features: {} }
  return { wrapper, qc }
}

describe('Detalle de Movimientos', () => {
  const mut = { isPending: ref(false) }
  const calls: string[] = []
  const summaryCtx: any = {
    appointmentIncomeDetails: ref([
      { id: 'c1', date: '20/10/2026', client: 'María', employee: 'Valentina', service: 'Corte', notes: 'Pago dividido', method: 'Pago móvil', breakdownLabel: '', amount: 25, exchangeRateUsed: 164, primaryCurrency: 'USD', tipAmount: 3, rawMethod: 'cash' },
      { id: 'c2', date: '21/10/2026', client: 'Luis', employee: 'Andrés', service: 'Barba', notes: '', method: 'Efectivo', breakdownLabel: 'Mixto', amount: 10, exchangeRateUsed: 164, primaryCurrency: 'USD', tipAmount: 0, rawMethod: 'cash' },
    ]),
    productSalesDetails: ref([{ id: 'v1', date: '22/10/2026', clientName: 'Luis', product: 'Cera', quantity: 2, unitPrice: 8, paymentMethod: 'cash', currency: 'USD', total: 16, originalAmount: 16, exchangeRateUsed: 164 }]),
    productSalesInvoices: ref([]),
    productSalesBreakdown: ref([{ name: 'Cera', amount: 16 }]),
    startEdit: (x: any) => calls.push('edit:' + x.id),
    confirmDeleteTransaction: (id: string) => calls.push('del:' + id),
    handleDeleteProductSale: (id: string) => calls.push('delsale:' + id),
    editTransactionMutation: mut, deleteTransactionMutation: mut,
  }
  const expensesCtx: any = {
    expenses: ref([
      { id: 'g1', date: '21/10/2026', name: 'Insumos', category: 'Insumos', amount: 120, currency: 'VES', originalAmount: 19680, exchangeRateUsed: 164 },
      { id: 'g2', date: '20/10/2026', name: 'Renta', category: 'Fijos', amount: 300, currency: 'USD', originalAmount: 300, exchangeRateUsed: 164 },
    ]),
    isLoading: ref(false), queryError: ref(null), openNew: () => calls.push('new'), openEdit: (e: any) => calls.push('edit-exp:' + e.id), handleDelete: (id: string) => calls.push('del-exp:' + id),
  }
  const props = (extra: Record<string, unknown> = {}) => ({ summaryCtx, expensesCtx, selectedPeriod: { value: 'month' }, selectedMonth: { value: '2026-10' }, businessId: ref('b1'), ...extra })
  const seedServicios = (qc: QueryClient) => qc.setQueryData(serviciosKeys.all('b1', null), [
    { id: 's1', name: 'Corte', price: 20, duration: 45, status: 'Activo', category: 'Cabello', citasMes: 0, ingresos: 0, icon: '', iconBg: '', iconColor: '' },
    { id: 's2', name: 'Manicure', price: 15, duration: 60, status: 'Inactivo', category: 'Uñas', citasMes: 0, ingresos: 0, icon: '', iconBg: '', iconColor: '' },
  ])

  it('Cobros: muestra el total, cada cobro con sus datos y propina, y filtra con el buscador', async () => {
    const { wrapper } = setup(DetailMovimientos, props())
    await flushPromises()
    expect(wrapper.text()).toContain('Total Cobrado')
    expect(wrapper.text()).toContain('$35.00')
    const rows = wrapper.findAll('[data-testid="cobro-row"]')
    expect(rows).toHaveLength(2)
    for (const s of ['20/10/2026', 'María', 'Corte', 'Valentina', 'Pago dividido', 'Pago móvil', '$25.00', '+$3.00 propina']) expect(rows[0].text()).toContain(s)
    expect(rows[1].text()).toContain('Mixto')
    await wrapper.get('input[type="text"]').setValue('barba')
    expect(wrapper.findAll('[data-testid="cobro-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('$10.00')
  })

  it('Cobros: editar y eliminar llaman a lo mismo de siempre', async () => {
    calls.length = 0
    const { wrapper } = setup(DetailMovimientos, props())
    await flushPromises()
    const row = wrapper.get('[data-testid="cobro-row"]')
    await row.get('[title="Editar cita y cobro"]').trigger('click')
    await row.get('[title="Eliminar cobro"]').trigger('click')
    expect(calls).toEqual(['edit:c1', 'del:c1'])
  })

  it('Ocultar el total (encargado) mantiene los cobros pero no el monto', async () => {
    const { wrapper } = setup(DetailMovimientos, props({ hideTotal: true }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Total Cobrado')
    expect(wrapper.findAll('[data-testid="cobro-row"]')).toHaveLength(2)
  })

  it('Ventas (no tienda): filas de producto, método y «Productos principales»', async () => {
    const { wrapper } = setup(DetailMovimientos, props())
    await flushPromises()
    await wrapper.findAll('[role="tab"]').find(t => t.text().includes('Ventas'))!.trigger('click')
    const row = wrapper.get('[data-testid="venta-row"]')
    for (const s of ['Cera', 'Luis', 'Efectivo ($)', '$16.00']) expect(row.text()).toContain(s)
    expect(wrapper.text()).toContain('Productos principales')
  })

  it('Gastos (Egresos): solo la pestaña de gastos, con registrar, editar y eliminar', async () => {
    calls.length = 0
    const { wrapper } = setup(DetailMovimientos, props({ showOnly: 'gastos' }))
    await flushPromises()
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Total Gastado')
    expect(wrapper.text()).toContain('$420.00')
    const rows = wrapper.findAll('[data-testid="gasto-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('19.680,00 Bs')
    await wrapper.findAll('button').find(b => b.text().includes('Registrar gasto'))!.trigger('click')
    await rows[0].get('[title="Editar gasto"]').trigger('click')
    await rows[1].get('[title="Eliminar gasto"]').trigger('click')
    expect(calls).toEqual(['new', 'edit-exp:g1', 'del-exp:g2'])
  })

  it('Servicios: lista el catálogo con su estado y total de activos', async () => {
    const { wrapper } = setup(DetailMovimientos, props(), seedServicios)
    await flushPromises()
    await wrapper.findAll('[role="tab"]').find(t => t.text().includes('Catálogo'))!.trigger('click')
    expect(wrapper.text()).toContain('Total Activos')
    const rows = wrapper.findAll('[data-testid="svc-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Corte')
    expect(rows[0].text()).toContain('45 min')
    expect(rows[0].text()).toContain('Activo')
    expect(rows[1].text()).toContain('Inactivo')
  })
})

describe('Propinas directas', () => {
  const mut = { isPending: ref(false) }
  const calls: string[] = []
  const ctx = (tips: any[]) => ({
    standaloneTips: ref(tips), standaloneTipsTotal: ref(8), isLoading: ref(false),
    startEdit: (r: any) => calls.push('edit:' + r.id), confirmDeleteTransaction: (id: string) => calls.push('del:' + id),
    editTransactionMutation: mut, deleteTransactionMutation: mut, showEditModal: ref(false), cancelEdit: noop,
  })
  const tips = [{ id: 't1', date: '22/10/2026', employee: 'Valentina', notes: 'Excelente', method: 'Zelle', amount: 5 }]

  it('muestra fecha, empleado, notas, método, propina y el total del período', () => {
    const { wrapper } = setup(PropinasSection, { ctx: ctx(tips) })
    const row = wrapper.get('[data-testid="tip-row"]')
    for (const s of ['22/10/2026', 'Valentina', 'Excelente', 'Zelle', '$5.00']) expect(row.text()).toContain(s)
    expect(wrapper.text()).toContain('Total del período')
    expect(wrapper.text()).toContain('$8.00')
  })

  it('editar y eliminar; y mensaje cuando no hay propinas', async () => {
    calls.length = 0
    const { wrapper } = setup(PropinasSection, { ctx: ctx(tips) })
    await wrapper.get('[title="Editar"]').trigger('click')
    await wrapper.get('[title="Eliminar"]').trigger('click')
    expect(calls).toEqual(['edit:t1', 'del:t1'])
    expect(setup(PropinasSection, { ctx: ctx([]) }).wrapper.text()).toContain('No hay propinas directas en este período.')
  })
})

describe('Abonos a proveedores', () => {
  const calls: string[] = []
  const ctx: any = {
    isLoading: ref(false),
    payments: ref([{ id: 's1', supplierName: 'Distribuidora', amount: 120, currency: 'USD', originalAmount: 120, exchangeRateUsed: 164, paymentMethod: 'zelle', paymentDate: '2026-10-20' }]),
    openNew: () => calls.push('new'), handleDelete: (id: string) => calls.push('del:' + id),
    showModal: ref(false), closeModal: noop, form: ref({}), createMutation: { isPending: ref(false) }, saveError: ref(''),
    supplierMap: ref({}), supplierOptions: ref([]), selectedSupplierPendingAfter: ref(0), selectedSupplierPendingBalance: ref(0), handleSave: noop,
  }

  it('muestra el abono y permite agregar y eliminar', async () => {
    const { wrapper } = setup(SupplierPaymentsSection, { ctx })
    const row = wrapper.get('[data-testid="supplier-payment-row"]')
    expect(row.text()).toContain('Distribuidora')
    expect(row.text()).toContain('$120.00')
    await wrapper.findAll('button').find(b => b.text().includes('Abono'))!.trigger('click')
    await row.get('[title="Eliminar"]').trigger('click')
    expect(calls).toEqual(['new', 'del:s1'])
  })
})

describe('Créditos', () => {
  const credits = [
    { id: 'cr1', client_name: 'Ana', client_phone: '0414', amount: 80, paid_amount: 30, remaining: 50, status: 'partial', created_at: '2026-10-12T10:00:00Z', paid_at: null },
    { id: 'cr2', client_name: 'Luis', client_phone: '', amount: 45, paid_amount: 0, remaining: 45, status: 'pending', created_at: '2026-10-15T10:00:00Z', paid_at: null },
    { id: 'cr3', client_name: 'Carla', client_phone: '', amount: 60, paid_amount: 60, remaining: 0, status: 'paid', created_at: '2026-10-05T10:00:00Z', paid_at: '2026-10-18T10:00:00Z', paid_method: 'zelle' },
  ]
  const seed = (qc: QueryClient) => qc.setQueryData(['credits', 'b1'], credits)

  it('Pendientes: saldo, abonado, total pendiente, y eliminar solo si no hay abonos', async () => {
    const { wrapper } = setup(CreditosSection, { periodDates: period }, seed)
    await flushPromises()
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('$50.00')
    expect(rows[0].text()).toContain('de $80.00 · abonado $30.00')
    expect(rows[0].find('[title="Eliminar crédito"]').exists()).toBe(false)
    expect(rows[1].find('[title="Eliminar crédito"]').exists()).toBe(true)
    expect(rows[0].text()).toContain('Registrar abono')
    expect(wrapper.text()).toContain('$95.00')
  })

  it('Pagados: monto y método, y mensaje vacío', async () => {
    const { wrapper } = setup(CreditosSection, { periodDates: period }, seed)
    await flushPromises()
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    const rows = wrapper.findAll('[data-testid="credit-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('$60.00')
    expect(rows[0].text()).toContain('Zelle')
    const empty = setup(CreditosSection, { periodDates: period }, (qc) => qc.setQueryData(['credits', 'b1'], []))
    await flushPromises()
    expect(empty.wrapper.text()).toContain('No hay créditos pendientes.')
  })
})

describe('Créditos de un pago mixto', () => {
  // Paula Gallegos: venta de $115,00 = $14,01 con gift card en el momento + $100,99 a crédito.
  const paula = { id: 'cr9', client_name: 'PAULA GALLEGOS', client_phone: '', amount: 100.99, paid_amount: 0, remaining: 100.99, status: 'pending', sale_total: 115, paid_at_sale: 14.01, created_at: '2026-10-23T10:00:00Z', paid_at: null }
  const sinMixto = { id: 'cr10', client_name: 'Luis', client_phone: '', amount: 45, paid_amount: 0, remaining: 45, status: 'pending', sale_total: 45, paid_at_sale: 0, created_at: '2026-10-15T10:00:00Z', paid_at: null }
  const seedMixed = (qc: QueryClient) => qc.setQueryData(['credits', 'b1'], [paula, sinMixto])

  it('la fila muestra el total de la venta y lo pagado al vender, sin tocar el saldo', async () => {
    const { wrapper } = setup(CreditosSection, { periodDates: period }, seedMixed)
    await flushPromises()
    const rows = wrapper.findAll('[data-testid="credit-row"]')

    expect(rows[0].text()).toContain('$100.99')
    expect(rows[0].get('[data-testid="credit-sale-note"]').text()).toContain('Venta $115.00 · pagó $14.01 al vender')
    // Una venta 100 % a crédito no tiene nada que aclarar.
    expect(rows[1].find('[data-testid="credit-sale-note"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('$145.99')
  })

  it('al registrar un abono, el diálogo desglosa venta, pagado al vender y saldo', async () => {
    const { wrapper } = setup(CreditosSection, { periodDates: period }, seedMixed)
    await flushPromises()
    await wrapper.findAll('[data-testid="credit-row"]')[0].findAll('button').find(b => b.text().includes('Registrar abono'))!.trigger('click')
    await flushPromises()

    const dialog = document.body.textContent!.replace(/\s+/g, ' ')
    expect(dialog).toContain('Total de la venta$115.00')
    expect(dialog).toContain('Pagado al vender$14.01')
    expect(dialog).toContain('Saldo pendiente$100.99')
  })

  it('si el servidor no manda esos datos (crédito viejo en caché) se ve como antes', async () => {
    const { wrapper } = setup(CreditosSection, { periodDates: period }, (qc) => qc.setQueryData(['credits', 'b1'], [{ ...paula, sale_total: null, paid_at_sale: null }]))
    await flushPromises()

    expect(wrapper.find('[data-testid="credit-sale-note"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('$100.99')
  })
})

describe('Bancos', () => {
  it('lista los bancos y el mensaje vacío', async () => {
    const { wrapper } = setup(BankAccountsSection, {}, (qc) => qc.setQueryData(banksKeys.all('b1'), [{ id: 'b1', name: 'Banesco' }, { id: 'b2', name: 'Mercantil' }]))
    await flushPromises()
    expect(wrapper.findAll('[data-testid="bank-row"]').map(r => r.text())).toEqual(['Banesco', 'Mercantil'])
    expect(wrapper.find('[title="Eliminar banco"]').exists()).toBe(true)
    const empty = setup(BankAccountsSection, {}, (qc) => qc.setQueryData(banksKeys.all('b1'), []))
    await flushPromises()
    expect(empty.wrapper.text()).toContain('No has agregado ningún banco todavía.')
  })
})

describe('Cuadre del Día', () => {
  const income = { title: 'Desglose de Ingresos', usdTotal: 100, vesTotal: 0, usdLabel: 'Método de pago', vesLabel: 'Método de pago', usdItems: [{ label: 'Efectivo USD', amount: 100 }], vesItems: [] }
  const seed = (qc: QueryClient) => {
    qc.setQueryData(dailyReportsKeys.dashboard('b1', null, period.start, period.end), {
      fields: {}, totals: {}, meta: {}, banks: { pago_movil_bs: [{ name: 'Banesco', amount_bs: 600000 }] },
      by_cashier: [{ user_id: 'u1', name: 'Camila', usd_total: 1800, ves_total: 0, credito_issued: 45, usd_items: [{ method: 'cash_usd', amount: 1500 }], ves_items: [] }],
    })
    qc.setQueryData(transactionAuditLogKeys.all('b1', null, period.start, period.end), [
      { id: 'a1', action: 'deleted', client_name: 'Rosa', created_at: '2026-10-20T14:00:00Z', performed_by: 'Admin', before: { method: 'cash', total_amount: 30 }, after: null, reason: 'Duplicado' },
    ])
  }
  const props = (isStrictAdmin: boolean) => ({ businessId: 'b1', periodDates: period, branchId: null, isStrictAdmin, pendingCreditTotal: 95, incomeBreakdown: income })

  it('admin: banco, crédito pendiente, por persona y correcciones', async () => {
    const { wrapper } = setup(CuadreDelDiaSection, props(true), seed)
    await flushPromises()
    const text = wrapper.text()
    for (const s of ['Desglose de Ingresos', 'Por Banco (Bs)', 'Banesco', 'Crédito Pendiente', '$95.00', 'Ver créditos', 'Por Persona', 'Camila', '+ $45.00 en ventas a crédito', 'Correcciones y Eliminaciones', 'Eliminado', 'Rosa', 'Motivo: Duplicado', '(eliminado, sin reemplazo)']) {
      expect(text).toContain(s)
    }
    await wrapper.findAll('button').find(b => b.text() === 'Ver créditos')!.trigger('click')
    expect(wrapper.emitted('view-creditos')).toHaveLength(1)
  })

  it('no admin: sin «Por Persona» ni «Correcciones»', async () => {
    const { wrapper } = setup(CuadreDelDiaSection, props(false), seed)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Por Persona')
    expect(wrapper.text()).not.toContain('Correcciones y Eliminaciones')
    expect(wrapper.text()).toContain('Crédito Pendiente')
  })
})
