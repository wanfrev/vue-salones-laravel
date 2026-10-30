import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgendaYearView from './AgendaYearView.vue'

const appt = (month: number, day: number, employee = 'e1', year = 2026) => ({ id: `${year}-${month}-${day}-${employee}-${Math.random()}`, start_time: new Date(year, month - 1, day, 9).toISOString(), employee_id: employee })

const mountYear = (appointments: any[], over: Record<string, unknown> = {}) =>
  mount(AgendaYearView, { props: { appointments, employeeId: 'all', selectedDate: '2026-10-15', todayIso: '2026-10-30', ...over } })

const monthCard = (w: ReturnType<typeof mountYear>, name: string) => w.findAll('[data-testid="year-month"]').find(m => m.text().toLowerCase().startsWith(name))!
const dayCell = (w: ReturnType<typeof mountYear>, month: string, day: number) =>
  monthCard(w, month).findAll('[data-testid="year-day"]').find(d => d.text() === String(day))!

describe('AgendaYearView', () => {
  it('dibuja los doce meses con todos sus días', () => {
    const w = mountYear([])

    expect(w.findAll('[data-testid="year-month"]')).toHaveLength(12)
    expect(w.findAll('[data-testid="year-day"]')).toHaveLength(365)
  })

  it('cada mes muestra su total de citas', () => {
    const w = mountYear([appt(10, 5), appt(10, 5), appt(10, 6), appt(3, 1)])

    expect(monthCard(w, 'octubre').text()).toContain('3 citas')
    expect(monthCard(w, 'marzo').text()).toContain('1 cita')
    expect(monthCard(w, 'marzo').text()).not.toContain('1 citas')
    expect(monthCard(w, 'enero').text()).toContain('0 citas')
  })

  it('los días con más citas se pintan más fuerte que los de menos y los vacíos no se pintan', () => {
    const many = Array.from({ length: 10 }, () => appt(10, 5))
    const w = mountYear([...many, appt(10, 6)])

    expect(dayCell(w, 'octubre', 5).classes()).toContain('bg-primary/60')
    expect(dayCell(w, 'octubre', 6).classes()).toContain('bg-primary/15')
    expect(dayCell(w, 'octubre', 7).classes().some(c => c.startsWith('bg-primary'))).toBe(false)
  })

  it('con una profesional elegida cuenta solo sus citas', () => {
    const w = mountYear([appt(10, 5, 'e1'), appt(10, 5, 'e2'), appt(10, 6, 'e2')], { employeeId: 'e1' })

    expect(monthCard(w, 'octubre').text()).toContain('1 cita')
  })

  it('ignora las citas de otro año', () => {
    const w = mountYear([appt(10, 5, 'e1', 2025), appt(10, 5)])

    expect(monthCard(w, 'octubre').text()).toContain('1 cita')
  })

  it('marca el día de hoy y el mes actual', () => {
    const w = mountYear([])

    expect(dayCell(w, 'octubre', 30).classes()).toContain('ring-primary')
    expect(monthCard(w, 'octubre').classes()).toContain('border-primary/60')
    expect(monthCard(w, 'marzo').classes()).not.toContain('border-primary/60')
  })

  it('tocar un día emite goToDate y tocar el título del mes emite goToMonth', async () => {
    const w = mountYear([])

    await dayCell(w, 'octubre', 12).trigger('click')
    await monthCard(w, 'mayo').find('button').trigger('click')

    expect(w.emitted('goToDate')![0]).toEqual(['2026-10-12'])
    expect(w.emitted('goToMonth')![0]).toEqual([4, 2026])
  })

  it('febrero de un año no bisiesto tiene 28 días y el de uno bisiesto 29', () => {
    expect(monthCard(mountYear([]), 'febrero').findAll('[data-testid="year-day"]')).toHaveLength(28)
    expect(monthCard(mountYear([], { selectedDate: '2028-02-10' }), 'febrero').findAll('[data-testid="year-day"]')).toHaveLength(29)
  })
})
