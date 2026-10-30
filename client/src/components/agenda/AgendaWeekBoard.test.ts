import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgendaWeekBoard from './AgendaWeekBoard.vue'
import type { DisplayAppointment, GridColumn } from './gridTypes'

const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m).getTime()
const appt = (id: string, h: number, m = 0, over: Partial<DisplayAppointment> = {}): DisplayAppointment => ({
  id, clientName: `Clienta ${id}`, service: 'Manicure', time: '9:00 AM', top: 0, height: 60, startMs: at(h, m), endMs: at(h + 1, m), left: 0, width: 100,
  status: 'confirmed', employeeInitials: 'KS', employeeName: 'Kelly', employeeColor: '#888', raw: {}, segments: [], segKey: '', ...over,
})
const col = (key: string, number: number, appointments: DisplayAppointment[], isToday = false): GridColumn =>
  ({ key, label: 'Vie', number, isToday, widthPercent: 100 / 7, appointments })

const mountBoard = (columns: GridColumn[], compact = false, nowMs = at(11, 20)) => mount(AgendaWeekBoard, { props: { columns, compact, nowMs } })

describe('AgendaWeekBoard', () => {
  it('lista las citas de cada día en orden y con su cuenta', () => {
    const w = mountBoard([col('2026-10-30', 30, [appt('b', 10), appt('a', 9)]), col('2026-10-31', 31, [])])

    const rows = w.findAll('[data-testid="board-row"]').map(r => r.text())
    expect(rows[0]).toContain('Clienta a')
    expect(rows[1]).toContain('Clienta b')
    const heads = w.findAll('[data-testid="board-day"]').map(d => d.text())
    expect(heads[0]).toContain('2 citas')
    expect(heads[1]).toContain('0 citas')
    expect(w.text()).toContain('Sin citas')
  })

  it('usa singular con una sola cita', () => {
    const w = mountBoard([col('2026-10-30', 30, [appt('a', 9)])])

    expect(w.find('[data-testid="board-day"]').text()).toContain('1 cita')
    expect(w.find('[data-testid="board-day"]').text()).not.toContain('1 citas')
  })

  it('cuenta las citas pendientes de cada día', () => {
    const w = mountBoard([col('2026-10-30', 30, [appt('a', 9, 0, { status: 'pending' }), appt('b', 10, 0, { status: 'pending' }), appt('c', 11)])])

    expect(w.find('[data-testid="board-day"]').text()).toContain('2 pendientes')
  })

  it('la línea de ahora aparece solo en la columna de hoy', () => {
    const w = mountBoard([col('2026-10-29', 29, [appt('a', 9)]), col('2026-10-30', 30, [appt('b', 9)], true)])

    expect(w.findAll('[aria-label="Ahora"]')).toHaveLength(1)
  })

  it('al hacer clic en una cita emite select con la cita; el encabezado emite goDay', async () => {
    const a = appt('a', 9)
    const w = mountBoard([col('2026-10-30', 30, [a])])

    await w.find('[data-testid="board-row"]').trigger('click')
    await w.find('[data-testid="board-day"]').trigger('click')

    expect((w.emitted('select')![0] as unknown[])[0]).toEqual(a)
    expect(w.emitted('goDay')![0]).toEqual(['2026-10-30'])
  })

  it('pasar el cursor emite hover con la cita y salir emite leave', async () => {
    const a = appt('a', 9)
    const w = mountBoard([col('2026-10-30', 30, [a])])
    const row = w.find('[data-testid="board-row"]')

    await row.trigger('pointerenter')
    await row.trigger('pointerleave')

    expect((w.emitted('hover')![0] as unknown[])[0]).toEqual(a)
    expect(w.emitted('leave')).toHaveLength(1)
  })

  it('en el celular muestra una fila por día y ninguna cita suelta', async () => {
    const w = mountBoard([col('2026-10-29', 29, [appt('a', 9)]), col('2026-10-30', 30, [])], true)

    expect(w.findAll('[data-testid="board-row"]')).toHaveLength(0)
    expect(w.findAll('[data-testid="board-day"]')).toHaveLength(2)
    await w.findAll('[data-testid="board-day"]')[0].trigger('click')
    expect(w.emitted('goDay')![0]).toEqual(['2026-10-29'])
  })
})
