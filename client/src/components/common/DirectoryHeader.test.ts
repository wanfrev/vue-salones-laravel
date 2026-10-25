import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const s = vi.hoisted(() => ({
  multi: false,
  branch: null as { name: string } | null,
}))

vi.mock('../../store/business', () => ({
  useBusinessStore: () => ({
    get isMultiBranch() { return s.multi },
    get currentBranch() { return s.branch },
    hasCapability: () => false,
  }),
}))

import DirectoryHeader from './DirectoryHeader.vue'

const render = (total: number, over: Record<string, string> = {}, slot = '') =>
  mount(DirectoryHeader, { props: { title: 'Clientes', singular: 'cliente', plural: 'clientes', total, ...over }, slots: slot ? { default: slot } : {} })
const label = (w: ReturnType<typeof render>) => w.get('[data-testid="directory-total-label"]').text()

beforeEach(() => {
  s.multi = false
  s.branch = null
})

describe('DirectoryHeader', () => {
  it('con una sola sucursal, el total es el del negocio', () => {
    const w = render(64)
    expect(w.get('[data-testid="directory-total"]').text()).toBe('64')
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

  it('concuerda en singular y usa los sustantivos que le pasan', () => {
    expect(label(render(1))).toBe('1 cliente registrado en el negocio')
    const w = render(12, { title: 'Pacientes', singular: 'paciente', plural: 'pacientes' })
    expect(label(w)).toBe('12 pacientes registrados en el negocio')
    expect(w.get('h1').text()).toBe('Pacientes')
    expect(label(render(1, { singular: 'empleado', plural: 'empleados' }))).toBe('1 empleado registrado en el negocio')
  })

  it('un directorio vacío muestra 0', () => {
    expect(render(0).get('[data-testid="directory-total"]').text()).toBe('0')
    expect(label(render(0))).toBe('0 clientes registrados en el negocio')
  })

  it('deja un hueco para los botones de acción, y no lo dibuja si no hay', () => {
    expect(render(3, {}, '<button>Nuevo cliente</button>').find('button').text()).toBe('Nuevo cliente')
    expect(render(3).find('button').exists()).toBe(false)
  })
})
