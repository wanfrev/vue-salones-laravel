import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import AppointmentHoverCard from './AppointmentHoverCard.vue'
import { useHoverCard } from './useHoverCard'
import { hoverSummary } from './hoverCard'

const at = (hh: number, m = 0) => new Date(2026, 9, 30, hh, m).getTime()
const source = { clientName: 'Samanta Gómez', service: 'Manicure gel', status: 'pending', employeeName: 'Kelly Soler', startMs: at(9), endMs: at(10) }
const anchor = { left: 100, right: 200, top: 50, bottom: 80 }

afterEach(() => { document.body.innerHTML = '' })

describe('AppointmentHoverCard', () => {
  it('no dibuja nada sin estado', () => {
    mount(AppointmentHoverCard, { props: { state: null }, attachTo: document.body })

    expect(document.querySelector('[data-testid="hover-card"]')).toBeNull()
  })

  it('muestra clienta, servicio, profesional y estado', async () => {
    mount(AppointmentHoverCard, { props: { state: { key: 'a', summary: hoverSummary(source), anchor } }, attachTo: document.body })
    await nextTick(); await nextTick()

    const text = document.querySelector('[data-testid="hover-card"]')!.textContent!
    expect(text).toContain('Samanta Gómez')
    expect(text).toContain('Manicure gel')
    expect(text).toContain('Kelly Soler')
    expect(text).toContain('9:00 AM – 10:00 AM')
  })

  it('no captura el puntero (no estorba el clic sobre la cita)', async () => {
    mount(AppointmentHoverCard, { props: { state: { key: 'a', summary: hoverSummary(source), anchor } }, attachTo: document.body })
    await nextTick()

    expect(document.querySelector('[data-testid="hover-card"]')!.className).toContain('pointer-events-none')
  })
})

describe('useHoverCard', () => {
  afterEach(() => vi.useRealTimers())

  function host(opts: Parameters<typeof useHoverCard>[0]) {
    let api!: ReturnType<typeof useHoverCard>
    mount(defineComponent({ setup() { api = useHoverCard(opts); return () => h('div') } }))
    return api
  }
  const el = { getBoundingClientRect: () => ({ left: 1, right: 2, top: 3, bottom: 4 }) } as unknown as Element

  it('muestra la tarjeta después del retraso y la cierra al salir', () => {
    vi.useFakeTimers()
    const api = host({ canHover: true })

    api.enter('a', () => source, el)
    expect(api.state.value).toBeNull()
    vi.advanceTimersByTime(140)
    expect(api.state.value?.summary.clientName).toBe('Samanta Gómez')
    expect(api.state.value?.anchor).toEqual({ left: 1, right: 2, top: 3, bottom: 4 })

    api.leave()
    vi.advanceTimersByTime(60)
    expect(api.state.value).toBeNull()
  })

  it('si el cursor sale antes del retraso no llega a mostrarse', () => {
    vi.useFakeTimers()
    const api = host({ canHover: true })

    api.enter('a', () => source, el)
    api.leave()
    vi.advanceTimersByTime(500)

    expect(api.state.value).toBeNull()
  })

  it('al pasar de una cita a la vecina cambia al instante, sin esperar otra vez', () => {
    vi.useFakeTimers()
    const api = host({ canHover: true })
    api.enter('a', () => source, el)
    vi.advanceTimersByTime(140)

    api.leave()
    api.enter('b', () => ({ ...source, clientName: 'Otra' }), el)
    vi.advanceTimersByTime(0)

    expect(api.state.value?.summary.clientName).toBe('Otra')
  })

  it('en pantallas táctiles (sin hover) no hace nada', () => {
    vi.useFakeTimers()
    const api = host({ canHover: false })

    api.enter('a', () => source, el)
    vi.advanceTimersByTime(1000)

    expect(api.state.value).toBeNull()
  })

  it('no se muestra mientras está suprimida (detalle abierto o arrastre)', () => {
    vi.useFakeTimers()
    const api = host({ canHover: true, suppressed: () => true })

    api.enter('a', () => source, el)
    vi.advanceTimersByTime(1000)

    expect(api.state.value).toBeNull()
  })

  it('hide() cierra de inmediato y cancela lo pendiente', () => {
    vi.useFakeTimers()
    const api = host({ canHover: true })
    api.enter('a', () => source, el)
    vi.advanceTimersByTime(140)

    api.hide()

    expect(api.state.value).toBeNull()
  })
})
