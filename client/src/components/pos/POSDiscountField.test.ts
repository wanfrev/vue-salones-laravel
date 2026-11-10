import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import POSDiscountField from './POSDiscountField.vue'

const mountIt = (props: Record<string, unknown> = {}) =>
  mount(POSDiscountField, {
    props: { percent: 0, amount: 0, base: 53, ...props },
    global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })

describe('POSDiscountField', () => {
  it('ofrece sin descuento, 5, 10 y 15 %; el elegido queda marcado', () => {
    const w = mountIt({ percent: 5, amount: 2.65 })
    const presets = w.findAll('[data-testid="pos-discount-preset"]')

    expect(presets.map(p => p.text())).toEqual(['Sin descuento', '5%', '10%', '15%'])
    expect(presets[1].classes()).toContain('border-primary')
    expect(presets[0].classes()).not.toContain('border-primary')
  })

  it('elegir un porcentaje lo emite, y «Sin descuento» emite 0', async () => {
    const w = mountIt()
    const presets = w.findAll('[data-testid="pos-discount-preset"]')

    await presets[2].trigger('click')
    await presets[0].trigger('click')

    expect(w.emitted('update:percent')).toEqual([[10], [0]])
  })

  it('un porcentaje escrito a mano se limita a 0–100 y lo inválido vuelve a sin descuento', async () => {
    const w = mountIt()
    const input = w.get('[data-testid="pos-discount-custom"]')

    for (const value of ['7.5', '250', '-3', 'abc', '']) await input.setValue(value)

    expect(w.emitted('update:percent')).toEqual([[7.5], [100], [0], [0], [0]])
  })

  it('un porcentaje que no es de los atajos aparece en «Otro»; uno de los atajos no', () => {
    expect((mountIt({ percent: 7.5, amount: 3.98 }).get('[data-testid="pos-discount-custom"]').element as HTMLInputElement).value).toBe('7.5')
    expect((mountIt({ percent: 5, amount: 2.65 }).get('[data-testid="pos-discount-custom"]').element as HTMLInputElement).value).toBe('')
  })

  it('con descuento explica cuánto se cobra y que la comisión sigue sobre el precio inicial', () => {
    const w = mountIt({ percent: 5, amount: 2.65 })

    expect(w.get('[data-testid="pos-discount-amount"]').text()).toBe('−$2.65')
    const note = w.get('[data-testid="pos-discount-note"]').text()
    expect(note).toContain('$50.35 en vez de $53.00')
    expect(note).toContain('La comisión sigue calculándose sobre $53.00')
  })

  it('sin descuento no muestra montos ni la aclaración', () => {
    const w = mountIt()
    expect(w.find('[data-testid="pos-discount-amount"]').exists()).toBe(false)
    expect(w.find('[data-testid="pos-discount-note"]').exists()).toBe(false)
  })
})
