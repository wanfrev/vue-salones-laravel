import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ClientVisitList from './ClientVisitList.vue'
import ClientVisitSummary from './ClientVisitSummary.vue'
import type { ClientVisit, ClientVisitsSummary } from '../../types/clientVisits'

const visit = (over: Partial<ClientVisit> = {}): ClientVisit => ({
  id: 'v1', kind: 'appointment', date: '2026-10-10T15:00:00Z', state: 'attended',
  services: [{ name: 'Corte', employee: 'Lucía', assistant: null, price: 20, status: 'completed' }],
  products: [], amount: 20, payment_status: 'paid',
  payments: [{ method: 'cash', amount: 20, currency: null, bank: null }],
  notes: null, internal_notes: null, ...over,
})

// El store del negocio usa TanStack Query: el montaje necesita su plugin además de Pinia.
const plugins = (): any[] => [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]]

const baseProps = {
  visits: [] as ClientVisit[], isLoading: false, isError: false, hasMore: false, isLoadingMore: false,
  from: '', to: '', rangeInvalid: false,
}
const render = (props: Partial<typeof baseProps> = {}) =>
  mount(ClientVisitList, { props: { ...baseProps, ...props }, global: { plugins: plugins() } })

beforeEach(() => setActivePinia(createPinia()))

describe('ClientVisitList', () => {
  it('muestra servicio, profesional, monto, estado y cómo pagó', () => {
    const w = render({ visits: [visit()] })
    const text = w.text()
    expect(text).toContain('Corte')
    expect(text).toContain('Lucía')
    expect(text).toContain('Atendida')
    expect(text).toContain('Pagado')
    expect(text).toContain('Pagó: Efectivo ($) $20')
  })

  it('una visita cancelada o no asistida no muestra monto ni estado de pago', () => {
    const w = render({ visits: [visit({ state: 'no_show', payment_status: 'unpaid', payments: [] })] })
    const text = w.text()
    expect(text).toContain('No asistió')
    expect(text).not.toContain('Sin pagar')
    expect(text).not.toContain('$20')
  })

  it('si una visita cancelada tuviera un cobro registrado, se muestra igual (no se oculta un dato real)', () => {
    const w = render({ visits: [visit({ state: 'cancelled', payment_status: 'unpaid' })] })
    expect(w.text()).toContain('Pagó: Efectivo ($) $20')
  })

  it('distingue una venta directa y lista sus productos', () => {
    const w = render({
      visits: [visit({
        id: 's1', kind: 'sale', services: [], amount: 35.5,
        products: [{ name: 'Shampoo', quantity: 2 }, { name: 'Mascarilla', quantity: 1 }],
        payments: [{ method: 'pago_movil', amount: 1200, currency: 'VES', bank: 'Banesco' }],
      })],
    })
    const text = w.text()
    expect(text).toContain('Venta directa')
    expect(text).toContain('Productos: Shampoo ×2, Mascarilla')
    expect(text).toContain('Pago Móvil Bs 1,200 (Banesco)')
    expect(text).toContain('$35.5')
    expect(text).not.toContain('Sin pagar')
  })

  it('muestra la nota interna solo si el servidor la mandó', () => {
    const withNote = render({ visits: [visit({ notes: 'Prefiere tinte suave', internal_notes: 'Paga tarde' })] }).text()
    expect(withNote).toContain('Prefiere tinte suave')
    expect(withNote).toContain('Nota interna: Paga tarde')
    const without = render({ visits: [visit({ notes: 'Prefiere tinte suave' })] }).text()
    expect(without).not.toContain('Nota interna')
  })

  it('distingue el vacío normal del vacío por filtro de fechas', () => {
    expect(render().text()).toContain('todavía no tiene visitas registradas')
    expect(render({ from: '2026-01-01', to: '2026-01-31' }).text()).toContain('No hay visitas en ese rango de fechas')
  })

  it('muestra el error con un botón para reintentar', async () => {
    const w = render({ isError: true })
    expect(w.text()).toContain('No se pudo cargar el historial')
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
  })

  it('«Ver más» aparece solo si hay otra página y emite loadMore', async () => {
    expect(render({ visits: [visit()], hasMore: false }).text()).not.toContain('Ver más')
    const w = render({ visits: [visit()], hasMore: true })
    await w.findAll('button').find(b => b.text() === 'Ver más visitas')!.trigger('click')
    expect(w.emitted('loadMore')).toHaveLength(1)
  })

  it('mientras carga muestra esqueletos y no la lista ni el vacío', () => {
    const w = render({ isLoading: true, visits: [visit()] })
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Corte')
  })

  it('emite el rango elegido y lo limpia sin mutar el padre', async () => {
    const w = render()
    const [from, to] = w.findAll('input[type="date"]')
    await from.setValue('2026-10-01')
    await to.setValue('2026-10-31')
    expect(w.emitted('update:range')!.at(-1)).toEqual(['2026-10-01', '2026-10-31'])
    await w.findAll('button').find(b => b.text() === 'Limpiar fechas')!.trigger('click')
    expect(w.emitted('update:range')!.at(-1)).toEqual(['', ''])
  })

  it('avisa si «Desde» es posterior a «Hasta»', () => {
    expect(render({ rangeInvalid: true }).text()).toContain('«Desde» no puede ser posterior')
  })
})

describe('ClientVisitSummary', () => {
  const summary: ClientVisitsSummary = {
    total_visits: 5, attended: 2, pending: 1, cancelled: 1, no_show: 1, direct_sales: 1, direct_sales_total: 10,
    total_billed: 60, total_paid: 20, balance: 20, last_visit: '2026-10-02T15:00:00Z', next_visit: '2026-10-25T15:00:00Z',
  }
  const mountSummary = (props: { summary: ClientVisitsSummary | null; loading?: boolean; isPatientNiche?: boolean }) =>
    mount(ClientVisitSummary, { props: { loading: false, isPatientNiche: false, ...props }, global: { plugins: plugins() } })

  it('suma las ventas directas al total facturado y desglosa canceladas y no asistió', () => {
    const text = mountSummary({ summary }).text()
    expect(text).toContain('$70') // 60 + 10 de venta directa
    expect(text).toContain('Incluye 1 venta directa ($10)')
    expect(text).toContain('2 atendidas · 1 canceladas · 1 no asistió')
    expect(text).toContain('Próxima')
    expect(text).not.toContain('Saldo pendiente')
  })

  it('en nichos de paciente muestra el estado de cuenta con el saldo pendiente', () => {
    const text = mountSummary({ summary, isPatientNiche: true }).text()
    expect(text).toContain('Estado de cuenta')
    expect(text).toContain('Saldo pendiente')
    expect(text).toContain('$20')
  })

  it('sin datos muestra ceros y «Sin …» en la última visita', () => {
    const text = mountSummary({ summary: null }).text()
    expect(text).toContain('$0')
    expect(text).toMatch(/Sin /)
  })
})
