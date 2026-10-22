import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import ClientDirectoryList from './ClientDirectoryList.vue'
import ClientDirectoryToolbar from './ClientDirectoryToolbar.vue'
import ClientPagination from './ClientPagination.vue'
import type { Cliente } from '../../types/cliente'

// El store del negocio usa TanStack Query: el montaje necesita su plugin además de Pinia.
const plugins = (): any[] => [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]]
const isoDaysAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ana: Cliente = {
  id: 'c1', name: 'Ana Pérez', phone: '0414-1234567', email: 'ana@mail.com', joinDate: '2025-03-01',
  lastVisit: isoDaysAgo(6), totalAppointments: 4, totalSpent: '120', documentId: 'V-123', medicalInsurance: 'Mapfre',
}
const beto: Cliente = {
  id: 'c2', name: 'Beto Ruiz', phone: '', email: '', joinDate: '2025-04-01', lastVisit: 'Sin visitas', totalAppointments: 0, totalSpent: '0',
}

const mountList = (props: Record<string, unknown> = {}) =>
  mount(ClientDirectoryList, { props: { clients: [ana, beto], emptyText: 'Sin resultados', ...props }, global: { plugins: plugins() } })
const rows = (w: ReturnType<typeof mount>) => w.findAll('[data-testid="client-row"]')

