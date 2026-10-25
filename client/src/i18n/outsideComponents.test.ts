import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { localizeDateText } from './dateWords'
import { setLocale } from './index'
import { translateError, handleDbError } from '../lib/errors'
import { useFormValidation } from '../composables/common/useFormValidation'
import { empleadoFormSchema } from '../lib/validation'
import { useBusinessStore } from '../store/business'
import { ref } from 'vue'

/** Starts an app (so Pinia is active, as in the real app) with a business of the given niche. */
const startApp = (niche: string) => {
  const pinia = createPinia()
  const app = createApp(defineComponent({ render: () => h('div') }))
  app.use(pinia).use(VueQueryPlugin, { queryClient: new QueryClient() })
  useBusinessStore(pinia).$patch({ business: { id: 'b1', niche_type: niche } } as any)
  app.mount(document.createElement('div'))
}

describe('textos de períodos (fechas)', () => {
  it('en español no cambia nada', () => {
    expect(localizeDateText('Lunes 12 Octubre', 'es')).toBe('Lunes 12 Octubre')
  })

  it('en inglés traduce días, meses, semanas y años', () => {
    expect(localizeDateText('Lunes 12 Octubre', 'en')).toBe('Monday 12 October')
    expect(localizeDateText('Miércoles 3 Septiembre', 'en')).toBe('Wednesday 3 September')
    expect(localizeDateText('Sem 42 · 12 Ene - 18 Abr', 'en')).toBe('Wk 42 · 12 Jan - 18 Apr')
    expect(localizeDateText('Año 2026', 'en')).toBe('Year 2026')
    expect(localizeDateText('Rango personalizado', 'en')).toBe('Custom range')
    expect(localizeDateText('Q3 2026 · Jul - Sep', 'en')).toBe('Q3 2026 · Jul - Sep')
  })
})

describe('mensajes de error y de validación fuera de los componentes', () => {
  beforeEach(() => { localStorage.clear(); setLocale('es') })

  it('en español los mensajes son exactamente los de siempre', () => {
    startApp('staffing')
    expect(translateError(new DOMException('x', 'AbortError'))).toBe('La operación tardó demasiado. Verifica tu conexión a internet e intenta de nuevo.')
    expect(translateError({ foo: 1 })).toBe('Error inesperado al procesar la solicitud.')
    expect(() => handleDbError({ code: '23505' }, 'x')).toThrow('Este registro ya existe.')
  })

  it('en inglés (negocio de staffing) se traducen', () => {
    startApp('staffing')
    setLocale('en')
    expect(translateError(new DOMException('x', 'AbortError'))).toBe('The operation took too long. Check your internet connection and try again.')
    expect(translateError({ foo: 1 })).toBe('Unexpected error while processing the request.')
    expect(() => handleDbError({ code: '23505' }, 'x')).toThrow('This record already exists.')
    expect(translateError(new Error('The file field must be a file of type: pdf, jpg.'))).toBe('Unsupported file format. Use PDF, JPG, PNG, HEIC or WEBP.')
  })

  it('en otro nicho siguen en español aunque el navegador tenga inglés guardado', () => {
    startApp('salon')
    setLocale('en')
    expect(translateError({ foo: 1 })).toBe('Error inesperado al procesar la solicitud.')
  })

  it('un mensaje del servidor que no conocemos se muestra tal cual', () => {
    startApp('staffing')
    setLocale('en')
    expect(translateError(new Error('Mensaje del servidor'))).toBe('Mensaje del servidor')
  })

  it('los errores de los formularios también cambian de idioma', () => {
    startApp('staffing')
    const form = ref({ name: '', email: 'no-es-email', password: '', role: '', systemRole: '', payType: 'percentage', payPercentage: 0, baseSalary: 0, color: '#000' })
    const es = useFormValidation(empleadoFormSchema as any, form as any) as any
    es.validate()
    expect(es.errors.value.name).toBe('El nombre es obligatorio')
    expect(es.errors.value.email).toBe('El email no es válido')

    setLocale('en')
    const en = useFormValidation(empleadoFormSchema as any, form as any) as any
    en.validate()
    expect(en.errors.value.name).toBe('The name is required')
    expect(en.errors.value.email).toBe('The email is not valid')
  })
})
