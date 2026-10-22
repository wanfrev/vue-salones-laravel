import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import TeamDirectory from './TeamDirectory.vue'
import type { Empleado } from '../../types/empleado'

// El store del negocio usa TanStack Query: el montaje necesita su plugin además de Pinia.
const plugins = (): any[] => [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]]

const emp = (over: Partial<Empleado> & { name: string }): Empleado => ({
  id: over.name, role: 'Estilista', citasHoy: 0, producido: '0', payType: 'percentage',
  payTypeLabel: 'Porcentaje', payValueLabel: '50% por servicio', email: '', active: true, ...over,
})

const lucia = emp({ name: 'Lucía Pérez', role: 'Colorista', email: 'lucia@salon.com' })
const mario = emp({ name: 'Mario Díaz', role: 'Barbero', payType: 'salary', payTypeLabel: 'Sueldo base', payValueLabel: '$200 mensual', active: false })

const base = {
  employees: [lucia, mario], stats: { percentage: 4, salaryBase: 3, mixed: 2 }, search: '', status: 'active',
  isStaffing: false, showAgenda: true, hasMore: false, showAll: false, totalCount: 2,
}
const mountDir = (props: Record<string, unknown> = {}) => mount(TeamDirectory, { props: { ...base, ...props } as any, global: { plugins: plugins() } })
const rows = (w: ReturnType<typeof mountDir>) => w.findAll('[data-testid="team-row"]')

describe('TeamDirectory (solo presentación: la lógica vive en Equipo.vue)', () => {
  it('lista a cada empleado con su cargo, correo y forma de pago', () => {
    const w = mountDir()
    expect(rows(w)).toHaveLength(2)
    const text = rows(w)[0].text()
    expect(text).toContain('Lucía Pérez')
    expect(text).toContain('Colorista · lucia@salon.com')
    expect(text).toContain('Porcentaje')
    expect(text).toContain('50% por servicio')
  })

  it('marca a quien está desactivado', () => {
    const w = mountDir()
    expect(rows(w)[1].text()).toContain('Inactivo')
    expect(rows(w)[0].text()).not.toContain('Inactivo')
  })

  it('muestra las tres cifras de forma de pago tal como llegan (solo informativas, no filtran)', async () => {
    const w = mountDir()
    const stats = w.get('[data-testid="pay-stats"]')
    expect(stats.text()).toBe('Con % 4Sueldo base 3Sueldo + % 2')
    expect(stats.findAll('button')).toHaveLength(0)
    expect(w.find('input').exists()).toBe(false) // sin búsqueda fuera de los negocios de personal
  })

  it('negocios de personal: estado activo/inactivo y búsqueda, sin las cifras de pago', async () => {
    const w = mountDir({ isStaffing: true })
    expect(w.find('[data-testid="pay-stats"]').exists()).toBe(false)
    const tabs = w.findAll('[role="tab"]')
    expect(tabs.map(t => t.text())).toEqual(['Activos', 'Inactivos', 'Todos'])
    await tabs[1].trigger('click')
    expect(w.emitted('update:status')![0]).toEqual(['inactive'])
    await w.find('input').setValue('lucia')
    expect(w.emitted('update:search')![0]).toEqual(['lucia'])
  })

  it('en negocios de personal muestra TODAS las empresas asignadas', () => {
    const obrero = emp({ name: 'Juan Obrero', staffingAssignments: [
      { companyId: 'c1', companyName: 'Constructora Ávila', role: 'Albañil' },
      { companyId: 'c2', companyName: 'Hotel Plaza', role: 'Mantenimiento' },
      { companyId: 'c3', companyName: 'Clínica Sur', role: 'Limpieza' },
    ] })
    const w = mountDir({ isStaffing: true, employees: [obrero, emp({ name: 'Sin Empresa' })] })
    expect(rows(w)[0].text()).toContain('Constructora Ávila')
    expect(rows(w)[0].text()).toContain('Hotel Plaza')
    expect(rows(w)[0].text()).toContain('Clínica Sur')
    expect(rows(w)[1].text()).toContain('Sin empresa asignada')
  })

  it('la fila NO es clicable (como las tarjetas de antes): solo los botones actúan', async () => {
    const w = mountDir()
    await rows(w)[0].trigger('click')
    const acciones = Object.keys(w.emitted()).filter(k => k !== 'click') // «click» es el evento nativo del DOM
    expect(acciones).toEqual([]) // un clic en la fila no dispara ninguna acción
  })

  it('cada botón emite su acción con el empleado correcto', async () => {
    const w = mountDir()
    await w.find('button[aria-label="Ver agenda"]').trigger('click')
    await w.find('button[aria-label="Ver información"]').trigger('click')
    await w.find('button[aria-label="Imprimir recibo de pago"]').trigger('click')
    await w.find('button[aria-label="Editar empleado"]').trigger('click')
    expect(w.emitted('viewAgenda')![0]).toEqual([lucia])
    expect(w.emitted('viewInfo')![0]).toEqual([lucia])
    expect(w.emitted('viewRecibo')![0]).toEqual([lucia])
    expect(w.emitted('edit')![0]).toEqual([lucia])
  })

  it('el botón de agenda solo aparece si el negocio usa agenda', () => {
    expect(mountDir({ showAgenda: false }).find('button[aria-label="Ver agenda"]').exists()).toBe(false)
  })

  it('activar o desactivar (personal) emite toggleActive', async () => {
    const w = mountDir({ isStaffing: true })
    await rows(w)[1].find('button[title^="Activar"]').trigger('click')
    expect(w.emitted('toggleActive')![0]).toEqual([mario])
  })

  it('«Ver todos (N)» y «Ver menos» como siempre', async () => {
    const closed = mountDir({ hasMore: true, totalCount: 9 })
    const toggle = closed.findAll('button').find(b => b.text() === 'Ver todos (9)')!
    await toggle.trigger('click')
    expect(closed.emitted('toggleShowAll')).toHaveLength(1)
    expect(mountDir({ hasMore: true, showAll: true }).text()).toContain('Ver menos')
    expect(mountDir({ hasMore: false }).text()).not.toContain('Ver todos')
  })

  it('una búsqueda sin resultados dice a quién buscó, y sin empleados lo explica', () => {
    const w = mountDir({ isStaffing: true, search: ' zzz ', employees: [] })
    expect(w.text()).toContain('Ningún empleado coincide con "zzz".')
    expect(mountDir({ employees: [] }).text()).toContain('Todavía no hay empleados registrados')
  })
})
