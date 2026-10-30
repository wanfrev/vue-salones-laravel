import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import AgendaMonthView from './AgendaMonthView.vue'

const iso = (d: number, h = 9) => new Date(2026, 9, d, h).toISOString()
const raw = (id: string, day: number, over: Record<string, unknown> = {}) => ({
  id, start_time: iso(day), end_time: iso(day, 10), status: 'confirmed', payment_status: 'unpaid',
  employee_id: 'e1', service_id: 's1', group_id: null, clients: { full_name: `Ana Gómez ${id}` }, ...over,
})

function mountMonth(appointments: any[], over: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AgendaMonthView, {
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    props: {
      appointments, services: [{ id: 's1', name: 'Manicure' }, { id: 's2', name: 'Pedicure' }],
      employees: [{ id: 'e1', full_name: 'Kelly Soler' }, { id: 'e2', full_name: 'Yenifer Ferrer' }],
      employeeId: 'all', selectedDate: '2026-10-15', todayIso: '2026-10-30', ...over,
    },
  })
}
const cellOf = (w: ReturnType<typeof mountMonth>, day: number) =>
  w.findAll('[data-testid="month-cell"]').find(c => c.text().startsWith(String(day)) && !c.classes().includes('opacity-40'))!

const setWidth = (w: number) => { (window as any).innerWidth = w }
beforeEach(() => setWidth(1280))
afterEach(() => setWidth(1024))

describe('AgendaMonthView', () => {
  it('dibuja seis semanas completas', () => {
    expect(mountMonth([]).findAll('[data-testid="month-cell"]')).toHaveLength(42)
  })

  it('con todo el equipo cada día muestra su total y cuántas están pendientes', () => {
    const w = mountMonth([raw('a', 10), raw('b', 10), raw('c', 10, { status: 'pending' }), raw('d', 11)])

    expect(cellOf(w, 10).text()).toContain('3 citas')
    expect(cellOf(w, 10).text()).toContain('1 pendiente')
    expect(cellOf(w, 11).text()).toContain('1 cita')
    expect(cellOf(w, 11).text()).not.toContain('1 citas')
    expect(cellOf(w, 12).text()).not.toContain('cita')
  })

  it('con todo el equipo no lista citas sueltas', () => {
    expect(mountMonth([raw('a', 10)]).findAll('[data-testid="month-chip"]')).toHaveLength(0)
  })

  it('con una profesional elegida muestra solo sus citas, con el nombre de pila', () => {
    const w = mountMonth([raw('a', 10), raw('b', 10, { employee_id: 'e2' })], { employeeId: 'e1' })

    const chips = cellOf(w, 10).findAll('[data-testid="month-chip"]')
    expect(chips).toHaveLength(1)
    expect(chips[0].text()).toContain('Ana')
    expect(chips[0].text()).not.toContain('Gómez')
  })

  it('con una profesional elegida limita las fichas por día y resume el resto', () => {
    const w = mountMonth([1, 2, 3, 4, 5].map(i => raw(`x${i}`, 10, { start_time: iso(10, 8 + i) })), { employeeId: 'e1' })

    expect(cellOf(w, 10).findAll('[data-testid="month-chip"]')).toHaveLength(3)
    expect(cellOf(w, 10).text()).toContain('+2 más')
  })

  it('una visita con varios servicios de la misma profesional cuenta como una sola cita', () => {
    const w = mountMonth([raw('a', 10, { group_id: 'g', service_id: 's1' }), raw('b', 10, { group_id: 'g', service_id: 's2' })])

    expect(cellOf(w, 10).text()).toContain('1 cita')
  })

  it('al hacer clic en un día (pantalla grande) abre ese día', async () => {
    const w = mountMonth([])

    await cellOf(w, 20).trigger('click')

    expect(w.emitted('goToDate')![0]).toEqual(['2026-10-20'])
  })

  it('al hacer clic en una ficha abre la cita y no el día', async () => {
    const w = mountMonth([raw('a', 10)], { employeeId: 'e1' })

    await cellOf(w, 10).find('[data-testid="month-chip"]').trigger('click')

    expect(w.emitted('eventClick')![0][0]).toMatchObject({ id: 'a' })
    expect(w.emitted('goToDate')).toBeUndefined()
  })

  it('pasar el cursor por una ficha emite hover con la cita', async () => {
    const w = mountMonth([raw('a', 10)], { employeeId: 'e1' })
    const chip = cellOf(w, 10).find('[data-testid="month-chip"]')

    await chip.trigger('pointerenter')
    await chip.trigger('pointerleave')

    expect(w.emitted('hover')![0][0]).toMatchObject({ id: 'a', clientName: 'Ana Gómez a' })
    expect(w.emitted('leave')).toHaveLength(1)
  })

  describe('en el celular', () => {
    beforeEach(() => setWidth(375))

    it('tocar un día lo elige y muestra su agenda debajo, sin cambiar de pantalla', async () => {
      const w = mountMonth([raw('a', 10), raw('b', 10, { start_time: iso(10, 11) })])

      await cellOf(w, 10).trigger('click')

      expect(w.emitted('goToDate')).toBeUndefined()
      const rows = w.findAll('[data-testid="month-agenda-row"]')
      expect(rows).toHaveLength(2)
      expect(rows[0].text()).toContain('Ana Gómez a')
      expect(w.find('[data-testid="month-day-agenda"]').text()).toContain('2 citas')
    })

    it('«Abrir día» va al día elegido y tocar una cita de la lista abre la cita', async () => {
      const w = mountMonth([raw('a', 10)])
      await cellOf(w, 10).trigger('click')

      await w.find('[data-testid="month-agenda-row"]').trigger('click')
      expect(w.emitted('eventClick')![0][0]).toMatchObject({ id: 'a' })

      await w.find('[data-testid="month-day-agenda"] button').trigger('click')
      expect(w.emitted('goToDate')![0]).toEqual(['2026-10-10'])
    })

    it('un día sin citas lo dice', async () => {
      const w = mountMonth([])
      await cellOf(w, 12).trigger('click')

      expect(w.find('[data-testid="month-day-agenda"]').text()).toContain('Sin citas este día')
    })

    it('la lista se corta a seis y ofrece ver todas en el día', async () => {
      const w = mountMonth(Array.from({ length: 9 }, (_, i) => raw(`m${i}`, 10, { start_time: iso(10, 8 + i) })))
      await cellOf(w, 10).trigger('click')

      expect(w.findAll('[data-testid="month-agenda-row"]')).toHaveLength(6)
      expect(w.find('[data-testid="month-day-agenda"]').text()).toContain('Ver las 9 citas')
    })
  })
})
