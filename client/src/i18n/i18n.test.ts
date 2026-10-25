import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { interpolate, translate } from './translate'
import { messageCatalog, setLocale, useI18n } from './index'
import { useBusinessStore } from '../store/business'


const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()

describe('translate', () => {
  const catalog = { es: { a: 'Hola {name}', onlyEs: 'Solo español' }, en: { a: 'Hello {name}' } }

  it('rellena los {datos} y deja tal cual el que no tenga valor', () => {
    expect(interpolate('Hola {name}, {n} filas', { name: 'Ana', n: 3 })).toBe('Hola Ana, 3 filas')
    expect(interpolate('Hola {name}', {})).toBe('Hola {name}')
    expect(interpolate('Sin datos')).toBe('Sin datos')
  })

  it('traduce, y si falta en inglés usa el español (nunca muestra la clave)', () => {
    expect(translate(catalog, 'en', 'a', { name: 'Ana' })).toBe('Hello Ana')
    expect(translate(catalog, 'es', 'a', { name: 'Ana' })).toBe('Hola Ana')
    expect(translate(catalog, 'en', 'onlyEs')).toBe('Solo español')
    expect(translate(catalog, 'en', 'noExiste')).toBe('noExiste')
  })
})

describe('catálogo de mensajes', () => {
  it('cada texto en español tiene su versión en inglés, con los mismos {datos}', () => {
    const missing = Object.keys(messageCatalog.es).filter(k => !(k in messageCatalog.en))
    expect(missing).toEqual([])
    const extra = Object.keys(messageCatalog.en).filter(k => !(k in messageCatalog.es))
    expect(extra).toEqual([])
    for (const key of Object.keys(messageCatalog.es)) {
      expect(placeholders(messageCatalog.en[key]), key).toEqual(placeholders(messageCatalog.es[key]))
      expect(messageCatalog.en[key].trim().length, key).toBeGreaterThan(0)
    }
  })
})

describe('useI18n', () => {
  beforeEach(() => { localStorage.clear(); setLocale('es') })

  const harness = (niche: string) => {
    let api!: ReturnType<typeof useI18n>
    const pinia = createPinia()
    const app = createApp(defineComponent({ setup() { api = useI18n(); return () => h('div') } }))
    app.use(pinia).use(VueQueryPlugin, { queryClient: new QueryClient() })
    useBusinessStore(pinia).$patch({ business: { id: 'b1', niche_type: niche } } as any)
    app.mount(document.createElement('div'))
    return api
  }

  it('un negocio de staffing puede elegir inglés, y la elección se recuerda en el dispositivo', async () => {
    const i18n = harness('staffing')
    expect(i18n.canChooseLanguage.value).toBe(true)
    expect(i18n.t('nav.Nómina')).toBe('Nómina')
    i18n.setLocale('en')
    await nextTick()
    expect(i18n.t('nav.Nómina')).toBe('Payroll')
    expect(localStorage.getItem('luma_locale')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('cualquier otro nicho sigue en español aunque el navegador tenga inglés guardado', async () => {
    setLocale('en')
    const i18n = harness('salon')
    expect(i18n.canChooseLanguage.value).toBe(false)
    expect(i18n.locale.value).toBe('es')
    expect(i18n.t('nav.Nómina')).toBe('Nómina')
  })
})
