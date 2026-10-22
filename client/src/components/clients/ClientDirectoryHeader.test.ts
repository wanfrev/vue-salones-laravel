import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const s = vi.hoisted(() => ({
  multi: false,
  branch: null as { name: string } | null,
  terminology: { client: 'Cliente', clientPlural: 'Clientes' } as Record<string, string>,
}))

vi.mock('../../store/business', () => ({
  useBusinessStore: () => ({
    get isMultiBranch() { return s.multi },
    get currentBranch() { return s.branch },
    get terminology() { return s.terminology },
  }),
}))

import ClientDirectoryHeader from './ClientDirectoryHeader.vue'

const render = (total: number, slot = '') => mount(ClientDirectoryHeader, { props: { total }, slots: { default: slot } })
const label = (w: ReturnType<typeof render>) => w.get('[data-testid="client-total-label"]').text()

beforeEach(() => {
  s.multi = false
  s.branch = null
  s.terminology = { client: 'Cliente', clientPlural: 'Clientes' }
})

describe('ClientDirectoryHeader', () => {
  it('con una sola sucursal, el total es el del negocio', () => {
    const w = render(64)
    expect(w.get('[data-testid="client-total"]').text()).toBe('64')
    expect(label(w)).toBe('64 clientes registrados en el negocio')
    expect(w.get('h1').text()).toBe('Clientes')
  })

  it('con varias sucursales, dice el nombre de la sucursal activa', () => {
    s.multi = true
    s.branch = { name: 'Centro' }
    expect(label(render(40))).toBe('40 clientes registrados en la sucursal Centro')
  })

  it('mientras la sucursal no ha cargado no afirma ningún alcance', () => {
    s.multi = true
    s.branch = null
    expect(label(render(40))).toBe('40 clientes registrados')
  })

  it('concuerda en singular y con la terminología del nicho', () => {
    expect(label(render(1))).toBe('1 cliente registrado en el negocio')
    s.terminology = { client: 'Paciente', clientPlural: 'Pacientes' }
    const w = render(12)
    expect(label(w)).toBe('12 pacientes registrados en el negocio')
    expect(w.get('h1').text()).toBe('Pacientes')
    expect(label(render(1))).toBe('1 paciente registrado en el negocio')
  })

  it('un directorio vacío muestra 0', () => {
    expect(render(0).get('[data-testid="client-total"]').text()).toBe('0')
    expect(label(render(0))).toBe('0 clientes registrados en el negocio')
  })

  it('deja un hueco para el botón de acción', () => {
    expect(render(3, '<button>Nuevo cliente</button>').find('button').text()).toBe('Nuevo cliente')
  })
})
