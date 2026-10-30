import { describe, it, expect } from 'vitest'
import { snapshotAppointment } from './undoSnapshot'

const raw = (over: Record<string, unknown> = {}) => ({
  id: 'a1', employee_id: 'nayleth', status: 'confirmed', payment_status: 'unpaid',
  start_time: '2026-10-31T09:00:00.000Z', end_time: '2026-10-31T10:30:00.000Z', ...over,
})

describe('snapshotAppointment', () => {
  it('guarda inicio, fin, profesional y estado de una fila cruda', () => {
    expect(snapshotAppointment([raw()], 'a1')).toEqual({
      start: '2026-10-31T09:00:00.000Z', end: '2026-10-31T10:30:00.000Z', employeeId: 'nayleth', status: 'confirmed',
    })
  })

  it('entiende una cita ya mapeada (fecha, hora y duración) y su estado', () => {
    const snap = snapshotAppointment([{ id: 'c1', date: '2026-10-31', time: '09:00', duration: 60, employeeId: 'ana', status: 'pending' }], 'c1')

    expect(snap).toMatchObject({ employeeId: 'ana', status: 'pending' })
    expect(new Date(snap!.end).getTime() - new Date(snap!.start).getTime()).toBe(60 * 60_000)
  })

  it('reconoce lo pagado por cualquiera de sus formas', () => {
    expect(snapshotAppointment([raw({ status: 'completed', payment_status: 'paid' })], 'a1')?.status).toBe('paid')
    expect(snapshotAppointment([{ id: 'x', date: '2026-10-31', time: '09:00', duration: 30, status: 'paid' }], 'x')?.status).toBe('paid')
  })

  it('sin foto fiable no hay nada que deshacer: no existe o está cancelada', () => {
    expect(snapshotAppointment([raw()], 'otra')).toBeNull()
    expect(snapshotAppointment([raw({ status: 'cancelled' })], 'a1')).toBeNull()
  })
})
