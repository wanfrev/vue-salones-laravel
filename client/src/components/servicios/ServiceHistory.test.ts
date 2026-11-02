import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ServiceHistory from './ServiceHistory.vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { visitsLabel } from './serviceHistory'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

const api = vi.mocked(apiRequest)

const client = (over: Record<string, unknown> = {}) => ({
  client_id: 'c-ana', client_name: 'ANA PÉREZ', client_phone: '0414-1', visits: 2,
  first_at: '2026-10-01T16:00:00+00:00', last_at: '2026-10-20T16:00:00+00:00', ...over,
})
const listResponse = (over: Record<string, unknown> = {}) => ({
  summary: { clients: 2, visits: 4, anonymous_visits: 1, first_at: '2026-10-01T16:00:00+00:00', last_at: '2026-10-25T16:00:00+00:00' },
  services: [
    { service_id: 's-bal', name: 'Balayage', visits: 3, clients: 2 },
    { service_id: 's-tinte', name: 'Tinte raíz', visits: 1, clients: 1 },
  ],
  clients: [client(), client({ client_id: 'c-belen', client_name: 'BELÉN RUIZ', client_phone: null, visits: 1 }), client({ client_id: null, client_name: null, client_phone: null, visits: 1 })],
  page: 1, has_more: false, range: { start: '2026-08-05', end: '2026-11-02' }, ...over,
})
const visit = (id: string, over: Record<string, unknown> = {}) => ({
  id, date: '2026-10-20T16:00:00+00:00', service_name: 'Balayage', employee_name: 'Kelly Soler', payment_method: 'cash', is_credit: false, is_courtesy: false, ...over,
})

let list = listResponse()
let detail: Record<string, any> = {}
const urls = () => api.mock.calls.map(c => String(c[1]))
const listUrls = () => urls().filter(u => /^\/services\/history\?/.test(u))
const lastList = () => new URLSearchParams(listUrls().at(-1)!.split('?')[1])

function mountIt(props: { search: string; active?: boolean } = { search: '' }) {
  const pinia = createPinia()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(ServiceHistory, { props, global: { plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] } })
  useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
  ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: {} }
  return wrapper
}

beforeEach(() => {
  list = listResponse()
  detail = { 'c-ana': { visits: [visit('v1'), visit('v2', { is_credit: true, payment_method: 'credito', employee_name: null })], page: 1, has_more: false } }
  api.mockReset()
  api.mockImplementation((async (_m: string, path: string) => {
    const c = path.match(/^\/services\/history\/client\/([^?]+)/)
    if (c) return detail[c[1]] ?? { visits: [], page: 1, has_more: false }
    return list
  }) as any)
})
afterEach(() => { vi.useRealTimers() })

