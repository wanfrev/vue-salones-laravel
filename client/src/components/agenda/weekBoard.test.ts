import { describe, it, expect } from 'vitest'
import { buildBoardItems, hourHistogram, hourLabel } from './weekBoard'

const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m).getTime()
const appt = (id: string, h: number, m = 0) => ({ id, startMs: at(h, m) })
const kinds = (items: ReturnType<typeof buildBoardItems>) => items.map(i => (i.kind === 'row' ? `row:${i.appt.id}` : i.kind === 'hour' ? `hour:${i.hour}(${i.count})` : 'now'))

describe('buildBoardItems', () => {
  it('ordena cronológicamente y abre un grupo por hora con su conteo', () => {
    const items = buildBoardItems([appt('c', 10, 30), appt('a', 9), appt('b', 9, 30), appt('d', 11)])

    expect(kinds(items)).toEqual(['hour:9(2)', 'row:a', 'row:b', 'hour:10(1)', 'row:c', 'hour:11(1)', 'row:d'])
  })

  it('desempata citas a la misma hora por id para que el orden sea estable', () => {
    const items = buildBoardItems([appt('b', 9), appt('a', 9)])

    expect(kinds(items)).toEqual(['hour:9(2)', 'row:a', 'row:b'])
  })

  it('sin `nowMs` no pone línea de ahora', () => {
    expect(kinds(buildBoardItems([appt('a', 9)]))).not.toContain('now')
  })

  it('pone «ahora» entre las citas de la misma hora', () => {
    const items = buildBoardItems([appt('a', 11), appt('b', 11, 30)], at(11, 20))

    expect(kinds(items)).toEqual(['hour:11(2)', 'row:a', 'now', 'row:b'])
  })

  it('pone «ahora» antes del encabezado de la hora siguiente', () => {
    const items = buildBoardItems([appt('a', 9), appt('b', 14)], at(11, 20))

    expect(kinds(items)).toEqual(['hour:9(1)', 'row:a', 'now', 'hour:14(1)', 'row:b'])
  })

  it('pone «ahora» al principio si aún no empezó ninguna cita y al final si ya empezaron todas', () => {
    expect(kinds(buildBoardItems([appt('a', 14)], at(8)))).toEqual(['now', 'hour:14(1)', 'row:a'])
    expect(kinds(buildBoardItems([appt('a', 9)], at(18)))).toEqual(['hour:9(1)', 'row:a', 'now'])
  })

  it('un día sin citas con «ahora» solo muestra la línea; sin «ahora» queda vacío', () => {
    expect(kinds(buildBoardItems([], at(11)))).toEqual(['now'])
    expect(buildBoardItems([])).toEqual([])
  })

  it('una cita que empieza justo en este minuto cuenta como «por venir» (la línea va antes)', () => {
    expect(kinds(buildBoardItems([appt('a', 11, 20)], at(11, 20)))).toEqual(['now', 'hour:11(1)', 'row:a'])
  })

  it('no modifica el arreglo recibido', () => {
    const input = [appt('b', 10), appt('a', 9)]
    buildBoardItems(input)

    expect(input.map(a => a.id)).toEqual(['b', 'a'])
  })
})

describe('hourHistogram', () => {
  it('cuenta las citas que empiezan en cada hora del rango', () => {
    expect(hourHistogram([appt('a', 9), appt('b', 9, 30), appt('c', 11)], 9, 12)).toEqual([2, 0, 1, 0])
  })

  it('ignora las citas fuera del rango y devuelve ceros si no hay ninguna', () => {
    expect(hourHistogram([appt('a', 7), appt('b', 20)], 9, 12)).toEqual([0, 0, 0, 0])
    expect(hourHistogram([], 9, 10)).toEqual([0, 0])
  })

  it('un rango invertido da una lista vacía en vez de fallar', () => {
    expect(hourHistogram([appt('a', 9)], 12, 9)).toEqual([])
  })
})

describe('hourLabel', () => {
  it('formatea en 12 horas', () => {
    expect([0, 9, 12, 13, 23].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '1 PM', '11 PM'])
  })
})
