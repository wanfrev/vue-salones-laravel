import { describe, it, expect } from 'vitest'
import { quickActions, rescheduledRange, whatsappUrl } from './quickActions'

const base = { status: 'pending', isGroup: false, phone: '+58 414 1234567', isDental: false, checkedIn: false, clientId: 'c1' }

describe('whatsappUrl', () => {
  it('formato internacional, con símbolos y espacios', () => {
    expect(whatsappUrl('+58 414-1234567')).toBe('https://wa.me/584141234567')
  })

  it('formato local venezolano: se le pone el código de país', () => {
    expect(whatsappUrl('0414 1234567')).toBe('https://wa.me/584141234567')
  })

  it('con texto de saludo codificado', () => {
    expect(whatsappUrl('+584141234567', 'Hola María, ¿confirmas tu cita?')).toBe('https://wa.me/584141234567?text=Hola%20Mar%C3%ADa%2C%20%C2%BFconfirmas%20tu%20cita%3F')
  })

  it('sin número usable no hay enlace (teléfono oculto, vacío o demasiado corto)', () => {
    expect(whatsappUrl('')).toBeNull()
    expect(whatsappUrl(null)).toBeNull()
    expect(whatsappUrl('123')).toBeNull()
  })
})

describe('quickActions', () => {
  it('una cita pendiente se puede confirmar, cobrar, reprogramar y escribirle', () => {
    expect(quickActions(base)).toEqual({ confirm: true, pay: true, checkIn: null, reschedule: true, whatsappUrl: 'https://wa.me/584141234567' })
  })

  it('una cita ya confirmada no ofrece confirmar', () => {
    expect(quickActions({ ...base, status: 'confirmed' }).confirm).toBe(false)
  })

  it('pagada o cancelada: ya no se cobra ni se reprograma', () => {
    for (const status of ['paid', 'cancelled', 'no_show']) {
      const a = quickActions({ ...base, status })
      expect(a.pay).toBe(false)
      expect(a.reschedule).toBe(false)
    }
  })

  it('una visita con varios servicios no se reprograma desde aquí (se partiría el grupo)', () => {
    expect(quickActions({ ...base, isGroup: true }).reschedule).toBe(false)
  })

  it('la sala de espera solo existe en odontología y alterna entrar/salir', () => {
    expect(quickActions({ ...base, isDental: true }).checkIn).toBe('in')
    expect(quickActions({ ...base, isDental: true, checkedIn: true }).checkIn).toBe('out')
    expect(quickActions({ ...base, isDental: true, clientId: null }).checkIn).toBeNull()
  })
})

describe('rescheduledRange', () => {
  it('mueve la cita a otro día y hora conservando su duración', () => {
    const r = rescheduledRange('2026-10-31T09:00:00.000Z', '2026-10-31T10:30:00.000Z', '2026-11-02', '14:00')!

    expect(new Date(r.end).getTime() - new Date(r.start).getTime()).toBe(90 * 60_000)
    expect(new Date(r.start).getTime()).toBe(new Date('2026-11-02T14:00:00').getTime())
  })

  it('fecha u hora inválida, o duración rota: no hay movimiento', () => {
    expect(rescheduledRange('2026-10-31T09:00:00.000Z', '2026-10-31T10:00:00.000Z', '2026-99-99', '14:00')).toBeNull()
    expect(rescheduledRange('2026-10-31T10:00:00.000Z', '2026-10-31T09:00:00.000Z', '2026-11-02', '14:00')).toBeNull()
  })
})
