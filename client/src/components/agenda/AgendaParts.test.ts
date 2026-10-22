import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FilterSelect from '../common/FilterSelect.vue'
import AgendaSummaryStrip from './AgendaSummaryStrip.vue'
import AgendaListView from './AgendaListView.vue'
import type { Cita } from '../../types/cita'

const cita = (over: Partial<Cita> = {}): Cita => ({
  id: 'c1', clientName: 'María Pérez', service: 'Corte', employee: 'Ana', date: '2026-10-20', time: '14:30', duration: 45,
  price: 20, status: 'confirmed', statusLabel: 'Confirmada', ...over,
})

const mountList = (citas: Cita[], extra: Record<string, unknown> = {}) =>
  mount(AgendaListView, { props: { citas, t: 'cita', tPlural: 'citas', labels: { client: 'Cliente', service: 'Servicio', servicePlural: 'Servicios', employee: 'Empleado' }, ...extra } })

describe('FilterSelect', () => {
  const options = [{ value: 'all', label: 'Todos' }, { value: 'a', label: 'Ana' }, { value: 'b', label: 'Beto' }]

  it('muestra la opción elegida y abre el menú en el body', async () => {
    const wrapper = mount(FilterSelect, { props: { modelValue: 'a', options }, attachTo: document.body })
    expect(wrapper.text()).toContain('Ana')
    await wrapper.get('button').trigger('click')
    expect(document.body.querySelectorAll('[role=option]')).toHaveLength(3)
    wrapper.unmount()
  })

  it('emite el valor elegido y se cierra', async () => {
    const wrapper = mount(FilterSelect, { props: { modelValue: 'all', options }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    const items = document.body.querySelectorAll<HTMLButtonElement>('[role=option] button')
    items[2].click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['b'])
    expect(document.body.querySelector('[role=listbox]')).toBeNull()
    wrapper.unmount()
  })

  it('Escape cierra el menú', async () => {
    const wrapper = mount(FilterSelect, { props: { modelValue: 'all', options }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(document.body.querySelector('[role=listbox]')).toBeNull()
    wrapper.unmount()
  })
})

describe('AgendaSummaryStrip', () => {
  const stats = { citasHoy: 30, pendientes: 8, confirmadas: 5, estimadoHoy: '675' }

  it('muestra las cuatro cifras y el período', () => {
    const text = mount(AgendaSummaryStrip, { props: { stats, statusFilter: 'all', periodLabel: 'esta semana', plural: 'Citas' } }).text()
    expect(text).toContain('30')
    expect(text).toContain('Citas esta semana')
    expect(text).toContain('Pendientes')
    expect(text).toContain('Confirmadas')
    expect(text).toContain('$675')
  })

  it('las tres primeras celdas emiten el filtro y la cuarta no es botón', async () => {
    const wrapper = mount(AgendaSummaryStrip, { props: { stats, statusFilter: 'all', periodLabel: 'hoy', plural: 'Citas' } })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['all'], ['pending'], ['confirmed']])
  })
})

describe('AgendaListView', () => {
  it('muestra cliente, hora, servicio, profesional y estado', () => {
    const text = mountList([cita({ petName: 'Rex', notes: 'Llegar temprano' })]).text()
    expect(text).toContain('María Pérez')
    expect(text).toContain('Rex')
    expect(text).toContain('Llegar temprano')
    expect(text).toContain('2:30 PM')
    expect(text).toContain('45min')
    expect(text).toContain('Corte')
    expect(text).toContain('Ana')
    expect(text).toContain('Confirmada')
  })

  it('indica los servicios extra de una cita de grupo', () => {
    const text = mountList([cita({ groupServiceNames: ['Corte', 'Tinte', 'Barba'] })]).text()
    expect(text).toContain('+2 servicios')
  })

  it('ordena por fecha ascendente y permite invertir', async () => {
    const wrapper = mountList([cita({ id: 'b', clientName: 'Zoe', date: '2026-10-22' }), cita({ id: 'a', clientName: 'Ana', date: '2026-10-20' })])
    const firstClient = () => wrapper.findAll('[data-testid="agenda-row"]')[0].text()
    expect(firstClient()).toContain('Ana')
    await wrapper.findAll('button').find(b => b.text().includes('Fecha:'))!.trigger('click')
    expect(firstClient()).toContain('Zoe')
  })

  it('emite editar y eliminar (con el id)', async () => {
    const c = cita()
    const wrapper = mountList([c])
    await wrapper.get('[title="Editar"]').trigger('click')
    await wrapper.get('[title="Eliminar"]').trigger('click')
    expect(wrapper.emitted('edit')![0]).toEqual([c])
    expect(wrapper.emitted('delete')![0]).toEqual(['c1'])
  })

  it('sin citas muestra el mensaje vacío y con error el aviso', () => {
    expect(mountList([]).text()).toContain('No hay citas')
    expect(mountList([], { error: new Error('falló') }).text()).toContain('Error al cargar citas')
  })

  it('pagina de a 25', () => {
    const many = Array.from({ length: 30 }, (_, i) => cita({ id: `c${i}`, time: `${String(8 + (i % 10)).padStart(2, '0')}:00` }))
    const wrapper = mountList(many)
    expect(wrapper.findAll('[data-testid="agenda-row"]')).toHaveLength(25)
    expect(wrapper.text()).toContain('1-25')
  })
})
