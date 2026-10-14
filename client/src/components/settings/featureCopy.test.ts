import { describe, expect, it } from 'vitest'
import { groupCopy, sectionCopy, termsFrom, toggleCopy } from './featureCopy'

describe('termsFrom', () => {
  it('lowercases the niche terminology', () => {
    const t = termsFrom({ client: 'Paciente', clientPlural: 'Pacientes', appointment: 'Consulta', appointmentPlural: 'Consultas' })
    expect(t.client).toBe('paciente')
    expect(t.appointments).toBe('consultas')
  })

  it('falls back to neutral words when the niche defines none', () => {
    const t = termsFrom(undefined)
    expect([t.client, t.clients, t.employee, t.employees, t.appointment, t.appointments, t.service, t.services])
      .toEqual(['cliente', 'clientes', 'empleado', 'empleados', 'cita', 'citas', 'servicio', 'servicios'])
  })
})

describe('toggleCopy', () => {
  const copy = toggleCopy(termsFrom({ client: 'Paciente', clientPlural: 'Pacientes', employee: 'Terapeuta', employeePlural: 'Terapeutas' }))

  it('gives every setting a label, a hint and both toast messages', () => {
    for (const [key, c] of Object.entries(copy)) {
      for (const field of ['label', 'hint', 'on', 'off'] as const) {
        expect(c[field].trim().length, `${key}.${field}`).toBeGreaterThan(8)
        expect(c[field], `${key}.${field}`).not.toMatch(/undefined|\[object/)
      }
    }
  })

  it('uses the business own words inside the sentences', () => {
    expect(copy.encargados_edit_clients.label).toBe('Permitir editar pacientes')
    expect(copy.employees_recibo_only.label).toBe('Los terapeutas solo ven su recibo')
  })
})

describe('sectionCopy / groupCopy', () => {
  const t = termsFrom(undefined)

  it('titles every page and group', () => {
    for (const s of Object.values(sectionCopy(t))) {
      expect(s.title.length).toBeGreaterThan(3)
      expect(s.description.length).toBeGreaterThan(30)
    }
    for (const g of Object.values(groupCopy(t))) {
      expect(g.title.length).toBeGreaterThan(3)
      expect(g.description.length).toBeGreaterThan(20)
    }
  })

  it('capitalizes the employees group title', () => {
    expect(groupCopy(t).employees.title).toBe('Empleados')
  })
})
