import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import InventoryMovements from './InventoryMovements.vue'
import { rangeForPreset } from './inventoryMovements'
import { inventarioKeys } from '../../services/inventarioService'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

const api = vi.mocked(apiRequest)

const move = (over: Record<string, unknown> = {}) => ({
  id: 'm1', date: '2026-11-05T13:39:00+00:00', type: 'consumption', quantity: -1, unit_cost: 2.5, total_cost: 2.5,
  notes: 'Consumo de Elena: Tortas', reference_type: 'employee_payment', product_id: 'p-tortas', product_name: 'Tortas',
  product_sku: 'TOR-1', variant_name: null, category_name: 'Comida', user_name: 'Camila Cajera', person_name: 'Elena Empleada',
  person_role: 'employee', branch_name: 'Sede Centro', location_name: 'Principal', ...over,
})
const pageResponse = (over: Record<string, unknown> = {}) => ({
  summary: { movements: 2, units_in: 10, units_out: 3, cost_in: 20, cost_out: 7.5 },
  types: [{ type: 'consumption', movements: 1 }, { type: 'purchase', movements: 1 }],
  users: [{ id: 'u1', name: 'Camila Cajera', movements: 1 }, { id: 'u2', name: 'Wanfredo Admin', movements: 1 }],
  categories: [{ id: 'cat1', name: 'Comida', movements: 2 }],
  movements: [move(), move({ id: 'm2', type: 'purchase', quantity: 10, product_name: 'Harina', reference_type: 'purchase_invoice', person_name: null, person_role: null, user_name: 'Wanfredo Admin', total_cost: 20, notes: null })],
  page: 1, has_more: false, range: { start: '2026-11-01', end: '2026-11-05' }, ...over,
})
const detailResponse = (over: Record<string, unknown> = {}) => ({
  movement: { ...move(), exchange_rate: 1 },
  source: { kind: 'employee_payment', employee: 'Elena Empleada', type: 'consumption', concept: 'Almuerzo', notes: null, amount: 5, date: '2026-11-05' },
  related: [{ id: 'm9', date: '2026-11-05T13:39:00+00:00', type: 'consumption', quantity: -2, product_name: 'Café', variant_name: null, branch_name: 'Sede Centro' }],
  ...over,
})

let page = pageResponse()
let detail: Record<string, unknown> = detailResponse()
const listCalls = () => api.mock.calls.map(c => String(c[1])).filter(u => u.startsWith('/inventory/movement-history?'))
const lastList = () => new URLSearchParams(listCalls().at(-1)!.split('?')[1])
const detailCalls = () => api.mock.calls.map(c => String(c[1])).filter(u => /^\/inventory\/movement-history\/[^?]+$/.test(u))

let qc!: QueryClient

function mountIt(props: { search?: string } = {}) {
  const pinia = createPinia()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(InventoryMovements, { props: { search: '', ...props }, attachTo: document.body, global: { plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] } })
  useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
  ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: {} }
  return wrapper
}

const pick = async (w: ReturnType<typeof mountIt>, testId: string, value: string) => {
  await w.get(`[data-testid="${testId}"]`).setValue(value)
  await flushPromises()
}

beforeEach(() => {
  page = pageResponse()
  detail = detailResponse()
  api.mockReset()
  api.mockImplementation((async (_m: string, url: string) => {
    if (/^\/inventory\/movement-history\/[^?]+$/.test(url)) return detail
    return page
  }) as any)
})
afterEach(() => { document.body.innerHTML = '' })

