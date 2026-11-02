import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ClientItemFilter from './ClientItemFilter.vue'
import ClientDirectoryToolbar from './ClientDirectoryToolbar.vue'
import ClientDirectoryList from './ClientDirectoryList.vue'
import { useClientFilters } from '../../composables/common/useClientFilters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import type { Cliente } from '../../types/cliente'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

const api = vi.mocked(apiRequest)

const cliente = (id: string, name: string, over: Partial<Cliente> = {}): Cliente => ({
  id, name, phone: '0414-1', email: '', joinDate: '2025-01-01', lastVisit: 'Sin visitas', totalAppointments: 0, ...over,
})
const ana = cliente('c-ana', 'Ana Pérez')
const beto = cliente('c-beto', 'Beto Ruiz')
const carla = cliente('c-carla', 'Carla Díaz')

const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
const match = (id: string, daysAgo: number, over: Record<string, unknown> = {}) => ({
  client_id: id, last_at: daysAgoIso(daysAgo), first_at: daysAgoIso(daysAgo + 30), times: 2, last_item: 'Tinte raíz', ...over,
})

const pluginsFor = () => {
  const pinia = createPinia()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { pinia, qc, plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] as any[] }
}

describe('ClientItemFilter', () => {
  const mountIt = (props: Record<string, unknown> = {}) =>
    mount(ClientItemFilter, { props: { item: '', mode: 'did', days: 60, ...props } })

  it('empieza cerrado: solo el botón, sin campo de texto', () => {
    const w = mountIt()
    expect(w.text()).toContain('Producto o servicio')
    expect(w.find('input').exists()).toBe(false)
  })

  it('al pulsar el botón muestra el campo y las opciones', async () => {
    const w = mountIt()
    await w.find('button').trigger('click')
    expect(w.find('input[type="search"]').exists()).toBe(true)
    expect(w.text()).toContain('Escribe al menos 2 letras')
    expect(w.text()).toContain('Lo compraron o se lo hicieron')
  })

  it('con un texto escrito no se puede quedar cerrado escondiendo un filtro activo', () => {
    const w = mountIt({ item: 'tinte' })
    expect(w.find('input').element.value).toBe('tinte')
  })

  it('escribir y cambiar el modo emiten los cambios', async () => {
    const w = mountIt()
    await w.find('button').trigger('click')
    await w.find('input').setValue('keratina')
    expect(w.emitted('update:item')![0]).toEqual(['keratina'])
    const [mode] = w.findAll('select')
    await mode.setValue('lapsed')
    expect(w.emitted('update:mode')![0]).toEqual(['lapsed'])
  })

  it('los días solo aparecen en «no han vuelto» y emiten un número', async () => {
    const did = mountIt({ item: 'tinte' })
    expect(did.findAll('select')).toHaveLength(1)

    const w = mountIt({ item: 'tinte', mode: 'lapsed', days: 60 })
    const selects = w.findAll('select')
    expect(selects).toHaveLength(2)
    expect(selects[1].element.value).toBe('60')
    await selects[1].setValue('90')
    expect(w.emitted('update:days')![0]).toEqual([90])
  })

  it('avisa si está buscando, si falló o si había demasiadas coincidencias', () => {
    expect(mountIt({ item: 'tinte', searching: true }).text()).toContain('Buscando…')
    expect(mountIt({ item: 'tinte', error: true }).text()).toContain('No se pudo consultar')
    expect(mountIt({ item: 'tinte', truncated: true }).text()).toContain('2000 más recientes')
    expect(mountIt({ item: 'tinte' }).text()).toContain('sin cliente registrado')
  })
})

describe('ClientDirectoryToolbar / ClientDirectoryList con el filtro', () => {
  const toolbarProps = {
    search: '', segment: 'all' as const, windowDays: 30, sort: 'recent' as const,
    counts: { all: 3, active: 0, inactive: 0, never: 3, new: 0 }, resultCount: 3, totalCount: 3, filtered: false, placeholder: 'Buscar…',
  }

  it('la barra no muestra el filtro por producto salvo que se lo pidan (cajas y empleados no lo ven)', () => {
    const { plugins } = pluginsFor()
    expect(mount(ClientDirectoryToolbar, { props: toolbarProps, global: { plugins } }).text()).not.toContain('Producto o servicio')
    expect(mount(ClientDirectoryToolbar, { props: { ...toolbarProps, itemFilter: true }, global: { plugins } }).text()).toContain('Producto o servicio')
  })

  it('la fila muestra lo último que hizo cada clienta, solo a quien coincide', () => {
    const { plugins } = pluginsFor()
    const itemInfo = new Map([['c-ana', match('c-ana', 6, { times: 3 })]])
    const w = mount(ClientDirectoryList, { props: { clients: [ana, beto], emptyText: 'x', itemInfo }, global: { plugins } })
    const info = w.findAll('[data-testid="client-item-info"]')
    expect(info).toHaveLength(1)
    expect(info[0].text()).toBe('Tinte raíz · hace 6 días · 3 veces')
  })

  it('sin filtro la fila no cambia', () => {
    const { plugins } = pluginsFor()
    const w = mount(ClientDirectoryList, { props: { clients: [ana], emptyText: 'x' }, global: { plugins } })
    expect(w.find('[data-testid="client-item-info"]').exists()).toBe(false)
  })
})

