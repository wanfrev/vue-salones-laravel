import { describe, it, expect } from 'vitest'
import { computeOccupancyRows, formatMinutesAsClock, mergeRanges, teamOccupancy } from './occupancy'

const DAY = '2026-10-30' // viernes (weekday 5)
const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m).toISOString()
const sched = (employee_id: string, over: Record<string, unknown> = {}) =>
  ({ employee_id, weekday: 5, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00', ...over })
const appt = (employee_id: string, sh: number, eh: number, over: Record<string, unknown> = {}) =>
  ({ id: `${employee_id}-${sh}`, employee_id, assistant_employee_id: null, start_time: at(sh), end_time: at(eh), status: 'confirmed', payment_status: 'unpaid', ...over })
const run = (over: Partial<Parameters<typeof computeOccupancyRows>[0]> = {}) =>
  computeOccupancyRows({ employees: [{ id: 'e1', full_name: 'Kelly' }], schedules: [sched('e1')], appointments: [], dateIso: DAY, defaultStartHour: 7, defaultEndHour: 21, ...over })

describe('computeOccupancyRows', () => {
  it('calcula el % reservado sobre la jornada sin contar el descanso y deja los huecos', () => {
    const [row] = run({ appointments: [appt('e1', 9, 10)] })

    // 60 min reservados de (9h − 1h de descanso) = 480 min → 12,5 % → 13
    expect(row.pctBooked).toBe(13)
    expect(row.dayOff).toBe(false)
    expect(row.gaps.map(g => g.label)).toEqual(['10:00 AM – 1:00 PM', '2:00 PM – 6:00 PM'])
  })

  it('una profesional con horario configurado pero no hoy sale como «no trabaja»', () => {
    const [row] = run({ schedules: [sched('e1', { weekday: 2 })] })

    expect(row).toMatchObject({ dayOff: true, pctBooked: 0, gaps: [] })
  })

  it('sin ningún horario configurado usa la ventana por defecto del negocio', () => {
    const [row] = run({ schedules: [], appointments: [appt('e1', 7, 14)] })

    // 7h de 14h (7 a 21) = 50 %
    expect(row.pctBooked).toBe(50)
    expect(row.gaps.map(g => g.label)).toEqual(['2:00 PM – 9:00 PM'])
  })

  it('las canceladas y las no-show no ocupan', () => {
    const [row] = run({ appointments: [appt('e1', 9, 10, { status: 'cancelled' }), appt('e1', 10, 11, { status: 'no_show' })] })

    expect(row.pctBooked).toBe(0)
  })

  it('una cita de otro día no cuenta', () => {
    const other = { ...appt('e1', 9, 10), start_time: new Date(2026, 9, 29, 9).toISOString(), end_time: new Date(2026, 9, 29, 10).toISOString() }

    expect(run({ appointments: [other] })[0].pctBooked).toBe(0)
  })

  it('la asistente también tiene la cita reservada', () => {
    const rows = run({
      employees: [{ id: 'e1', full_name: 'Kelly' }, { id: 'e2', full_name: 'Yenifer' }],
      schedules: [sched('e1'), sched('e2')],
      appointments: [appt('e1', 9, 11, { assistant_employee_id: 'e2' })],
    })

    expect(rows.map(r => r.pctBooked)).toEqual([25, 25])
  })

  it('citas que se pisan entre sí no cuentan dos veces el mismo tiempo', () => {
    const [row] = run({ appointments: [appt('e1', 9, 11), { ...appt('e1', 10, 12), id: 'x' }] })

    // Reservado: 9–12 = 180 min de 480 → 37,5 % → 38
    expect(row.pctBooked).toBe(38)
  })

  it('una cita que cruza el descanso solo cuenta dentro de la jornada', () => {
    const [row] = run({ appointments: [appt('e1', 8, 10)] })

    // Antes de las 9 no cuenta: queda 9–10 = 60 min
    expect(row.pctBooked).toBe(13)
  })

  it('ordena: la menos ocupada primero y las que no trabajan al final', () => {
    const rows = run({
      employees: [{ id: 'a', full_name: 'A' }, { id: 'b', full_name: 'B' }, { id: 'c', full_name: 'C' }],
      schedules: [sched('a'), sched('b'), sched('c', { weekday: 1 })],
      appointments: [appt('a', 9, 12)],
    })

    expect(rows.map(r => r.id)).toEqual(['b', 'a', 'c'])
  })

  it('un día sin horas útiles (jornada igual al descanso) se marca completo en vez de dividir por cero', () => {
    const [row] = run({ schedules: [sched('e1', { start_time: '13:00:00', end_time: '14:00:00' })] })

    expect(row.pctBooked).toBe(100)
  })
})

describe('teamOccupancy', () => {
  it('promedia solo a quien trabaja y topa cada una en 100', () => {
    expect(teamOccupancy([
      { id: 'a', name: 'A', pctBooked: 50, gaps: [], dayOff: false },
      { id: 'b', name: 'B', pctBooked: 100, gaps: [], dayOff: false },
      { id: 'c', name: 'C', pctBooked: 0, gaps: [], dayOff: true },
    ])).toBe(75)
  })

  it('devuelve null si nadie trabaja', () => {
    expect(teamOccupancy([])).toBeNull()
    expect(teamOccupancy([{ id: 'c', name: 'C', pctBooked: 0, gaps: [], dayOff: true }])).toBeNull()
  })
})

describe('mergeRanges / formatMinutesAsClock', () => {
  it('une rangos que se tocan o se pisan', () => {
    expect(mergeRanges([[60, 120], [100, 180], [180, 200], [300, 360]])).toEqual([[60, 200], [300, 360]])
  })

  it('formatea minutos del día en 12 horas', () => {
    expect([0, 570, 720, 810].map(formatMinutesAsClock)).toEqual(['12:00 AM', '9:30 AM', '12:00 PM', '1:30 PM'])
  })
})
