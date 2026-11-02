import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ProductSalesHistory from './ProductSalesHistory.vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

const api = vi.mocked(apiRequest)

const buyer = (over: Record<string, unknown> = {}) => ({
  client_id: 'c-ana', client_name: 'ANA PÉREZ', client_phone: '0414-1', purchases: 2, units: 4,
  first_at: '2026-10-01T16:00:00+00:00', last_at: '2026-10-20T16:00:00+00:00', ...over,
})
const listResponse = (over: Record<string, unknown> = {}) => ({
  summary: { buyers: 2, purchases: 4, units: 6, anonymous_purchases: 1, first_at: '2026-10-01T16:00:00+00:00', last_at: '2026-10-25T16:00:00+00:00' },
  products: [
    { product_id: 'p-igora', name: 'Tinte Igora', units: 5, buyers: 2 },
    { product_id: 'p-kol', name: 'Tinte Koleston', units: 1, buyers: 1 },
  ],
  clients: [buyer(), buyer({ client_id: 'c-belen', client_name: 'BELÉN RUIZ', client_phone: null, purchases: 1, units: 1 }), buyer({ client_id: null, client_name: null, client_phone: null, purchases: 1, units: 1 })],
  page: 1, has_more: false, range: { start: '2026-08-05', end: '2026-11-02' }, ...over,
})
const sale = (id: string, over: Record<string, unknown> = {}) => ({
  id, date: '2026-10-20T16:00:00+00:00', product_name: 'Tinte Igora', variant_name: 'Negro 1.0', quantity: 2, payment_method: 'cash', is_credit: false, is_courtesy: false, notes: null, ...over,
})

let list = listResponse()
let detail: Record<string, any> = {}
const urls = () => api.mock.calls.map(c => String(c[1]))
const listUrls = () => urls().filter(u => /^\/products\/sales-history\?/.test(u))
const lastList = () => new URLSearchParams(listUrls().at(-1)!.split('?')[1])

function mountIt(props: { search: string; active?: boolean } = { search: '' }) {
  const pinia = createPinia()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(ProductSalesHistory, { props, global: { plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] } })
  useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
  ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: {} }
  return wrapper
}

beforeEach(() => {
  list = listResponse()
  detail = { 'c-ana': { sales: [sale('s1'), sale('s2', { is_credit: true, payment_method: 'credito', quantity: 1, variant_name: null })], page: 1, has_more: false } }
  api.mockReset()
  api.mockImplementation((async (_m: string, path: string) => {
    const client = path.match(/^\/products\/sales-history\/client\/([^?]+)/)
    if (client) return detail[client[1]] ?? { sales: [], page: 1, has_more: false }
    return list
  }) as any)
})
afterEach(() => { vi.useRealTimers() })