describe('useClientFilters con el filtro por producto o servicio', () => {
  const itemUrls = () => api.mock.calls.map(c => String(c[1])).filter(u => u.startsWith('/clients/by-item'))
  let response: { clients: any[]; truncated: boolean; range: { start: string; end: string } }

  function mountHarness(itemFilter: boolean, opts: { allowed?: boolean; list?: Cliente[] } = {}) {
    const { pinia, plugins } = pluginsFor()
    const clients = ref<Cliente[]>(opts.list ?? [ana, beto, carla])
    let state!: ReturnType<typeof useClientFilters>
    const Harness = defineComponent({
      setup() {
        state = useClientFilters(clients, itemFilter ? { itemFilter: ref(opts.allowed ?? true) } : {})
        return () => h('div')
      },
    })
    const wrapper = mount(Harness, { global: { plugins } })
    useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
    ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: {} }
    return { wrapper, state: () => state }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    response = { clients: [match('c-ana', 6), match('c-beto', 81)], truncated: false, range: { start: '2025-11-02', end: '2026-11-02' } }
    api.mockReset()
    api.mockImplementation(async (_m: any, url: any) => {
      if (String(url).startsWith('/clients/by-item')) return response as any
      return null as any
    })
  })
  afterEach(() => vi.useRealTimers())

  it('espera a que termine de escribir, pide una sola vez y cruza con la lista', async () => {
    const { state } = mountHarness(true)
    await flushPromises()
    state().item.value = 'ti'
    await vi.advanceTimersByTimeAsync(100)
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(100)
    expect(itemUrls()).toHaveLength(0) // todavía escribiendo

    // Mientras no llega la respuesta no se enseña la lista completa como si no hubiera filtro.
    await vi.advanceTimersByTimeAsync(300)
    expect(state().filteredClients.value.length).toBeLessThanOrEqual(3)
    await flushPromises()

    expect(itemUrls()).toEqual(['/clients/by-item?q=tinte'])
    expect(state().filteredClients.value.map(c => c.name).sort()).toEqual(['Ana Pérez', 'Beto Ruiz'])
    expect(state().filtered.value).toBe(true)
  })

  it('cambiar de «lo hicieron» a «no han vuelto» o los días no vuelve a consultar al servidor', async () => {
    const { state } = mountHarness(true)
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(itemUrls()).toHaveLength(1)

    state().itemMode.value = 'lapsed'
    state().itemDays.value = 60
    await flushPromises()
    expect(state().filteredClients.value.map(c => c.name)).toEqual(['Beto Ruiz'])
    state().itemDays.value = 90
    await flushPromises()
    expect(state().filteredClients.value).toEqual([])
    expect(itemUrls()).toHaveLength(1)
  })

  it('con menos de 2 letras no pide nada ni filtra', async () => {
    const { state } = mountHarness(true)
    state().item.value = 't'
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(itemUrls()).toHaveLength(0)
    expect(state().filteredClients.value).toHaveLength(3)
    expect(state().filtered.value).toBe(false)
  })

  it('«Limpiar filtros» quita el filtro por producto al instante', async () => {
    const { state } = mountHarness(true)
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(state().filteredClients.value).toHaveLength(2)

    state().clearFilters()
    await flushPromises() // sin avanzar el reloj: no hay que esperar los 300 ms
    expect(state().item.value).toBe('')
    expect(state().filteredClients.value).toHaveLength(3)
    expect(state().filtered.value).toBe(false)
  })

  it('un texto nuevo no muestra los resultados del anterior mientras llegan los suyos', async () => {
    const { state } = mountHarness(true)
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(state().filteredClients.value).toHaveLength(2)

    let release!: () => void
    api.mockImplementation(() => new Promise(resolve => { release = () => resolve({ clients: [match('c-carla', 3)], truncated: false, range: response.range } as any) }))
    state().item.value = 'keratina'
    await vi.advanceTimersByTimeAsync(400)
    expect(state().itemSearching.value).toBe(true)
    expect(state().filteredClients.value).toEqual([]) // ni Ana ni Beto: eran del «tinte»
    release()
    await flushPromises()
    expect(state().filteredClients.value.map(c => c.name)).toEqual(['Carla Díaz'])
    expect(state().itemSearching.value).toBe(false)
  })

  it('un error del servidor no deja la pantalla «buscando» para siempre', async () => {
    const { state } = mountHarness(true)
    api.mockRejectedValue(new Error('boom'))
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(state().itemError.value).toBeTruthy()
    expect(state().itemSearching.value).toBe(false)
  })

  it('sin permiso (la caja entra a Clientes pero no lista quién compró qué) no se consulta al servidor', async () => {
    const { state } = mountHarness(true, { allowed: false })
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(itemUrls()).toHaveLength(0)
    expect(state().filteredClients.value).toHaveLength(3)
    expect(state().filtered.value).toBe(false)
  })

  it('cambiar el modo o los días vuelve a la primera página', async () => {
    const many = Array.from({ length: 30 }, (_, i) => cliente(`c${i}`, `Cliente ${String(i).padStart(2, '0')}`))
    response = { clients: many.map(c => match(c.id, 100)), truncated: false, range: response.range }
    const { state } = mountHarness(true, { list: many })
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(state().totalPages.value).toBe(2)

    state().goToPage(2)
    expect(state().currentPage.value).toBe(2)
    state().itemMode.value = 'lapsed' // las 30 siguen cumpliendo: la página no se acomoda sola
    await flushPromises()
    expect(state().currentPage.value).toBe(1)

    state().goToPage(2)
    state().itemDays.value = 90
    await flushPromises()
    expect(state().currentPage.value).toBe(1)
  })

  it('sin la opción (vista de empleado) el filtro no existe y no se pide nada', async () => {
    const { state } = mountHarness(false)
    state().item.value = 'tinte'
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(itemUrls()).toHaveLength(0)
    expect(state().filteredClients.value).toHaveLength(3)
  })
})
