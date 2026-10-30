import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const listCitas = vi.hoisted(() => vi.fn())
const apiRequest = vi.hoisted(() => vi.fn())

vi.mock('../../services/agendaService', () => ({ listCitas }))
vi.mock('../../lib/api', () => ({ apiRequest }))
vi.mock('../../store/auth', () => ({ useAuthStore: () => ({ businessId: 'b1' }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: 'br-1' }) }))

import FreeSlotFinder from './FreeSlotFinder.vue'

const EMPLOYEES = [{ id: 'nayleth', full_name: 'Nayleth Salazar' }, { id: 'betza', full_name: 'Betza Marquez' }]

const mountFinder = () =>
  mount(FreeSlotFinder, {
    props: { employees: EMPLOYEES },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }]] },
  })

const openIt = async () => {
  const w = mountFinder()
  await w.find('[data-testid="finder-toggle"]').trigger('click')
  await flushPromises()
  return w
}

describe('FreeSlotFinder — buscador de huecos', () => {
  beforeEach(() => {
    // Lunes 2 de noviembre de 2026, 8:00 a. m. (solo se congela la fecha: las promesas siguen corriendo).
    vi.useFakeTimers({ now: new Date('2026-11-02T08:00:00'), toFake: ['Date'] })
    listCitas.mockResolvedValue([
      { id: 'c1', date: '2026-11-02', time: '09:00', duration: 120, employeeId: 'nayleth', clientName: 'Mary', status: 'confirmed' },
    ])
    apiRequest.mockResolvedValue([
      { employee_id: 'nayleth', weekday: 1, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
      { employee_id: 'betza', weekday: 2, start_time: '09:00', end_time: '18:00' },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('no consulta nada hasta que se abre', () => {
    mountFinder()

    expect(listCitas).not.toHaveBeenCalled()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('pide las citas de los próximos 7 días y lista los huecos libres con la duración completa del hueco', async () => {
    const w = await openIt()

    expect(listCitas).toHaveBeenCalledWith('b1', { start: new Date('2026-11-02T00:00:00'), end: new Date('2026-11-08T23:59:59') }, 'all', 'br-1')
    const slots = w.findAll('[data-testid="finder-slot"]').map(s => s.text())

    // Lunes de Nayleth: cita 9–11 y descanso 13–14 → 11:00–1:00 PM (2 h) y 2:00–6:00 PM (4 h). Betza solo trabaja los martes.
    expect(slots.some(t => t.includes('Nayleth Salazar') && t.includes('11:00 AM – 1:00 PM') && t.includes('2 h libres'))).toBe(true)
    expect(slots.some(t => t.includes('Nayleth Salazar') && t.includes('2:00 PM – 6:00 PM') && t.includes('4 h libres'))).toBe(true)
    expect(slots.some(t => t.includes('Betza Marquez'))).toBe(true)
  })

  it('al pedir 3 horas solo quedan los huecos que alcanzan', async () => {
    const w = await openIt()

    await w.find('[data-testid="finder-minutes"]').setValue('180')
    const mondaySlots = w.findAll('[data-testid="finder-slot"]').map(s => s.text()).filter(t => t.includes('Nayleth'))

    expect(mondaySlots).toHaveLength(1)
    expect(mondaySlots[0]).toContain('2:00 PM – 6:00 PM')
  })

  it('limitar a una profesional y a hoy', async () => {
    const w = await openIt()

    await w.find('[data-testid="finder-employee"]').setValue('betza')
    await w.find('[data-testid="finder-range-today"]').trigger('click')
    await flushPromises()

    // Betza no trabaja los lunes: hoy no hay nada.
    expect(w.find('[data-testid="finder-empty"]').exists()).toBe(true)
  })

  it('elegir un hueco emite día, hora de inicio, duración pedida y profesional, y cierra el panel', async () => {
    const w = await openIt()
    const first = w.findAll('[data-testid="finder-slot"]').find(s => s.text().includes('Nayleth Salazar') && s.text().includes('11:00 AM'))!

    await first.trigger('click')

    expect(w.emitted('select')![0]).toEqual([{ date: '2026-11-02', startMin: 11 * 60, minutes: 60, employeeId: 'nayleth' }])
    expect(w.find('[data-testid="finder-panel"]').exists()).toBe(false)
  })
})