describe('Historial de servicios', () => {
  it('muestra el resumen y una fila por cliente con cuántas veces y la primera y última vez', async () => {
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    const summary = w.get('[data-testid="history-summary"]').text()
    expect(summary).toContain('2 clientes')
    expect(summary).toContain('4 visitas')
    expect(summary).toMatch(/desde el \d{2}\/10\/2026/)
    expect(summary).toContain('1 sin cliente registrado')

    const rows = w.findAll('[data-testid="client-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('ANA PÉREZ')
    expect(rows[0].text()).toContain('0414-1')
    expect(rows[0].text()).toContain('2 veces')
    expect(rows[1].text()).toContain('1 vez')
    expect(rows[2].text()).toContain('Sin cliente registrado')
  })

  it('pide al servidor con el rango de 3 meses y el orden por defecto, sin texto si no se buscó nada', async () => {
    mountIt({ search: '' })
    await flushPromises()

    const p = lastList()
    expect(p.get('sort')).toBe('recent')
    expect(p.get('page')).toBe('1')
    expect(p.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.has('q')).toBe(false)
  })

  it('espera a que se deje de escribir antes de buscar', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mountIt({ search: '' })
    await flushPromises()
    const before = listUrls().length

    await w.setProps({ search: 'k' })
    await w.setProps({ search: 'ker' })
    await w.setProps({ search: 'keratina' })
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(listUrls().length).toBe(before)

    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()
    expect(listUrls().length).toBe(before + 1)
    expect(lastList().get('q')).toBe('keratina')
  })

  it('con varios servicios coincidentes ofrece acotar a uno, y «Todos» lo suelta', async () => {
    const w = mountIt({ search: 'color' })
    await flushPromises()

    const chips = w.findAll('[data-testid="service-chip"]')
    expect(chips.map(c => c.text())).toEqual(['Balayage · 3', 'Tinte raíz · 1'])

    await chips[1].trigger('click')
    await flushPromises()
    expect(lastList().get('service_id')).toBe('s-tinte')

    await w.findAll('[data-testid="service-chips"] button')[0].trigger('click')
    await flushPromises()
    expect(lastList().has('service_id')).toBe(false)
  })

  it('al elegir un servicio las opciones siguen ahí y «Todos» permite volver, aunque el servidor devuelva solo ese servicio', async () => {
    // El error que tuvo el historial de productos: el servidor respondía con una sola ficha al acotar.
    api.mockImplementation((async (_m: string, path: string) => {
      if (path.includes('/client/')) return { visits: [], page: 1, has_more: false }
      return path.includes('service_id=s-tinte')
        ? listResponse({ services: [{ service_id: 's-tinte', name: 'Tinte raíz', visits: 1, clients: 1 }] })
        : list
    }) as any)
    const w = mountIt({ search: 'color' })
    await flushPromises()

    await w.findAll('[data-testid="service-chip"]')[1].trigger('click')
    await flushPromises()

    expect(w.find('[data-testid="service-chips"]').exists()).toBe(true)
    await w.findAll('[data-testid="service-chips"] button')[0].trigger('click')
    await flushPromises()
    expect(lastList().has('service_id')).toBe(false)
    expect(w.findAll('[data-testid="service-chip"]')).toHaveLength(2)
  })

  it('con un solo servicio coincidente no muestra las opciones', async () => {
    list = listResponse({ services: [{ service_id: 's-bal', name: 'Balayage', visits: 3, clients: 2 }] })
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    expect(w.find('[data-testid="service-chips"]').exists()).toBe(false)
  })

  it('al tocar una cliente se despliegan sus servicios con quién los hizo y el crédito marcado; al volver a tocar se cierran', async () => {
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    await w.findAll('[data-testid="client-row"] button')[0].trigger('click')
    await flushPromises()

    expect(urls().some(u => u.startsWith('/services/history/client/c-ana?'))).toBe(true)
    const rows = w.findAll('[data-testid="client-visit-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Balayage')
    expect(rows[0].text()).toContain('Kelly Soler')
    expect(rows[0].find('[data-testid="visit-badge"]').exists()).toBe(false)
    expect(rows[1].get('[data-testid="visit-badge"]').text()).toBe('Crédito')

    await w.findAll('[data-testid="client-row"] button')[0].trigger('click')
    expect(w.find('[data-testid="client-visits-detail"]').exists()).toBe(false)
  })

  it('el detalle lleva los mismos filtros que la búsqueda (texto y servicio)', async () => {
    const w = mountIt({ search: 'color' })
    await flushPromises()
    await w.findAll('[data-testid="service-chip"]')[0].trigger('click')
    await flushPromises()

    await w.findAll('[data-testid="client-row"] button')[0].trigger('click')
    await flushPromises()

    const p = new URLSearchParams(urls().filter(u => u.includes('/client/')).at(-1)!.split('?')[1])
    expect(p.get('service_id')).toBe('s-bal')
    expect(p.get('q')).toBe('color')
  })

  it('las citas sin cliente registrado se piden con la clave «none»', async () => {
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    await w.findAll('[data-testid="client-row"] button')[2].trigger('click')
    await flushPromises()

    expect(urls().some(u => u.startsWith('/services/history/client/none?'))).toBe(true)
  })

  it('«Ver más servicios» trae la página siguiente y la agrega', async () => {
    api.mockImplementation((async (_m: string, path: string) => {
      if (path.includes('/client/c-ana')) {
        return path.includes('page=2') ? { visits: [visit('v2')], page: 2, has_more: false } : { visits: [visit('v1')], page: 1, has_more: true }
      }
      return list
    }) as any)
    const w = mountIt({ search: 'balayage' })
    await flushPromises()
    await w.findAll('[data-testid="client-row"] button')[0].trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="client-visit-row"]')).toHaveLength(1)

    await w.get('[data-testid="client-visits-more"]').trigger('click')
    await flushPromises()

    expect(w.findAll('[data-testid="client-visit-row"]')).toHaveLength(2)
    expect(w.find('[data-testid="client-visits-more"]').exists()).toBe(false)
  })

  it('cambiar el período o el orden vuelve a pedir y cierra la fila abierta', async () => {
    const w = mountIt({ search: 'balayage' })
    await flushPromises()
    const firstStart = lastList().get('start')
    await w.findAll('[data-testid="client-row"] button')[0].trigger('click')

    await w.get('[data-testid="range-select"]').setValue('365')
    await flushPromises()
    expect(lastList().get('start')).not.toBe(firstStart)
    expect(w.find('[data-testid="client-visits-detail"]').exists()).toBe(false)

    await w.get('[data-testid="sort-select"]').setValue('times')
    await flushPromises()
    expect(lastList().get('sort')).toBe('times')
  })

  it('pagina: «Siguiente» pide la página 2 y «Anterior» vuelve; en la primera «Anterior» está apagado', async () => {
    list = listResponse({ has_more: true })
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    expect((w.get('[data-testid="page-prev"]').element as HTMLButtonElement).disabled).toBe(true)
    await w.get('[data-testid="page-next"]').trigger('click')
    await flushPromises()
    expect(lastList().get('page')).toBe('2')

    await w.get('[data-testid="page-prev"]').trigger('click')
    await flushPromises()
    expect(lastList().get('page')).toBe('1')
  })

  it('sin más páginas no muestra la barra de páginas', async () => {
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    expect(w.find('[data-testid="page-next"]').exists()).toBe(false)
  })

  it('sin resultados lo dice con lo que se buscó y aclara qué cuenta como realizado', async () => {
    list = listResponse({ clients: [], services: [], summary: { clients: 0, visits: 0, anonymous_visits: 0, first_at: null, last_at: null } })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mountIt({ search: '' })
    await flushPromises()
    await w.setProps({ search: 'pedicure' })
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    const text = w.get('[data-testid="history-empty"]').text()
    expect(text).toContain('No se hizo «pedicure»')
    expect(text).toContain('completados o pagados')
  })

  it('si el servidor falla muestra el error y permite reintentar', async () => {
    api.mockRejectedValueOnce(new Error('boom'))
    const w = mountIt({ search: 'balayage' })
    await flushPromises()

    expect(w.get('[role="alert"]').text()).toContain('No se pudo cargar')

    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="client-row"]')).toHaveLength(3)
  })

  it('no pide nada mientras la pestaña no está a la vista', async () => {
    mountIt({ search: 'balayage', active: false })
    await flushPromises()

    expect(api).not.toHaveBeenCalled()
  })
})

describe('visitsLabel', () => {
  it('concuerda en singular y plural', () => {
    expect([1, 2, 10].map(visitsLabel)).toEqual(['1 vez', '2 veces', '10 veces'])
  })
})