describe('Historial de compras por producto', () => {
  it('muestra el resumen y una fila por cliente con sus compras, unidades y fechas', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    const summary = w.get('[data-testid="sales-summary"]').text()
    expect(summary).toContain('2 clientes')
    expect(summary).toContain('4 compras')
    expect(summary).toContain('6 unidades')
    expect(summary).toMatch(/desde el \d{2}\/10\/2026/)
    expect(summary).toContain('1 sin cliente registrado')

    const rows = w.findAll('[data-testid="buyer-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('ANA PÉREZ')
    expect(rows[0].text()).toContain('0414-1')
    expect(rows[0].text()).toContain('2 veces')
    expect(rows[1].text()).toContain('1 vez')
    expect(rows[2].text()).toContain('Sin cliente registrado')
  })

  it('pide al servidor con el negocio, el rango de 3 meses y el orden por defecto', async () => {
    mountIt({ search: '' })
    await flushPromises()

    const p = lastList()
    expect(p.get('sort')).toBe('recent')
    expect(p.get('page')).toBe('1')
    expect(p.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.get('end')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.has('q')).toBe(false)
  })

  it('espera a que se deje de escribir antes de buscar (no pide una vez por letra)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mountIt({ search: '' })
    await flushPromises()
    const before = listUrls().length

    await w.setProps({ search: 't' })
    await w.setProps({ search: 'ti' })
    await w.setProps({ search: 'tinte' })
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(listUrls().length).toBe(before)

    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()
    expect(listUrls().length).toBe(before + 1)
    expect(lastList().get('q')).toBe('tinte')
  })

  it('con varios productos coincidentes ofrece acotar a uno, y «Todos» lo suelta', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    const chips = w.findAll('[data-testid="product-chip"]')
    expect(chips.map(c => c.text())).toEqual(['Tinte Igora · 5', 'Tinte Koleston · 1'])

    await chips[1].trigger('click')
    await flushPromises()
    expect(lastList().get('product_id')).toBe('p-kol')

    await w.findAll('[data-testid="product-chips"] button')[0].trigger('click')
    await flushPromises()
    expect(lastList().has('product_id')).toBe(false)
  })

  it('al elegir un producto las fichas siguen ahí y «Todos» permite volver, aunque el servidor devuelva solo ese producto', async () => {
    // Reproduce el error original: el servidor respondía con una sola ficha al acotar.
    api.mockImplementation((async (_m: string, path: string) => {
      if (path.includes('/client/')) return { sales: [], page: 1, has_more: false }
      return path.includes('product_id=p-kol')
        ? listResponse({ products: [{ product_id: 'p-kol', name: 'Tinte Koleston', units: 1, buyers: 1 }] })
        : list
    }) as any)
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    await w.findAll('[data-testid="product-chip"]')[1].trigger('click')
    await flushPromises()

    expect(w.find('[data-testid="product-chips"]').exists()).toBe(true)
    await w.findAll('[data-testid="product-chips"] button')[0].trigger('click')   // «Todos»
    await flushPromises()
    expect(lastList().has('product_id')).toBe(false)
    expect(w.findAll('[data-testid="product-chip"]')).toHaveLength(2)
  })

  it('con un solo producto coincidente no muestra las fichas', async () => {
    list = listResponse({ products: [{ product_id: 'p-igora', name: 'Tinte Igora', units: 5, buyers: 2 }] })
    const w = mountIt({ search: 'igora' })
    await flushPromises()

    expect(w.find('[data-testid="product-chips"]').exists()).toBe(false)
  })

  it('al tocar una cliente se despliegan sus compras, con crédito marcado, y al volver a tocar se cierran', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    await w.findAll('[data-testid="buyer-row"] button')[0].trigger('click')
    await flushPromises()

    expect(urls().some(u => u.startsWith('/products/sales-history/client/c-ana?'))).toBe(true)
    const rows = w.findAll('[data-testid="client-sale-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Tinte Igora')
    expect(rows[0].text()).toContain('Negro 1.0')
    expect(rows[0].text()).toContain('×2')
    expect(rows[0].find('[data-testid="sale-badge"]').exists()).toBe(false)
    expect(rows[1].get('[data-testid="sale-badge"]').text()).toBe('Crédito')

    await w.findAll('[data-testid="buyer-row"] button')[0].trigger('click')
    expect(w.find('[data-testid="client-sales-detail"]').exists()).toBe(false)
  })

  it('el detalle lleva los mismos filtros que la búsqueda (texto y producto)', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()
    await w.findAll('[data-testid="product-chip"]')[0].trigger('click')
    await flushPromises()

    await w.findAll('[data-testid="buyer-row"] button')[0].trigger('click')
    await flushPromises()

    const detailUrl = urls().filter(u => u.includes('/client/')).at(-1)!
    const p = new URLSearchParams(detailUrl.split('?')[1])
    expect(p.get('product_id')).toBe('p-igora')
    expect(p.get('q')).toBe('tinte')
  })

  it('las ventas sin cliente registrado se piden con la clave «none»', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    await w.findAll('[data-testid="buyer-row"] button')[2].trigger('click')
    await flushPromises()

    expect(urls().some(u => u.startsWith('/products/sales-history/client/none?'))).toBe(true)
  })

  it('«Ver más compras» trae la página siguiente y la agrega', async () => {
    detail['c-ana'] = { sales: [sale('s1')], page: 1, has_more: true }
    api.mockImplementation((async (_m: string, path: string) => {
      if (path.includes('/client/c-ana')) {
        return path.includes('page=2') ? { sales: [sale('s2')], page: 2, has_more: false } : detail['c-ana']
      }
      return list
    }) as any)
    const w = mountIt({ search: 'tinte' })
    await flushPromises()
    await w.findAll('[data-testid="buyer-row"] button')[0].trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="client-sale-row"]')).toHaveLength(1)

    await w.get('[data-testid="client-sales-more"]').trigger('click')
    await flushPromises()

    expect(w.findAll('[data-testid="client-sale-row"]')).toHaveLength(2)
    expect(w.find('[data-testid="client-sales-more"]').exists()).toBe(false)
  })

  it('cambiar el período vuelve a pedir con otro rango y cierra la fila abierta', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()
    const firstStart = lastList().get('start')
    await w.findAll('[data-testid="buyer-row"] button')[0].trigger('click')

    await w.get('[data-testid="range-select"]').setValue('365')
    await flushPromises()

    expect(lastList().get('start')).not.toBe(firstStart)
    expect(w.find('[data-testid="client-sales-detail"]').exists()).toBe(false)
  })

  it('cambiar el orden pide con ese orden', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    await w.get('[data-testid="sort-select"]').setValue('units')
    await flushPromises()

    expect(lastList().get('sort')).toBe('units')
  })

  it('pagina: «Siguiente» pide la página 2 y «Anterior» vuelve; en la primera «Anterior» está apagado', async () => {
    list = listResponse({ has_more: true })
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    expect((w.get('[data-testid="page-prev"]').element as HTMLButtonElement).disabled).toBe(true)
    await w.get('[data-testid="page-next"]').trigger('click')
    await flushPromises()
    expect(lastList().get('page')).toBe('2')

    await w.get('[data-testid="page-prev"]').trigger('click')
    await flushPromises()
    expect(lastList().get('page')).toBe('1')
  })

  it('sin más páginas ni anteriores no muestra la barra de páginas', async () => {
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    expect(w.find('[data-testid="page-next"]').exists()).toBe(false)
  })

  it('sin resultados lo dice con lo que se buscó', async () => {
    list = listResponse({ clients: [], products: [], summary: { buyers: 0, purchases: 0, units: 0, anonymous_purchases: 0, first_at: null, last_at: null } })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mountIt({ search: '' })
    await flushPromises()
    await w.setProps({ search: 'cartera' })
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    expect(w.get('[data-testid="sales-empty"]').text()).toContain('Nadie compró «cartera»')
  })

  it('si el servidor falla muestra el error y permite reintentar', async () => {
    api.mockRejectedValueOnce(new Error('boom'))
    const w = mountIt({ search: 'tinte' })
    await flushPromises()

    expect(w.get('[role="alert"]').text()).toContain('No se pudo cargar')

    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="buyer-row"]')).toHaveLength(3)
  })

  it('no pide nada mientras la pestaña no está a la vista', async () => {
    mountIt({ search: 'tinte', active: false })
    await flushPromises()

    expect(api).not.toHaveBeenCalled()
  })
})
