import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppointmentQuickActions from './AppointmentQuickActions.vue'

const appt = (over: Record<string, unknown> = {}) => ({
  status: 'pending', isGroup: false, clientId: 'c1', phone: '0414 1234567', checkedIn: false,
  startIso: '2026-10-31T09:00:00.000Z', endIso: '2026-10-31T10:30:00.000Z', ...over,
})
const mountIt = (a = appt(), isDental = false) => mount(AppointmentQuickActions, { props: { appt: a, isDental } })

describe('AppointmentQuickActions', () => {
  it('ofrece confirmar, cobrar, reprogramar y WhatsApp en una cita pendiente', () => {
    const w = mountIt()

    for (const id of ['confirm', 'pay', 'reschedule', 'whatsapp']) expect(w.find(`[data-testid="qa-${id}"]`).exists(), id).toBe(true)
    expect(w.find('[data-testid="qa-checkin"]').exists()).toBe(false)
    expect(w.find('[data-testid="qa-whatsapp"]').attributes('href')).toBe('https://wa.me/584141234567')
  })

  it('confirmar y cobrar emiten su evento', async () => {
    const w = mountIt()

    await w.find('[data-testid="qa-confirm"]').trigger('click')
    await w.find('[data-testid="qa-pay"]').trigger('click')

    expect(w.emitted('confirm')).toHaveLength(1)
    expect(w.emitted('pay')).toHaveLength(1)
  })

  it('reprogramar abre día y hora con los de la cita y emite el nuevo rango conservando la duración', async () => {
    const w = mountIt()

    await w.find('[data-testid="qa-reschedule"]').trigger('click')
    expect(w.find('[data-testid="qa-reschedule-form"]').exists()).toBe(true)

    const [dateInput, timeInput] = w.findAll('[data-testid="qa-reschedule-form"] input')
    await dateInput.setValue('2026-11-02')
    await timeInput.setValue('14:00')
    await w.find('[data-testid="qa-move"]').trigger('click')

    const [range] = w.emitted('reschedule')![0] as [{ start: string; end: string }]
    expect(new Date(range.start).getTime()).toBe(new Date('2026-11-02T14:00:00').getTime())
    expect(new Date(range.end).getTime() - new Date(range.start).getTime()).toBe(90 * 60_000)
  })

  it('no deja mover con la fecha vacía', async () => {
    const w = mountIt()
    await w.find('[data-testid="qa-reschedule"]').trigger('click')
    const [dateInput] = w.findAll('[data-testid="qa-reschedule-form"] input')
    await dateInput.setValue('')

    expect(w.find('[data-testid="qa-move"]').attributes('disabled')).toBeDefined()
    await w.find('[data-testid="qa-move"]').trigger('click')
    expect(w.emitted('reschedule')).toBeUndefined()
  })

  it('visita con varios servicios: sin reprogramar; pagada: sin cobrar ni reprogramar', () => {
    const group = mountIt(appt({ isGroup: true }))
    expect(group.find('[data-testid="qa-reschedule"]').exists()).toBe(false)

    const paid = mountIt(appt({ status: 'paid' }))
    expect(paid.find('[data-testid="qa-pay"]').exists()).toBe(false)
    expect(paid.find('[data-testid="qa-reschedule"]').exists()).toBe(false)
  })

  it('sala de espera solo en odontología, y no hay WhatsApp si el teléfono está oculto', async () => {
    const w = mountIt(appt({ phone: '' }), true)

    expect(w.find('[data-testid="qa-whatsapp"]').exists()).toBe(false)
    await w.find('[data-testid="qa-checkin"]').trigger('click')
    expect(w.emitted('checkIn')![0]).toEqual([true])
  })
})