describe('InventoryMovements', () => {
  it('abre en «Este mes», con todas las páginas de datos del servidor y el resumen', async () => {
    const w = mountIt()
    await flushPromises()

    const q = lastList()
    const month = rangeForPreset('month')
    expect(q.get('start')).toBe(month.start)
    expect(q.get('end')).toBe(month.end)
    expect(q.get('sort')).toBe('recent')
    expect(q.get('page')).toBe('1')
    expect(w.findAll('[data-testid="movement-row"]')).toHaveLength(2)
    const summary = w.get('[data-testid="movements-summary"]').text()
    expect(summary).toContain('2 movimientos')
    expect(summary).toContain('entraron 10')
    expect(summary).toContain('salieron 3')
    expect(summary).toContain('$7.50')
    w.unmount()
  })

  it('cada fila dice cantidad con signo, a quién afecta y quién lo registró', async () => {
    const w = mountIt()
    await flushPromises()
    const [first, second] = w.findAll('[data-testid="movement-row"]')

    expect(first.text()).toContain('Tortas')
    expect(first.text()).toContain('−1')
    expect(first.text()).toContain('Empleado: Elena Empleada')
    expect(first.text()).toContain('Registró: Camila Cajera')
    expect(first.text()).toContain('Consumo de Elena: Tortas')
    expect(second.text()).toContain('+10')
    expect(second.text()).not.toContain('Empleado:')
    w.unmount()
  })

  it('elegir un mes pasado o fechas propias pide ese rango al servidor', async () => {
    const w = mountIt()
    await flushPromises()

    await pick(w, 'period-select', 'last_month')
    expect(lastList().get('start')).toBe(rangeForPreset('last_month').start)
    expect(lastList().get('end')).toBe(rangeForPreset('last_month').end)

    await pick(w, 'period-select', 'custom')
    await pick(w, 'custom-start', '2026-10-05')
    await pick(w, 'custom-end', '2026-10-12')
    expect(lastList().get('start')).toBe('2026-10-05')
    expect(lastList().get('end')).toBe('2026-10-12')
    w.unmount()
  })

  it('con fechas incompletas, al revés o de más de 12 meses avisa y no consulta', async () => {
    const w = mountIt()
    await flushPromises()
    await pick(w, 'period-select', 'custom')
    const before = listCalls().length

    expect(w.get('[data-testid="date-error"]').text()).toMatch(/fecha inicial y la final/)
    await pick(w, 'custom-start', '2026-10-20')
    await pick(w, 'custom-end', '2026-10-01')
    expect(w.get('[data-testid="date-error"]').text()).toMatch(/anterior/)
    await pick(w, 'custom-start', '2024-01-01')
    await pick(w, 'custom-end', '2026-10-01')
    expect(w.get('[data-testid="date-error"]').text()).toMatch(/12 meses/)

    expect(listCalls().length).toBe(before)
    w.unmount()
  })

  it('los chips de tipo muestran cuántos hay, filtran y siguen todos disponibles al elegir uno', async () => {
    const w = mountIt()
    await flushPromises()
    const chips = () => w.findAll('[data-testid="type-chip"]')

    expect(chips().map(c => c.text())).toEqual(['Consumos · 1', 'Compras · 1'])
    await chips()[0].trigger('click')
    await flushPromises()
    expect(lastList().get('types')).toBe('consumption')
    // El servidor sigue mandando todos los tipos: elegir uno no esconde a los demás.
    expect(chips()).toHaveLength(2)
    await chips()[1].trigger('click')
    await flushPromises()
    expect(lastList().get('types')).toBe('consumption,purchase')
    await w.get('[data-testid="type-chip-all"]').trigger('click')
    await flushPromises()
    expect(lastList().has('types')).toBe(false)
    w.unmount()
  })

  it('filtra por entradas/salidas, quién lo registró y categoría; y «Limpiar filtros» los quita', async () => {
    const w = mountIt()
    await flushPromises()
    expect(w.find('[data-testid="clear-filters"]').exists()).toBe(false)

    await pick(w, 'direction-select', 'out')
    await pick(w, 'user-select', 'u1')
    await pick(w, 'category-select', 'cat1')
    const q = lastList()
    expect(q.get('direction')).toBe('out')
    expect(q.get('user_id')).toBe('u1')
    expect(q.get('category_id')).toBe('cat1')
    expect(w.get('[data-testid="clear-filters"]').text()).toContain('(3)')

    await w.get('[data-testid="clear-filters"]').trigger('click')
    await flushPromises()
    const cleared = lastList()
    expect(cleared.has('direction') || cleared.has('user_id') || cleared.has('category_id')).toBe(false)
    expect(w.find('[data-testid="clear-filters"]').exists()).toBe(false)
    w.unmount()
  })

  it('la búsqueda del encabezado se manda como q, sin pedir en cada letra', async () => {
    vi.useFakeTimers()
    try {
      const w = mountIt({ search: '' })
      await flushPromises()
      const before = listCalls().length

      await w.setProps({ search: 'tor' })
      await w.setProps({ search: 'tortas' })
      await vi.advanceTimersByTimeAsync(100)
      expect(listCalls().length).toBe(before)

      await vi.advanceTimersByTimeAsync(400)
      await flushPromises()
      expect(lastList().get('q')).toBe('tortas')
      expect(listCalls().length).toBe(before + 1)
      w.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('pagina en el servidor y un filtro nuevo vuelve a la primera página', async () => {
    page = pageResponse({ has_more: true })
    const w = mountIt()
    await flushPromises()
    expect(w.get('[data-testid="page-prev"]').attributes('disabled')).toBeDefined()

    await w.get('[data-testid="page-next"]').trigger('click')
    await flushPromises()
    expect(lastList().get('page')).toBe('2')

    await pick(w, 'direction-select', 'in')
    expect(lastList().get('page')).toBe('1')
    w.unmount()
  })

  it('se actualiza sola cuando un ajuste, una transferencia o una factura invalidan los movimientos', async () => {
    const w = mountIt()
    await flushPromises()
    const before = listCalls().length

    // Es la invalidación que ya hacen useInventoryAdjustment, useInventoryTransfer y la factura de compra.
    await qc.invalidateQueries({ queryKey: inventarioKeys.movements('b1', null), exact: false })
    await flushPromises()

    expect(listCalls().length).toBe(before + 1)
    w.unmount()
  })

  it('ordena en el servidor', async () => {
    const w = mountIt()
    await flushPromises()
    await pick(w, 'sort-select', 'quantity')
    expect(lastList().get('sort')).toBe('quantity')
    w.unmount()
  })

  it('sin resultados lo explica; con error permite reintentar', async () => {
    page = pageResponse({ movements: [], summary: { movements: 0, units_in: 0, units_out: 0, cost_in: 0, cost_out: 0 }, types: [] })
    const empty = mountIt()
    await flushPromises()
    expect(empty.get('[data-testid="movements-empty"]').text()).toContain('Sin movimientos')
    empty.unmount()

    api.mockReset()
    api.mockRejectedValue(new Error('boom'))
    const failed = mountIt()
    await flushPromises()
    expect(failed.get('[role="alert"]').text()).toContain('No se pudieron cargar')
    failed.unmount()
  })
})

describe('Detalle del movimiento', () => {
  const open = async (w: ReturnType<typeof mountIt>, row = 0) => {
    await w.findAll('[data-testid="movement-row"]')[row].trigger('click')
    await flushPromises()
  }
  const dialog = () => document.body.querySelector('[data-testid="movement-detail"]') as HTMLElement | null
  // Texto del diálogo con cada rótulo pegado a su valor («Costo total $2.50»): Vue no deja espacios entre elementos.
  const modalText = () => [...dialog()!.querySelectorAll('h2, h3, p, li, dl > div')]
    .map(n => (n.tagName === 'DIV' ? `${n.querySelector('dt')?.textContent} ${n.querySelector('dd')?.textContent}` : n.textContent))
    .join(' | ').replace(/\s+/g, ' ')

  it('al hacer clic en una fila abre el detalle y pide el origen del movimiento', async () => {
    const w = mountIt()
    await flushPromises()
    expect(dialog()).toBeNull()

    await open(w)

    expect(dialog()).not.toBeNull()
    expect(detailCalls()).toEqual(['/inventory/movement-history/m1'])
    const text = modalText()
    expect(text).toContain('Tortas')
    expect(text).toContain('Registrado por Camila Cajera')
    expect(text).toContain('Empleado al que afecta Elena Empleada')
    expect(text).toContain('Costo total $2.50')
    expect(text).toContain('Sede Centro')
    expect(text).toContain('Consumo de Elena: Tortas') // la nota
    expect(text).toContain('Origen · Consumo de empleado')
    expect(text).toContain('Concepto Almuerzo')
    expect(text).toContain('Café')
    expect(document.body.querySelector('[data-testid="detail-quantity"]')!.textContent).toBe('−1')
    w.unmount()
  })

  it('para una cita muestra servicio, cliente, profesional y estado', async () => {
    detail = detailResponse({
      movement: { ...move({ type: 'sale', reference_type: 'appointment' }), exchange_rate: 1 },
      source: { kind: 'appointment', service: 'Tinte raíz', client: 'ANA PÉREZ', employee: 'Elena Empleada', status: 'completed', date: '2026-11-05T15:00:00+00:00' },
      related: [],
    })
    page = pageResponse({ movements: [move({ type: 'sale', reference_type: 'appointment' })] })
    const w = mountIt()
    await flushPromises()
    await open(w)

    const text = modalText()
    expect(text).toContain('Origen · En una cita')
    expect(text).toContain('Servicio Tinte raíz')
    expect(text).toContain('Cliente ANA PÉREZ')
    expect(text).toContain('Profesional Elena Empleada')
    expect(text).toContain('Estado Completada')
    expect(document.body.querySelector('[data-testid="detail-related"]')).toBeNull()
    w.unmount()
  })

  it('para una compra muestra proveedor y factura; para una venta directa, el método de pago', async () => {
    detail = detailResponse({ source: { kind: 'purchase_invoice', supplier: 'Distribuidora Belleza', invoice_number: 'F-0042', date: '2026-11-03', total: 300 }, related: [] })
    const w = mountIt()
    await flushPromises()
    await open(w, 1)
    let text = modalText()
    expect(text).toContain('Proveedor Distribuidora Belleza')
    expect(text).toContain('N.º de factura F-0042')
    expect(text).toContain('Total de la factura $300.00')
    w.unmount()
    document.body.innerHTML = ''

    detail = detailResponse({ source: { kind: 'sale', method: 'zelle', total: 40, date: '2026-11-05T15:00:00+00:00' }, related: [] })
    const v = mountIt()
    await flushPromises()
    await open(v)
    text = modalText()
    expect(text).toContain('Método de pago Zelle')
    expect(text).toContain('Total cobrado $40.00')
    v.unmount()
  })

  it('si el origen ya no existe lo dice, y un movimiento manual lo aclara', async () => {
    detail = detailResponse({ source: { kind: 'sale', missing: true }, related: [] })
    const w = mountIt()
    await flushPromises()
    await open(w)
    expect(dialog()!.textContent).toContain('ya no existe')
    w.unmount()
    document.body.innerHTML = ''

    detail = detailResponse({ source: null, related: [] })
    const manual = mountIt()
    await flushPromises()
    await open(manual)
    expect(dialog()!.textContent).toContain('Se registró a mano')
    manual.unmount()
  })

  it('«Ver solo este producto» filtra la lista por ese producto y cierra el detalle', async () => {
    const w = mountIt()
    await flushPromises()
    await open(w)

    await (document.body.querySelector('[data-testid="detail-filter-product"]') as HTMLElement).click()
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(lastList().get('product_id')).toBe('p-tortas')
    expect(w.get('[data-testid="product-chip"]').text()).toContain('Tortas')
    expect(w.get('[data-testid="clear-filters"]').text()).toContain('(1)')

    await w.get('[data-testid="product-chip"]').trigger('click')
    await flushPromises()
    expect(lastList().has('product_id')).toBe(false)
    w.unmount()
  })

  it('«Limpiar filtros» también quita el producto elegido', async () => {
    const w = mountIt()
    await flushPromises()
    await open(w)
    ;(document.body.querySelector('[data-testid="detail-filter-product"]') as HTMLElement).click()
    await flushPromises()
    expect(lastList().get('product_id')).toBe('p-tortas')

    await w.get('[data-testid="clear-filters"]').trigger('click')
    await flushPromises()

    expect(lastList().has('product_id')).toBe(false)
    expect(w.find('[data-testid="product-chip"]').exists()).toBe(false)
    w.unmount()
  })

  it('se cierra con Escape y con el botón Cerrar', async () => {
    const w = mountIt()
    await flushPromises()
    await open(w)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(dialog()).toBeNull()

    await open(w)
    const close = [...document.body.querySelectorAll('footer button')].find(b => b.textContent?.trim() === 'Cerrar') as HTMLElement
    close.click()
    await flushPromises()
    expect(dialog()).toBeNull()
    w.unmount()
  })
})
