import { describe, it, expect } from 'vitest'
import { findFreeSlots, type ScheduleRow } from './freeSlots'
import type { BusySlot } from './conflicts'

// 2026-11-02 es lunes (weekday 1). Todo en hora local, como el resto del calendario.
const DAY = '2026-11-02'
const at = (hhmm: string, day = DAY) => new Date(`${day}T${hhmm}:00`).getTime()
const long_ago = at('00:00', '2026-10-01')

const nayleth = { id: 'nayleth', name: 'Nayleth' }
const betza = { id: 'betza', name: 'Betza' }

const schedule = (employee_id: string, extra: Partial<ScheduleRow> = {}): ScheduleRow =>
  ({ employee_id, weekday: 1, start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', ...extra })

const busy = (employeeId: string, from: string, to: string, extra: Partial<BusySlot> = {}): BusySlot =>
  ({ id: `${employeeId}-${from}`, groupId: null, employeeId, assistantId: null, start: at(from), end: at(to), clientName: 'Mary', ...extra })

const find = (over: Record<string, unknown> = {}) => findFreeSlots({
  days: [DAY], now: long_ago, employees: [nayleth], schedules: [schedule('nayleth')], busy: [busy('nayleth', '09:00', '11:00')], minMinutes: 120, ...over,
} as any)

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const show = (slots: ReturnType<typeof find>) => slots.map(s => `${hhmm(s.startMin)}-${hhmm(s.endMin)}`)

describe('findFreeSlots — «¿cuándo tiene 2 horas libres Nayleth?»', () => {
  it('descuenta la cita y el descanso: queda 11:00–13:00 y 14:00–18:00', () => {
    expect(show(find())).toEqual(['11:00-13:00', '14:00-18:00'])
  })

  it('pide más tiempo y solo queda el hueco largo', () => {
    expect(show(find({ minMinutes: 180 }))).toEqual(['14:00-18:00'])
    expect(find({ minMinutes: 300 })).toEqual([])
  })

  it('con menos tiempo aparecen los mismos huecos (no se parten)', () => {
    expect(show(find({ minMinutes: 30 }))).toEqual(['11:00-13:00', '14:00-18:00'])
  })

  it('informa cuánto dura el hueco completo', () => {
    expect(find({ minMinutes: 30 }).map(s => s.minutes)).toEqual([120, 240])
  })

  it('una cita como asistente también ocupa a la persona', () => {
    const asAssistant = busy('betza', '11:00', '13:00', { assistantId: 'nayleth' })

    expect(show(find({ busy: [busy('nayleth', '09:00', '11:00'), asAssistant] }))).toEqual(['14:00-18:00'])
  })

  it('una cita larga ocupa sus dos horas completas (la 2.ª hora no queda libre)', () => {
    expect(show(find({ busy: [busy('nayleth', '09:00', '12:00')], minMinutes: 60 }))).toEqual(['12:00-13:00', '14:00-18:00'])
  })

  it('el día libre (tiene horarios, pero no ese día) no ofrece huecos', () => {
    expect(find({ schedules: [schedule('nayleth', { weekday: 2 })] })).toEqual([])
  })

  it('sin horario configurado usa el horario por defecto', () => {
    expect(show(find({ schedules: [], busy: [], defaultWindow: { start: 8 * 60, end: 12 * 60 } }))).toEqual(['08:00-12:00'])
  })

  it('lo que ya pasó hoy no cuenta: el hueco empieza en el siguiente cuarto de hora', () => {
    const slots = find({ now: at('15:10'), busy: [], minMinutes: 60 })

    expect(show(slots)).toEqual(['15:15-18:00'])
  })

  it('busca en varios días y varias profesionales, ordenado por día y hora', () => {
    const other = '2026-11-03'
    const slots = findFreeSlots({
      days: [DAY, other],
      now: long_ago,
      employees: [nayleth, betza],
      schedules: [schedule('nayleth'), schedule('betza'), schedule('nayleth', { weekday: 2 }), schedule('betza', { weekday: 2 })],
      busy: [busy('nayleth', '09:00', '18:00')],
      minMinutes: 240,
    })

    // Lunes: Nayleth está ocupada todo el día, solo Betza. Martes: las dos. El descanso parte cada día en 9–13 y 14–18.
    expect(slots.map(s => `${s.date} ${hhmm(s.startMin)} ${s.employeeName}`)).toEqual([
      `${DAY} 09:00 Betza`,
      `${DAY} 14:00 Betza`,
      `${other} 09:00 Betza`,
      `${other} 09:00 Nayleth`,
      `${other} 14:00 Betza`,
      `${other} 14:00 Nayleth`,
    ])
  })

  it('limita a una profesional', () => {
    const slots = findFreeSlots({ days: [DAY], now: long_ago, employees: [nayleth, betza], schedules: [], busy: [], minMinutes: 60, employeeId: 'betza' })

    expect(new Set(slots.map(s => s.employeeId))).toEqual(new Set(['betza']))
  })

  it('las citas de otra profesional no la afectan', () => {
    expect(show(find({ busy: [busy('betza', '09:00', '18:00')], minMinutes: 60 }))).toEqual(['09:00-13:00', '14:00-18:00'])
  })
})
