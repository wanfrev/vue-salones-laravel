import { describe, expect, it } from 'vitest'
import { countByNiche, countByStatus, filterBusinesses, sortBusinesses, type ListedBusiness } from './businessFilters'

const biz = (over: Partial<ListedBusiness> & { id: string; name: string }): ListedBusiness => ({
  slug: over.name.toLowerCase().replace(/\s+/g, '-'),
  niche_type: 'salon', active: true, deleted_at: null, created_at: '2026-01-01T00:00:00Z', ...over,
})

const list = [
  biz({ id: '1', name: 'Spa Mimosa', niche_type: 'spa', created_at: '2026-03-01T00:00:00Z' }),
  biz({ id: '2', name: 'Delta Work Force', niche_type: 'staffing', created_at: '2026-05-01T00:00:00Z' }),
  biz({ id: '3', name: 'Salón Ana', niche_type: 'salon', active: false, created_at: '2026-02-01T00:00:00Z' }),
  biz({ id: '4', name: 'Viejo Negocio', niche_type: 'salon', deleted_at: '2026-06-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }),
  biz({ id: '5', name: 'Sin Rubro', niche_type: null, created_at: '2026-04-01T00:00:00Z' }),
]
const f = (over: Partial<{ search: string; status: any; niche: string }> = {}) => ({ search: '', status: 'all' as const, niche: '', ...over })
const ids = (l: ListedBusiness[]) => l.map(b => b.id)

describe('filterBusinesses', () => {
  it('"Todos" hides deleted businesses; only "Eliminados" shows them', () => {
    expect(ids(filterBusinesses(list, f()))).toEqual(['1', '2', '3', '5'])
    expect(ids(filterBusinesses(list, f({ status: 'deleted' })))).toEqual(['4'])
  })

  it('separates active from suspended', () => {
    expect(ids(filterBusinesses(list, f({ status: 'active' })))).toEqual(['1', '2', '5'])
    expect(ids(filterBusinesses(list, f({ status: 'inactive' })))).toEqual(['3'])
  })

  it('filters by niche, including the "sin nicho" bucket', () => {
    expect(ids(filterBusinesses(list, f({ niche: 'salon' })))).toEqual(['3'])
    expect(ids(filterBusinesses(list, f({ niche: 'sin_nicho' })))).toEqual(['5'])
  })

  it('searches name, slug and niche label, ignoring case and spaces at the edges', () => {
    expect(ids(filterBusinesses(list, f({ search: '  MIMOSA ' })))).toEqual(['1'])
    expect(ids(filterBusinesses(list, f({ search: 'delta-work' })))).toEqual(['2'])
    expect(ids(filterBusinesses(list, f({ search: 'peluquería' }), n => (n === 'salon' ? 'Peluquería' : n)))).toEqual(['3'])
  })

  it('combines status, niche and search', () => {
    expect(ids(filterBusinesses(list, f({ status: 'active', niche: 'salon', search: 'ana' })))).toEqual([])
    expect(ids(filterBusinesses(list, f({ status: 'inactive', niche: 'salon', search: 'ana' })))).toEqual(['3'])
  })
})

describe('sortBusinesses', () => {
  it('orders newest first, oldest first, by name and by niche', () => {
    expect(ids(sortBusinesses(list, 'recent'))).toEqual(['2', '5', '1', '3', '4'])
    expect(ids(sortBusinesses(list, 'oldest'))).toEqual(['4', '3', '1', '5', '2'])
    // Delta, Salón Ana, Sin Rubro, Spa Mimosa, Viejo Negocio
    expect(ids(sortBusinesses(list, 'name'))).toEqual(['2', '3', '5', '1', '4'])
    // salon (Salón Ana, Viejo Negocio), sin_nicho, spa, staffing
    expect(ids(sortBusinesses(list, 'niche'))).toEqual(['3', '4', '5', '1', '2'])
  })

  it('does not mutate the list it receives', () => {
    const before = ids(list)
    sortBusinesses(list, 'name')
    expect(ids(list)).toEqual(before)
  })
})

describe('counts', () => {
  it('counts each status, treating deleted businesses as their own group', () => {
    expect(countByStatus(list)).toEqual({ all: 4, active: 3, inactive: 1, deleted: 1 })
  })

  it('counts live businesses per niche, biggest first', () => {
    expect(countByNiche(list)).toEqual([
      { niche: 'salon', count: 1 },
      { niche: 'sin_nicho', count: 1 },
      { niche: 'spa', count: 1 },
      { niche: 'staffing', count: 1 },
    ])
  })
})
