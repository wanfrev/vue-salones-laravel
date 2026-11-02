import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS, daysSince, daysSinceItem, filterAndSortClients, isFiltered, itemInfoLine, matchesItem, matchesSearch,
  matchesSegment, relativeVisit, segmentCounts, sortClients, visitDay, type ClientFilterState, type ClientItemMatch,
} from './clientFilters'
import type { Cliente } from '../../types/cliente'

const TODAY = new Date(2026, 9, 21) // 21 de octubre de 2026

const c = (over: Partial<Cliente> & { name: string }): Cliente => ({
  id: over.name, phone: '', email: '', joinDate: '2025-01-01', lastVisit: 'Sin visitas', totalAppointments: 0, ...over,
})

const ana = c({ name: 'Ana Pérez', phone: '+58 414-1234567', lastVisit: '2026-10-15', totalAppointments: 4, joinDate: '2025-03-01' })      // hace 6 días
const beto = c({ name: 'Beto Ruiz', phone: '0412 9998877', lastVisit: '2026-08-01', totalAppointments: 9, joinDate: '2024-06-10' })      // hace 81 días
const carla = c({ name: 'Carla Díaz', phone: '0424-5550000', lastVisit: 'Sin visitas', joinDate: '2026-10-10' })                         // nueva, nunca vino
const dora = c({ name: 'Dora Gil', code: 'P-0042', documentId: 'V-12345678', email: 'dora@mail.com', lastVisit: '2026-10-21', totalAppointments: 1, joinDate: '2026-01-05' })
const all = [ana, beto, carla, dora]

const state = (over: Partial<ClientFilterState> = {}): ClientFilterState => ({ ...DEFAULT_FILTERS, ...over })

describe('visitDay / daysSince', () => {
  it('lee la fecha de la última visita y trata «Sin visitas» como ninguna', () => {
    expect(visitDay(ana)).toBe('2026-10-15')
    expect(visitDay(carla)).toBeNull()
    expect(visitDay({ lastVisit: undefined })).toBeNull()
    expect(visitDay({ lastVisit: 'basura' })).toBeNull()
  })

  it('cuenta días completos desde hoy', () => {
    expect(daysSince('2026-10-21', TODAY)).toBe(0)
    expect(daysSince('2026-10-20', TODAY)).toBe(1)
    expect(daysSince('2026-09-21', TODAY)).toBe(30)
    expect(daysSince('nada', TODAY)).toBeNull()
  })
})

describe('segmentos', () => {
  it('activos: vinieron dentro de la ventana; inactivos: vinieron, pero antes', () => {
    expect(matchesSegment(ana, 'active', 30, TODAY)).toBe(true)
    expect(matchesSegment(beto, 'active', 30, TODAY)).toBe(false)
    expect(matchesSegment(beto, 'inactive', 30, TODAY)).toBe(true)
    expect(matchesSegment(beto, 'inactive', 90, TODAY)).toBe(false) // con 90 días sí está activo
    expect(matchesSegment(beto, 'active', 90, TODAY)).toBe(true)
  })

  it('quien nunca vino no es ni activo ni inactivo, sino «never»', () => {
    expect(matchesSegment(carla, 'active', 30, TODAY)).toBe(false)
    expect(matchesSegment(carla, 'inactive', 30, TODAY)).toBe(false)
    expect(matchesSegment(carla, 'never', 30, TODAY)).toBe(true)
    expect(matchesSegment(ana, 'never', 30, TODAY)).toBe(false)
  })

  it('nuevos: registrados en los últimos 30 días', () => {
    expect(matchesSegment(carla, 'new', 30, TODAY)).toBe(true)
    expect(matchesSegment(ana, 'new', 30, TODAY)).toBe(false)
    expect(matchesSegment(c({ name: 'X' , joinDate: undefined }), 'new', 30, TODAY)).toBe(false)
  })

  it('cuenta cada segmento', () => {
    expect(segmentCounts(all, 30, TODAY)).toEqual({ all: 4, active: 2, inactive: 1, never: 1, new: 1 })
    expect(segmentCounts(all, 90, TODAY)).toEqual({ all: 4, active: 3, inactive: 0, never: 1, new: 1 })
  })
})

