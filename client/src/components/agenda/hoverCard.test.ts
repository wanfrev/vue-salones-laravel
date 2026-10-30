import { describe, it, expect } from 'vitest'
import { durationLabel, hoverSummary, monthApptSource, placeCard } from './hoverCard'

const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m).getTime()
const base = { clientName: 'Samanta Gómez', service: 'Manicure gel', status: 'confirmed', employeeName: 'Kelly Soler', startMs: at(9), endMs: at(10) }

describe('durationLabel', () => {
  it('formatea horas y minutos', () => {
    expect([30, 60, 90, 120, 0].map(durationLabel)).toEqual(['30 min', '1 h', '1 h 30 min', '2 h', '0 min'])
  })
})

describe('hoverSummary', () => {
  it('resume una cita de un solo servicio sin repetir minutos ni precio', () => {
    const s = hoverSummary(base)

    expect(s.clientName).toBe('Samanta Gómez')
    expect(s.timeRange).toBe('9:00 AM – 10:00 AM')
    expect(s.duration).toBe('1 h')
    expect(s.services).toEqual([{ name: 'Manicure gel' }])
    expect(s.total).toBeUndefined()
    expect(s.statusLabel).toBeTruthy()
  })

  it('en una visita con varios servicios lista cada uno con su duración y precio, y el total', () => {
    const s = hoverSummary({
      ...base, endMs: at(11),
      segments: [{ name: 'Pedicure', minutes: 60, price: 17 }, { name: 'Manicure semi', minutes: 120, price: 23 }],
      totalPrice: 40,
    })

    expect(s.services).toEqual([{ name: 'Pedicure', detail: '1 h · $17.00' }, { name: 'Manicure semi', detail: '2 h · $23.00' }])
    expect(s.total).toBe('$40.00')
    expect(s.duration).toBe('2 h')
  })

  it('un servicio de la visita sin precio no muestra «$»', () => {
    const s = hoverSummary({ ...base, segments: [{ name: 'A', minutes: 30 }, { name: 'B', minutes: 60 }] })

    expect(s.services[0].detail).toBe('30 min')
  })

  it('incluye la mascota y las notas solo si hay texto', () => {
    expect(hoverSummary({ ...base, petName: 'Luna', raw: { internal_notes: '  alérgica al látex ' } })).toMatchObject({ petName: 'Luna', notes: 'alérgica al látex' })
    const none = hoverSummary({ ...base, petName: '', raw: { internal_notes: '   ' } })
    expect(none.petName).toBeUndefined()
    expect(none.notes).toBeUndefined()
  })
})

describe('monthApptSource', () => {
  it('toma el rango de la fila cruda y conserva los textos ya resueltos', () => {
    const src = monthApptSource({
      clientName: 'Ana', service: 'Dip + Efectos', status: 'paid', employeeName: 'Kelly',
      raw: { start_time: new Date(2026, 9, 30, 9).toISOString(), end_time: new Date(2026, 9, 30, 10, 30).toISOString(), internal_notes: 'nota' },
    })

    expect(src).toMatchObject({ clientName: 'Ana', service: 'Dip + Efectos', status: 'paid', employeeName: 'Kelly', startMs: at(9), endMs: at(10, 30) })
    expect(hoverSummary(src).duration).toBe('1 h 30 min')
    expect(hoverSummary(src).notes).toBe('nota')
  })
})

describe('placeCard', () => {
  const viewport = { width: 1000, height: 700 }
  const size = { width: 280, height: 200 }

  it('va a la derecha de la cita cuando cabe', () => {
    expect(placeCard({ left: 100, right: 200, top: 300, bottom: 330 }, size, viewport)).toEqual({ x: 208, y: 294, fromBottom: false })
  })

  it('se pasa a la izquierda cuando a la derecha no cabe', () => {
    expect(placeCard({ left: 800, right: 900, top: 300, bottom: 330 }, size, viewport)).toEqual({ x: 800 - 8 - 280, y: 294, fromBottom: false })
  })

  it('no se sale por abajo ni por arriba', () => {
    expect(placeCard({ left: 100, right: 200, top: 650, bottom: 680 }, size, viewport).y).toBe(700 - 200 - 8)
    expect(placeCard({ left: 100, right: 200, top: 0, bottom: 20 }, size, viewport).y).toBe(8)
  })

  it('si no cabe hacia abajo se ancla al borde inferior de la pantalla', () => {
    expect(placeCard({ left: 100, right: 200, top: 650, bottom: 680 }, size, viewport).fromBottom).toBe(true)
    expect(placeCard({ left: 100, right: 200, top: 400, bottom: 430 }, size, viewport).fromBottom).toBe(false)
  })

  it('si no cabe a ningún lado (pantalla muy angosta) se queda dentro del margen', () => {
    const { x } = placeCard({ left: 20, right: 300, top: 100, bottom: 130 }, size, { width: 320, height: 700 })

    expect(x).toBeGreaterThanOrEqual(8)
    expect(x + 280).toBeLessThanOrEqual(320 - 8)
  })
})
