import { describe, it, expect } from 'vitest'
import { groupBlockEndMs, groupBlockSegments } from './groupBlock'

const at = (hhmm: string) => `2026-10-31T${hhmm}:00.000Z`
const ms = (hhmm: string) => new Date(at(hhmm)).getTime()

describe('groupBlockEndMs — fin del bloque de una visita con varios servicios', () => {
  const nayleth = 'emp-nayleth'

  it('llega hasta el servicio más largo aunque el primero de la lista sea el corto (el caso reportado: 60 y 120 min)', () => {
    const pedicure = { employee_id: nayleth, end_time: at('10:00'), status: 'confirmed' } // 9:00 + 60
    const manicure = { employee_id: nayleth, end_time: at('11:00'), status: 'confirmed' } // 9:00 + 120

    expect(groupBlockEndMs(pedicure, [pedicure, manicure])).toBe(ms('11:00'))
    expect(groupBlockEndMs(manicure, [pedicure, manicure])).toBe(ms('11:00'))
  })

  it('sin otras citas en la visita, el fin es el de la propia cita', () => {
    const solo = { employee_id: nayleth, end_time: at('10:00') }

    expect(groupBlockEndMs(solo, [solo])).toBe(ms('10:00'))
    expect(groupBlockEndMs(solo, [])).toBe(ms('10:00'))
  })

  it('no estira el bloque con servicios de otra profesional (tienen su propio bloque)', () => {
    const mia = { employee_id: nayleth, end_time: at('10:00') }
    const otra = { employee_id: 'emp-otra', end_time: at('12:00') }

    expect(groupBlockEndMs(mia, [mia, otra])).toBe(ms('10:00'))
  })

  it('ignora servicios cancelados o con inasistencia', () => {
    const activo = { employee_id: nayleth, end_time: at('10:00'), status: 'confirmed' }
    const cancelado = { employee_id: nayleth, end_time: at('12:00'), status: 'cancelled' }
    const faltó = { employee_id: nayleth, end_time: at('13:00'), status: 'no_show' }

    expect(groupBlockEndMs(activo, [activo, cancelado, faltó])).toBe(ms('10:00'))
  })
})

describe('groupBlockSegments — servicios dentro del bloque', () => {
  const nayleth = 'emp-nayleth'
  const member = (name: string, from: string, to: string, over: Record<string, unknown> = {}) => ({
    employee_id: nayleth, start_time: at(from), end_time: at(to), status: 'confirmed', name, ...over,
  })
  const nameOf = (m: any) => m.name

  it('lista cada servicio con su duración y su fin (el caso 60 y 120)', () => {
    const pedicure = member('Pedicure semipermanente', '09:00', '10:00')
    const manicure = member('Manicure semi + nivelación', '09:00', '11:00')

    expect(groupBlockSegments(pedicure, [pedicure, manicure], nameOf)).toEqual([
      { name: 'Pedicure semipermanente', minutes: 60, end: ms('10:00') },
      { name: 'Manicure semi + nivelación', minutes: 120, end: ms('11:00') },
    ])
  })

  it('omite servicios de otra profesional, cancelados o con fechas inválidas', () => {
    const mine = member('Mío', '09:00', '10:00')
    const others = [
      member('De otra', '09:00', '12:00', { employee_id: 'emp-otra' }),
      member('Cancelado', '09:00', '12:00', { status: 'cancelled' }),
      member('Roto', '09:00', '09:00'),
    ]

    expect(groupBlockSegments(mine, [mine, ...others], nameOf).map(s => s.name)).toEqual(['Mío'])
  })
})

describe('profesionales distintas: cada una con su propia tarjeta', () => {
  const pedicure = { employee_id: 'emp-a', start_time: at('09:00'), end_time: at('10:00'), status: 'confirmed', name: 'Pedicure' }
  const manicure = { employee_id: 'emp-b', start_time: at('09:00'), end_time: at('11:00'), status: 'confirmed', name: 'Manicure' }

  it('el bloque de una no se estira con el servicio de la otra', () => {
    expect(groupBlockEndMs(pedicure, [pedicure, manicure])).toBe(ms('10:00'))
    expect(groupBlockEndMs(manicure, [pedicure, manicure])).toBe(ms('11:00'))
  })

  it('cada tarjeta lista solo los servicios de su profesional', () => {
    expect(groupBlockSegments(pedicure, [pedicure, manicure], (m: any) => m.name).map(s => s.name)).toEqual(['Pedicure'])
    expect(groupBlockSegments(manicure, [pedicure, manicure], (m: any) => m.name).map(s => s.name)).toEqual(['Manicure'])
  })
})

describe('una profesional con varios servicios: una sola tarjeta con el total', () => {
  const a = { employee_id: 'emp-n', start_time: at('09:00'), end_time: at('10:00'), status: 'confirmed', name: 'Pedicure' }
  const b = { employee_id: 'emp-n', start_time: at('09:00'), end_time: at('11:00'), status: 'confirmed', name: 'Manicure' }

  it('devuelve los servicios con su precio para sumar el total', () => {
    const prices: Record<string, number> = { Pedicure: 17, Manicure: 23 }
    const segs = groupBlockSegments(a, [a, b], (m: any) => m.name, { extra: (m: any) => ({ price: prices[m.name] }) })

    expect(segs).toEqual([
      { name: 'Pedicure', minutes: 60, end: ms('10:00'), price: 17 },
      { name: 'Manicure', minutes: 120, end: ms('11:00'), price: 23 },
    ])
    expect(segs.reduce((sum, sg) => sum + (sg.price ?? 0), 0)).toBe(40)
    expect(groupBlockEndMs(a, [a, b])).toBe(ms('11:00'))
  })
})