describe('ClientDirectoryList', () => {
  it('muestra una fila por cliente, con la última visita en palabras y el gasto', () => {
    const w = mountList()
    expect(rows(w)).toHaveLength(2)
    const text = rows(w)[0].text()
    expect(text).toContain('Ana Pérez')
    expect(text).toContain('hace 6 días')
    expect(text).toContain('4 citas')
    expect(text).toContain('$120')
  })

  it('el cliente sin visitas lo dice y no inventa una fecha', () => {
    expect(rows(mountList())[1].text()).toContain('Sin citas')
  })

  it('en nichos de paciente la tercera columna es identificación, no gasto', () => {
    const w = mountList({ thirdColumn: 'identity' })
    expect(w.text()).toContain('Identificación')
    expect(w.text()).toContain('V-123')
    expect(w.text()).toContain('Mapfre')
    expect(rows(w)[0].text()).not.toContain('$120')
  })

  it('abrir: clic en la fila o Enter; editar y WhatsApp no abren la ficha', async () => {
    const w = mountList({ canEdit: true })
    await rows(w)[0].trigger('click')
    expect(w.emitted('open')).toHaveLength(1)
    await rows(w)[0].trigger('keydown.enter')
    expect(w.emitted('open')).toHaveLength(2)

    await w.find('button[aria-label^="Editar"]').trigger('click')
    await w.find('button[aria-label="Escribir por WhatsApp"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
    expect(w.emitted('whatsapp')).toHaveLength(1)
    expect(w.emitted('open')).toHaveLength(2) // sin clics de más
  })

  it('el botón de editar solo aparece con permiso; el de WhatsApp solo si hay teléfono', () => {
    const w = mountList()
    expect(w.find('button[aria-label^="Editar"]').exists()).toBe(false)
    expect(w.findAll('button[aria-label="Escribir por WhatsApp"]')).toHaveLength(1) // Beto no tiene teléfono
  })

  it('con teléfono oculto no muestra números ni el botón de WhatsApp', () => {
    const w = mountList({ hidePhone: true })
    expect(w.text()).toContain('Oculto')
    expect(w.text()).not.toContain('0414-1234567')
    expect(w.find('button[aria-label="Escribir por WhatsApp"]').exists()).toBe(false)
  })

  it('«Expediente» y «Archivos» aparecen una vez por cliente y emiten la pestaña correcta', async () => {
    const w = mountList({ clinicalActions: true, hasAttachments: true })
    const byText = (t: string) => w.findAll('button').filter(b => b.text() === t)
    expect(byText('Expediente')).toHaveLength(2)
    expect(byText('Archivos')).toHaveLength(2)
    await byText('Archivos')[1].trigger('click')
    expect(w.emitted('clinical')![0]).toEqual([beto, 'adjuntos'])
    expect(w.emitted('open')).toBeUndefined()
  })

  it('sin la capacidad de adjuntos solo hay «Expediente»', () => {
    const w = mountList({ clinicalActions: true, hasAttachments: false })
    expect(w.findAll('button').filter(b => b.text() === 'Archivos')).toHaveLength(0)
  })

  it('sin clientes muestra el mensaje y ninguna fila ni encabezado', () => {
    const w = mountList({ clients: [], emptyText: 'No hay clientes que coincidan' })
    expect(w.text()).toContain('No hay clientes que coincidan')
    expect(rows(w)).toHaveLength(0)
    expect(w.text()).not.toContain('Contacto')
  })
})

const counts = { all: 10, active: 4, inactive: 3, never: 2, new: 1 }
const toolbarProps = {
  search: '', segment: 'all', windowDays: 30, sort: 'recent', counts, resultCount: 10, totalCount: 10, filtered: false, placeholder: 'Buscar',
}
const mountToolbar = (props: Record<string, unknown> = {}) =>
  mount(ClientDirectoryToolbar, { props: { ...toolbarProps, ...props } as any, global: { plugins: plugins() } })

describe('ClientDirectoryToolbar', () => {
  it('muestra los segmentos con su contador', () => {
    const text = mountToolbar().text()
    for (const label of ['Todos', 'Activos', 'Inactivos', 'Sin citas', 'Nuevos']) expect(text).toContain(label)
    const tabs = mountToolbar().findAll('[role="tab"]')
    expect(tabs.map(t => t.text().replace(/\s+/g, ' '))).toEqual(['Todos 10', 'Activos 4', 'Inactivos 3', 'Sin citas 2', 'Nuevos 1'])
  })

  it('marca el segmento elegido y emite al cambiar', async () => {
    const w = mountToolbar({ segment: 'inactive' })
    expect(w.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')
    await w.findAll('[role="tab"]')[1].trigger('click')
    expect(w.emitted('update:segment')![0]).toEqual(['active'])
  })

  it('la ventana de días solo aparece en activos e inactivos', async () => {
    expect(mountToolbar({ segment: 'all' }).find('select[aria-label="Ventana de días"]').exists()).toBe(false)
    expect(mountToolbar({ segment: 'never' }).find('select[aria-label="Ventana de días"]').exists()).toBe(false)
    const w = mountToolbar({ segment: 'active' })
    const select = w.find('select[aria-label="Ventana de días"]')
    expect(select.exists()).toBe(true)
    expect(w.text()).toContain('En los últimos')
    await select.setValue('90')
    expect(w.emitted('update:windowDays')![0]).toEqual([90])
    expect(mountToolbar({ segment: 'inactive' }).text()).toContain('Hace más de')
  })

  it('emite la búsqueda y la puede borrar con la X', async () => {
    const w = mountToolbar({ search: 'ana' })
    await w.find('input[type="search"]').setValue('anab')
    expect(w.emitted('update:search')![0]).toEqual(['anab'])
    await w.find('button[aria-label="Borrar búsqueda"]').trigger('click')
    expect(w.emitted('update:search')![1]).toEqual([''])
    expect(mountToolbar().find('button[aria-label="Borrar búsqueda"]').exists()).toBe(false)
  })

  it('emite el orden elegido', async () => {
    const w = mountToolbar()
    await w.find('select[aria-label="Ordenar por"]').setValue('lastVisit')
    expect(w.emitted('update:sort')![0]).toEqual(['lastVisit'])
  })

  it('«Limpiar filtros» solo aparece con filtros activos, y el conteo muestra «x de y»', async () => {
    const plain = mountToolbar()
    expect(plain.text()).not.toContain('Limpiar filtros')
    expect(plain.text()).toContain('10')

    const w = mountToolbar({ filtered: true, resultCount: 3 })
    expect(w.text()).toContain('3 de 10')
    await w.findAll('button').find(b => b.text() === 'Limpiar filtros')!.trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)
  })

  it('concuerda en singular cuando hay un solo resultado', () => {
    expect(mountToolbar({ resultCount: 1, totalCount: 1 }).text()).toMatch(/1\s+cliente\b/)
    expect(mountToolbar({ resultCount: 5 }).text()).toMatch(/5\s+clientes\b/)
  })
})

const pagination = (over: Record<string, unknown> = {}) =>
  mount(ClientPagination, {
    props: { currentPage: 2, totalPages: 5, pageNumbers: [1, 2, 3, 4, 5], hasNext: true, hasPrevious: true, start: 21, end: 40, total: 100, ...over } as any,
  })

describe('ClientPagination', () => {
  it('no se muestra sin resultados', () => {
    expect(pagination({ total: 0 }).html()).toBe('<!--v-if-->')
  })

  it('con una sola página muestra el rango pero no los botones', () => {
    const w = pagination({ totalPages: 1, start: 1, end: 7, total: 7 })
    expect(w.text()).toContain('1-7 de 7')
    expect(w.find('nav').exists()).toBe(false)
  })

  it('marca la página actual y emite al navegar', async () => {
    const w = pagination()
    expect(w.text()).toContain('21-40 de 100')
    expect(w.find('[aria-current="page"]').text()).toBe('2')
    await w.find('button[aria-label="Página siguiente"]').trigger('click')
    await w.find('button[aria-label="Página anterior"]').trigger('click')
    await w.findAll('button').find(b => b.text() === '4')!.trigger('click')
    expect(w.emitted('next')).toHaveLength(1)
    expect(w.emitted('previous')).toHaveLength(1)
    expect(w.emitted('goto')![0]).toEqual([4])
  })

  it('deshabilita anterior en la primera página y siguiente en la última', () => {
    const first = pagination({ currentPage: 1, hasPrevious: false })
    expect(first.find('button[aria-label="Página anterior"]').attributes('disabled')).toBeDefined()
    const last = pagination({ currentPage: 5, hasNext: false })
    expect(last.find('button[aria-label="Página siguiente"]').attributes('disabled')).toBeDefined()
  })

  it('los puntos suspensivos no son botones', () => {
    const w = pagination({ pageNumbers: [1, '...', 4, 5, 6, '...', 20], totalPages: 20, currentPage: 5 })
    expect(w.findAll('button').filter(b => b.text() === '…')).toHaveLength(0)
    expect(w.text()).toContain('…')
  })
})
