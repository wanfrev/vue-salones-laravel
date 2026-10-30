import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgendaPeriodSummary from './AgendaPeriodSummary.vue'

const items = (props: { total: number; pending: number; occupancy: number | null }) =>
  mount(AgendaPeriodSummary, { props }).findAll('p > span')

describe('AgendaPeriodSummary', () => {
  it('muestra citas, ocupación y pendientes', () => {
    expect(items({ total: 40, pending: 10, occupancy: 80 }).map(s => s.text())).toEqual(['40 citas', '80% ocupación', '10 pendientes'])
  })

  it('oculta la ocupación cuando no aplica', () => {
    expect(items({ total: 3, pending: 0, occupancy: null }).map(s => s.text())).toEqual(['3 citas', '0 pendientes'])
  })

  it('una ocupación de 0 % sí se muestra (no es lo mismo que «no aplica»)', () => {
    expect(items({ total: 0, pending: 0, occupancy: 0 }).map(s => s.text())).toContain('0% ocupación')
  })

  it('usa el singular', () => {
    expect(items({ total: 1, pending: 1, occupancy: null }).map(s => s.text())).toEqual(['1 cita', '1 pendiente'])
  })

  it('marca en rojo los pendientes solo si hay', () => {
    expect(items({ total: 2, pending: 1, occupancy: null })[1].classes()).toContain('text-danger')
    expect(items({ total: 2, pending: 0, occupancy: null })[1].classes()).not.toContain('text-danger')
  })
})
