import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import GeneralSettings from './GeneralSettings.vue'
import { setLocale } from '../../i18n'
import { useBusinessStore } from '../../store/business'

const mountFor = (niche: string) => {
  const pinia = createPinia()
  const wrapper = mount(GeneralSettings, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient: new QueryClient() }]] } })
  useBusinessStore(pinia).$patch({ business: { id: 'b1', niche_type: niche } } as any)
  return wrapper
}

describe('Idioma en Configuración > Cuenta y apariencia', () => {
  beforeEach(() => { localStorage.clear(); setLocale('es') })

  it('en un negocio de staffing se puede elegir idioma y los textos cambian', async () => {
    const w = mountFor('staffing')
    await w.vm.$nextTick()
    expect(w.find('[data-testid="language-picker"]').exists()).toBe(true)
    expect(w.text()).toContain('Tema de la pantalla')

    await w.findAll('[data-testid="language-picker"] button').find(b => b.text() === 'English')!.trigger('click')
    expect(w.text()).toContain('Screen theme')
    expect(w.text()).not.toContain('Tema de la pantalla')
    expect(localStorage.getItem('luma_locale')).toBe('en')
  })

  it('en cualquier otro nicho no aparece el selector y todo sigue en español', async () => {
    const w = mountFor('salon')
    await w.vm.$nextTick()
    expect(w.find('[data-testid="language-picker"]').exists()).toBe(false)
    expect(w.text()).toContain('Tema de la pantalla')
    expect(w.text()).toContain('Cambiar contraseña')
  })
})