describe('búsqueda', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(matchesSearch(ana, 'PEREZ')).toBe(true)
    expect(matchesSearch(carla, 'diaz')).toBe(true)
    expect(matchesSearch(ana, 'beto')).toBe(false)
  })

  it('busca por correo, código y documento', () => {
    expect(matchesSearch(dora, 'dora@mail')).toBe(true)
    expect(matchesSearch(dora, 'p-0042')).toBe(true)
    expect(matchesSearch(dora, '12345678')).toBe(true)
  })

  it('el teléfono se encuentra sin importar +, espacios o guiones', () => {
    expect(matchesSearch(ana, '4141234567')).toBe(true)
    expect(matchesSearch(ana, '+58 414 123')).toBe(true)
    expect(matchesSearch(beto, '9998877')).toBe(true)
    expect(matchesSearch(beto, '99')).toBe(false) // menos de 3 dígitos no busca por teléfono
  })

  it('búsqueda vacía deja pasar a todos', () => {
    expect(all.every(x => matchesSearch(x, '   '))).toBe(true)
  })
})

describe('orden', () => {
  const names = (list: Cliente[]) => list.map(x => x.name)

  it('por registro: reciente y antiguo', () => {
    expect(names(sortClients(all, 'recent'))).toEqual(['Carla Díaz', 'Dora Gil', 'Ana Pérez', 'Beto Ruiz'])
    expect(names(sortClients(all, 'oldest'))).toEqual(['Beto Ruiz', 'Ana Pérez', 'Dora Gil', 'Carla Díaz'])
  })

  it('por nombre A-Z', () => {
    expect(names(sortClients([dora, carla, beto, ana], 'name'))).toEqual(['Ana Pérez', 'Beto Ruiz', 'Carla Díaz', 'Dora Gil'])
  })

  it('por última visita: la más reciente arriba y los que nunca vinieron al final', () => {
    expect(names(sortClients(all, 'lastVisit'))).toEqual(['Dora Gil', 'Ana Pérez', 'Beto Ruiz', 'Carla Díaz'])
  })

  it('por más visitas', () => {
    expect(names(sortClients(all, 'visits'))).toEqual(['Beto Ruiz', 'Ana Pérez', 'Dora Gil', 'Carla Díaz'])
  })

  it('no modifica el arreglo original', () => {
    const copy = [...all]
    sortClients(all, 'name')
    expect(all).toEqual(copy)
  })
})

describe('filterAndSortClients / isFiltered', () => {
  it('combina búsqueda, segmento y orden', () => {
    const r = filterAndSortClients(all, state({ segment: 'active', sort: 'name' }), TODAY)
    expect(r.map(x => x.name)).toEqual(['Ana Pérez', 'Dora Gil'])
    expect(filterAndSortClients(all, state({ search: 'ana', segment: 'active' }), TODAY).map(x => x.name)).toEqual(['Ana Pérez'])
    expect(filterAndSortClients(all, state({ search: 'ana', segment: 'inactive' }), TODAY)).toEqual([])
  })

  it('el orden solo no cuenta como filtro; la búsqueda o un segmento sí', () => {
    expect(isFiltered(state({ sort: 'name' }))).toBe(false)
    expect(isFiltered(state({ search: ' ' }))).toBe(false)
    expect(isFiltered(state({ search: 'a' }))).toBe(true)
    expect(isFiltered(state({ segment: 'never' }))).toBe(true)
  })
})

describe('relativeVisit', () => {
  it('lo dice en palabras', () => {
    expect(relativeVisit(null, TODAY)).toBe('')
    expect(relativeVisit('2026-10-21', TODAY)).toBe('hoy')
    expect(relativeVisit('2026-10-20', TODAY)).toBe('ayer')
    expect(relativeVisit('2026-10-15', TODAY)).toBe('hace 6 días')
    expect(relativeVisit('2026-08-21', TODAY)).toBe('hace 2 meses')
    expect(relativeVisit('2026-09-15', TODAY)).toBe('hace 1 mes')
    expect(relativeVisit('2025-09-01', TODAY)).toBe('hace 1 año')
    expect(relativeVisit('2023-01-01', TODAY)).toBe('hace 3 años')
  })

  it('una fecha futura no genera texto', () => {
    expect(relativeVisit('2026-11-01', TODAY)).toBe('')
  })
})

