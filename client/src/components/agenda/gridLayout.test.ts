import { describe, it, expect } from 'vitest'
import { buildDisplayAppointments, buildGroupMemberMap, layoutOverlaps } from './gridLayout'

const slot = (id: string, startH: number, endH: number) => ({ id, startMs: startH * 3600_000, endMs: endH * 3600_000, left: 0, width: 100 })
const byId = (xs: ReturnType<typeof layoutOverlaps<ReturnType<typeof slot>>>) => Object.fromEntries(xs.map(x => [x.id, [x.left, x.width]]))

describe('layoutOverlaps', () => {
  it('una cita sola ocupa todo el ancho', () => {
    expect(byId(layoutOverlaps([slot('a', 9, 10)]))).toEqual({ a: [0, 100] })
  })

  it('dos citas que se pisan se reparten el ancho por mitades', () => {
    expect(byId(layoutOverlaps([slot('a', 9, 11), slot('b', 10, 12)]))).toEqual({ a: [0, 50], b: [50, 50] })
  })

  it('citas seguidas (una termina cuando empieza la otra) no se consideran solapadas', () => {
    expect(byId(layoutOverlaps([slot('a', 9, 10), slot('b', 10, 11)]))).toEqual({ a: [0, 100], b: [0, 100] })
  })

  it('una cita puede reusar la columna de otra que ya terminó dentro del mismo grupo', () => {
    // a (9-12) pisa a b (9-10) y a c (10-11): b y c comparten la segunda columna.
    expect(byId(layoutOverlaps([slot('a', 9, 12), slot('b', 9, 10), slot('c', 10, 11)]))).toEqual({ a: [0, 50], b: [50, 50], c: [50, 50] })
  })

  it('cada grupo se reparte por separado', () => {
    const r = byId(layoutOverlaps([slot('a', 9, 10), slot('b', 9, 10), slot('c', 14, 15)]))

    expect(r.a[1]).toBe(50)
    expect(r.c).toEqual([0, 100])
  })

  it('no modifica las citas recibidas y devuelve vacío sin citas', () => {
    const a = slot('a', 9, 11)
    layoutOverlaps([a, slot('b', 10, 12)])

    expect(a).toMatchObject({ left: 0, width: 100 })
    expect(layoutOverlaps([])).toEqual([])
  })
})

describe('buildDisplayAppointments', () => {
  it('deja una sola fila por (visita, profesional) y conserva las citas sueltas', () => {
    const rows = [
      { id: '1', group_id: 'g', employee_id: 'e1' }, { id: '2', group_id: 'g', employee_id: 'e1' },
      { id: '3', group_id: 'g', employee_id: 'e2' }, { id: '4', group_id: null, employee_id: 'e1' },
    ]

    expect(buildDisplayAppointments(rows).map(r => r.id)).toEqual(['1', '3', '4'])
  })
})

describe('buildGroupMemberMap', () => {
  it('junta las filas de cada visita y salta las citas sin visita', () => {
    const rows = [{ id: '1', group_id: 'g' }, { id: '2', group_id: 'h' }, { id: '3', group_id: 'g' }, { id: '4', group_id: null }]
    const map = buildGroupMemberMap(rows)

    expect([...map.keys()]).toEqual(['g', 'h'])
    expect(map.get('g')!.map(r => r.id)).toEqual(['1', '3'])
  })
})
