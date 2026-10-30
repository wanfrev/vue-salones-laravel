import { describe, it, expect } from 'vitest'
import { busySlotsFrom, describeConflict, findConflicts, toBusySlot } from './conflicts'

const iso = (hhmm: string) => `2026-10-31T${hhmm}:00.000Z`
const ms = (hhmm: string) => new Date(iso(hhmm)).getTime()

const raw = (over: Record<string, unknown> = {}) => ({
  id: 'a1', employee_id: 'nayleth', assistant_employee_id: null, group_id: null, status: 'confirmed',
  start_time: iso('09:00'), end_time: iso('11:00'), clients: { full_name: 'Mary Bracho' }, ...over,
})

describe('toBusySlot', () => {
  it('usa el end_time real de una fila cruda (no asume 30 min)', () => {
    expect(toBusySlot(raw())).toMatchObject({ start: ms('09:00'), end: ms('11:00'), employeeId: 'nayleth', clientName: 'Mary Bracho' })
  })

  it('una cita ya mapeada usa fecha, hora y duración', () => {
    const slot = toBusySlot({ id: 'c1', date: '2026-10-31', time: '09:00', duration: 90, employeeId: 'nayleth', clientName: 'Ana' })

    expect(slot!.end - slot!.start).toBe(90 * 60_000)
  })

  it('ignora canceladas, inasistencias, filas con historia clínica y fechas inválidas', () => {
    expect(toBusySlot(raw({ status: 'cancelled' }))).toBeNull()
    expect(toBusySlot(raw({ status: 'no_show' }))).toBeNull()
    expect(toBusySlot(raw({ clinical_history: { a: 'b' } }))).toBeNull()
    expect(toBusySlot({ id: 'x', date: '2026-99-99', time: '99:99' })).toBeNull()
  })
})

describe('findConflicts', () => {
  const busy = busySlotsFrom([raw(), raw({ id: 'a2', employee_id: 'otra', assistant_employee_id: 'nayleth', start_time: iso('14:00'), end_time: iso('15:00') })])

  it('detecta el choque con la segunda hora de un servicio largo (9:00–11:00)', () => {
    expect(findConflicts('nayleth', ms('10:00'), ms('10:30'), busy)).toHaveLength(1)
  })

  it('el borde exacto no choca: una cita que empieza cuando la otra termina es válida', () => {
    expect(findConflicts('nayleth', ms('11:00'), ms('12:00'), busy)).toHaveLength(0)
    expect(findConflicts('nayleth', ms('08:00'), ms('09:00'), busy)).toHaveLength(0)
  })

  it('cuenta también como asistente', () => {
    expect(findConflicts('nayleth', ms('14:30'), ms('15:30'), busy).map(b => b.id)).toEqual(['a2'])
  })

  it('no choca con las citas de su propia visita ni con la que se está editando', () => {
    const own = busySlotsFrom([raw({ id: 'g1', group_id: 'visita' }), raw({ id: 'g2', group_id: 'visita' })])

    expect(findConflicts('nayleth', ms('09:00'), ms('10:00'), own, { groupId: 'visita' })).toHaveLength(0)
    expect(findConflicts('nayleth', ms('09:00'), ms('10:00'), own, { id: 'g1' }).map(b => b.id)).toEqual(['g2'])
  })

  it('otra profesional libre no choca, y sin persona no devuelve nada', () => {
    expect(findConflicts('libre', ms('09:00'), ms('11:00'), busy)).toHaveLength(0)
    expect(findConflicts('', ms('09:00'), ms('11:00'), busy)).toHaveLength(0)
  })
})

describe('busySlotsFrom', () => {
  it('no repite la misma cita aunque esté en varias consultas de la caché', () => {
    expect(busySlotsFrom([raw(), raw()])).toHaveLength(1)
  })
})

describe('describeConflict', () => {
  it('nombra a la clienta y la franja, y avisa si son varias', () => {
    const one = findConflicts('nayleth', ms('10:00'), ms('10:30'), busySlotsFrom([raw()]))

    expect(describeConflict(one)).toMatch(/^Ya tiene a Mary Bracho de .+ a .+$/)
    expect(describeConflict([...one, ...one], 'asistente')).toMatch(/^El asistente ya tiene a Mary Bracho .+ \(y 1 más\)$/)
    expect(describeConflict([])).toBe('')
  })
})