describe('filtro por producto o servicio', () => {
  // Mediodía local: el día calendario no cambia aunque el huso horario mueva unas horas.
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()
  function match(id: string, last: string, over: Partial<ClientItemMatch> = {}): ClientItemMatch {
    return { client_id: id, last_at: last, first_at: last, times: 1, last_item: 'Tinte', ...over }
  }

  // Ana: hace 6 días · Beto: hace 81 días · Carla y Dora no lo han hecho.
  const matches = new Map([
    [ana.id, match(ana.id, at(2026, 10, 15), { times: 3 })],
    [beto.id, match(beto.id, at(2026, 8, 1))],
  ])
  const names = (r: Cliente[]) => r.map(x => x.name).sort()

  it('«lo compraron o se lo hicieron»: solo quienes están en las coincidencias del servidor', () => {
    const r = filterAndSortClients(all, state({ item: 'tinte' }), TODAY, matches)
    expect(names(r)).toEqual(['Ana Pérez', 'Beto Ruiz'])
  })

  it('«no han vuelto desde hace N días»: lo hicieron, pero la última vez fue hace más de N', () => {
    expect(names(filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 60 }), TODAY, matches))).toEqual(['Beto Ruiz'])
    expect(names(filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 90 }), TODAY, matches))).toEqual([])
    expect(names(filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 30 }), TODAY, matches))).toEqual(['Beto Ruiz'])
  })

  it('quien nunca lo hizo no aparece en «no han vuelto» (no puede «volver» a algo que no hizo)', () => {
    const r = filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 30 }), TODAY, matches)
    expect(r.map(x => x.name)).not.toContain('Carla Díaz')
    expect(r.map(x => x.name)).not.toContain('Dora Gil')
  })

  it('el límite es estricto: hace exactamente N días todavía no cuenta como «sin volver»', () => {
    const exactly = new Map([[ana.id, match(ana.id, at(2026, 8, 22))]]) // 60 días antes del 21/10
    expect(daysSinceItem(exactly.get(ana.id)!, TODAY)).toBe(60)
    expect(filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 60 }), TODAY, exactly)).toEqual([])
    expect(filterAndSortClients(all, state({ item: 'tinte', itemMode: 'lapsed', itemDays: 59 }), TODAY, exactly)).toEqual([ana])
  })

  it('con el filtro activo y sin respuesta todavía no muestra a nadie (no la lista completa)', () => {
    expect(filterAndSortClients(all, state({ item: 'tinte' }), TODAY, null)).toEqual([])
  })

  it('con menos de 2 letras el filtro no se activa y se ignoran las coincidencias', () => {
    expect(filterAndSortClients(all, state({ item: 't' }), TODAY, matches)).toHaveLength(4)
    expect(filterAndSortClients(all, state({ item: '  ' }), TODAY, null)).toHaveLength(4)
    expect(isFiltered(state({ item: 't' }))).toBe(false)
    expect(isFiltered(state({ item: 'ti' }))).toBe(true)
  })

  it('se combina con búsqueda, segmento y orden', () => {
    expect(names(filterAndSortClients(all, state({ item: 'tinte', search: 'ana' }), TODAY, matches))).toEqual(['Ana Pérez'])
    expect(names(filterAndSortClients(all, state({ item: 'tinte', segment: 'inactive' }), TODAY, matches))).toEqual(['Beto Ruiz'])
    expect(filterAndSortClients(all, state({ item: 'tinte', sort: 'name' }), TODAY, matches).map(x => x.name)).toEqual(['Ana Pérez', 'Beto Ruiz'])
  })

  it('los conteos de los segmentos no dependen del filtro por producto', () => {
    expect(segmentCounts(all, 30, TODAY)).toEqual({ all: 4, active: 2, inactive: 1, never: 1, new: 1 })
  })

  it('una coincidencia sin fecha válida no se considera «sin volver»', () => {
    expect(matchesItem({ client_id: 'x', last_at: null, first_at: null, times: 1, last_item: null }, { itemMode: 'lapsed', itemDays: 30 }, TODAY)).toBe(false)
    expect(matchesItem(undefined, { itemMode: 'did', itemDays: 30 }, TODAY)).toBe(false)
  })

  it('itemInfoLine dice qué fue, cuándo y cuántas veces', () => {
    expect(itemInfoLine(matches.get(ana.id)!, TODAY)).toBe('Tinte · hace 6 días · 3 veces')
    expect(itemInfoLine(matches.get(beto.id)!, TODAY)).toBe('Tinte · hace 2 meses · 1 vez')
    expect(itemInfoLine(match('z', at(2026, 10, 21), { last_item: null }), TODAY)).toBe('hoy · 1 vez')
  })
})
