import { describe, it, expect, vi } from 'vitest'

// El enrutador importa las stores solo para sus guardas; aquí se evalúan las puertas (gate) de cada ruta a mano.
vi.mock('../store/auth', () => ({ useAuthStore: () => ({}) }))
vi.mock('../store/business', () => ({ useBusinessStore: () => ({}) }))

import router from './index'
import { evaluateGate } from './gate'
import { getNiche } from '../config/niches'
import type { FeatureKey } from '../config/features'
import type { AuthProfile } from '../types/auth'

/**
 * Un empleado debe poder abrir el expediente clínico de los pacientes (historia, sesiones, adjuntos...).
 * Se comprueba la ruta REAL: cada puerta de la cadena de rutas (la del padre y la de la pestaña) debe abrirse.
 */
const canOpen = (path: string, opts: { niche: string; profile?: Partial<AuthProfile>; disabledFeatures?: FeatureKey[] }): boolean => {
  const matched = router.resolve(path).matched
  if (matched.length === 0) return false
  const caps = getNiche(opts.niche as never).capabilities
  const ctx = {
    profile: { role: 'empleado', ...opts.profile } as AuthProfile,
    hasFeature: (k: FeatureKey) => !(opts.disabledFeatures ?? []).includes(k),
    hasCapability: (c: never) => (caps as readonly string[]).includes(c),
  }
  return matched.every(r => evaluateGate((r.meta as { gate?: never }).gate, ctx as never))
}

const TABS = ['historia', 'sesiones', 'plan', 'evaluaciones', 'consentimiento', 'informes', 'adjuntos', 'genograma', 'linea-de-vida', 'programas']
const tab = (t: string) => `/dashboard/clientes/c1/expediente-clinico/${t}`

describe('empleado en el nicho psicología', () => {
  it('ve la lista de pacientes y la ficha de cada uno', () => {
    expect(canOpen('/dashboard/clientes', { niche: 'psicologia' })).toBe(true)
    expect(canOpen('/dashboard/clientes/c1', { niche: 'psicologia' })).toBe(true)
  })

  it.each(TABS)('abre la pestaña «%s» del expediente (con el permiso por defecto)', t => {
    expect(canOpen(tab(t), { niche: 'psicologia' })).toBe(true)
  })

  it('pierde el expediente (pero no la lista de pacientes) si administración le apaga el permiso', () => {
    const profile = { can_access_dental_clinical: false }
    for (const t of TABS.filter(x => x !== 'programas')) expect(canOpen(tab(t), { niche: 'psicologia', profile }), t).toBe(false)
    expect(canOpen('/dashboard/clientes', { niche: 'psicologia', profile })).toBe(true)
  })

  it('no ve nada si el negocio no deja que los empleados vean clientes', () => {
    expect(canOpen(tab('historia'), { niche: 'psicologia', disabledFeatures: ['employees_see_clients'] })).toBe(false)
    expect(canOpen(tab('adjuntos'), { niche: 'psicologia', disabledFeatures: ['employees_see_clients'] })).toBe(false)
  })
})

describe('el expediente clínico sigue siendo exclusivo de psicología', () => {
  it.each(['barberia', 'odontologia', 'salon', 'spa', 'tienda'])('un empleado de %s no puede abrirlo', niche => {
    for (const t of TABS) expect(canOpen(tab(t), { niche }), `${niche}/${t}`).toBe(false)
  })
})
