import { describe, it, expect } from 'vitest'
import { groupBlockEndMs } from './groupBlock'

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
