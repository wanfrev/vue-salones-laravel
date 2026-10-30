import { describe, it, expect } from 'vitest'
import { countByStatus, heatLevel, pendingLabel, statusSegments } from './monthStats'

const s = (...statuses: string[]) => statuses.map(status => ({ status }))

describe('countByStatus', () => {
  it('cuenta por estado y agrupa canceladas y no-show como «other»', () => {
    expect(countByStatus(s('paid', 'paid', 'confirmed', 'pending', 'cancelled', 'no_show'))).toEqual({ total: 6, paid: 2, confirmed: 1, pending: 1, other: 2 })
  })

  it('un estado desconocido también cuenta como «other» (el total siempre cuadra)', () => {
    const c = countByStatus(s('raro'))

    expect(c.total).toBe(1)
    expect(c.other).toBe(1)
  })

  it('un día vacío da ceros', () => {
    expect(countByStatus([])).toEqual({ total: 0, paid: 0, confirmed: 0, pending: 0, other: 0 })
  })
})

describe('statusSegments', () => {
  it('reparte porcentajes entre los estados presentes y suman 100', () => {
    const segs = statusSegments(countByStatus(s('paid', 'paid', 'confirmed', 'pending')))

    expect(segs.map(x => x.key)).toEqual(['paid', 'confirmed', 'pending'])
    expect(segs.map(x => x.pct)).toEqual([50, 25, 25])
    expect(segs.reduce((a, x) => a + x.pct, 0)).toBe(100)
  })

  it('omite los estados sin citas y no devuelve nada si el día está vacío', () => {
    expect(statusSegments(countByStatus(s('pending'))).map(x => x.key)).toEqual(['pending'])
    expect(statusSegments(countByStatus([]))).toEqual([])
  })
})

describe('heatLevel', () => {
  it('0 sin citas y escalones de cuartos respecto al máximo', () => {
    expect([0, 1, 25, 26, 50, 51, 75, 76, 100].map(n => heatLevel(n, 100))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('con máximo 0 o negativo no divide por cero', () => {
    expect(heatLevel(3, 0)).toBe(0)
    expect(heatLevel(-1, 10)).toBe(0)
  })

  it('un día con pocas citas frente a un máximo enorme sigue marcado (nivel 1)', () => {
    expect(heatLevel(1, 500)).toBe(1)
  })
})

describe('pendingLabel', () => {
  it('concuerda en singular y plural', () => {
    expect([0, 1, 2].map(pendingLabel)).toEqual(['0 pendientes', '1 pendiente', '2 pendientes'])
  })
})
