import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'

const listStaffingTimesheets = vi.fn()
const listStaffingIncidents = vi.fn()

vi.mock('../../services/staffing/staffingService', async (orig) => ({
  ...(await orig<typeof import('../../services/staffing/staffingService')>()),
  listStaffingTimesheets: (...a: unknown[]) => listStaffingTimesheets(...a),
  listCompanyEmployees: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../services/staffing/staffingIncidentService', async (orig) => ({
  ...(await orig<typeof import('../../services/staffing/staffingIncidentService')>()),
  listStaffingIncidents: (...a: unknown[]) => listStaffingIncidents(...a),
}))

import { useTimesheets } from './useTimesheets'
import { useStaffingIncidents, INCIDENTS_PAGE_SIZE } from './useStaffingIncidents'

const host = <T>(setup: () => T) => {
  let api!: T
  const wrapper = mount(
    defineComponent({ setup() { api = setup(); return () => h('div') } }),
    { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }]] } },
  )
  return { api, wrapper }
}

const sheet = (week: string, project: string | null = null) => ({ id: `t-${week}`, week_start: `${week}T00:00:00.000000Z`, project_id: project, entries: [] }) as any

beforeEach(() => { listStaffingTimesheets.mockReset(); listStaffingIncidents.mockReset() })

describe('useTimesheets con semana elegida', () => {
  it('pide solo la semana elegida y la anterior, no todo el historial', async () => {
    listStaffingTimesheets.mockResolvedValue([sheet('2026-10-11'), sheet('2026-10-04')])
    const week = ref('2026-10-11')
    const { api } = host(() => useTimesheets(ref('b1'), ref('c1'), ref(null), week))
    await flushPromises()

    expect(listStaffingTimesheets).toHaveBeenCalledWith('b1', 'c1', null, { from: '2026-10-04', to: '2026-10-11' })
    expect(api.findWeek('2026-10-11')?.id).toBe('t-2026-10-11')
    expect(api.findWeek('2026-10-04')?.id).toBe('t-2026-10-04') // "copiar semana anterior" sigue funcionando
  })

  it('al cambiar de semana pide la ventana nueva y mientras llega avisa que está cargando', async () => {
    listStaffingTimesheets.mockImplementation(async (_b, _c, _p, w) => (w.to === '2026-10-11' ? [sheet('2026-10-11')] : []))
    const week = ref('2026-10-11')
    const { api } = host(() => useTimesheets(ref('b1'), ref('c1'), ref(null), week))
    await flushPromises()
    expect(api.findWeek('2026-10-11')).not.toBeNull()

    week.value = '2026-06-07'
    await nextTick()
    expect(listStaffingTimesheets).toHaveBeenLastCalledWith('b1', 'c1', null, { from: '2026-05-31', to: '2026-06-07' })
    expect(api.timesheetsLoading.value).toBe(true)
    expect(api.findWeek('2026-06-07')).toBeNull()
    await flushPromises()
    expect(api.timesheetsLoading.value).toBe(false)
  })

  it('si la semana no se pudo cargar lo avisa, para que no se guarde encima como si estuviera vacía', async () => {
    listStaffingTimesheets.mockRejectedValue(new Error('sin conexión'))
    const { api } = host(() => useTimesheets(ref('b1'), ref('c1'), ref(null), ref('2026-10-11')))
    await flushPromises()
    expect(api.timesheetsError.value).toBe(true)
    expect(api.findWeek('2026-10-11')).toBeNull()
  })

  it('sin semana elegida carga todo, como antes', async () => {
    listStaffingTimesheets.mockResolvedValue([])
    host(() => useTimesheets(ref('b1'), ref('c1'), ref(null)))
    await flushPromises()
    expect(listStaffingTimesheets).toHaveBeenCalledWith('b1', 'c1', null, undefined)
  })
})

describe('useStaffingIncidents por tandas', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}` }))

  it('muestra la primera tanda y avisa si hay más (el servidor devuelve una fila extra)', async () => {
    listStaffingIncidents.mockResolvedValue(many(INCIDENTS_PAGE_SIZE + 1))
    const { api } = host(() => useStaffingIncidents(ref('b1'), ref(null), ref(null)))
    await flushPromises()
    expect(listStaffingIncidents).toHaveBeenCalledWith(null, null, INCIDENTS_PAGE_SIZE)
    expect(api.incidents.value).toHaveLength(INCIDENTS_PAGE_SIZE)
    expect(api.hasMore.value).toBe(true)
  })

  it('"mostrar más" pide otra tanda; sin fila extra ya no hay más', async () => {
    listStaffingIncidents.mockImplementation(async (_c, _s, limit) => many(limit === INCIDENTS_PAGE_SIZE ? limit + 1 : 70))
    const { api } = host(() => useStaffingIncidents(ref('b1'), ref(null), ref(null)))
    await flushPromises()
    api.showMore()
    await flushPromises()
    expect(listStaffingIncidents).toHaveBeenLastCalledWith(null, null, INCIDENTS_PAGE_SIZE * 2)
    expect(api.incidents.value).toHaveLength(70)
    expect(api.hasMore.value).toBe(false)
  })

  it('con pocos incidentes no ofrece "mostrar más"', async () => {
    listStaffingIncidents.mockResolvedValue(many(3))
    const { api } = host(() => useStaffingIncidents(ref('b1'), ref(null), ref(null)))
    await flushPromises()
    expect(api.incidents.value).toHaveLength(3)
    expect(api.hasMore.value).toBe(false)
  })

  it('al cambiar un filtro vuelve a la primera tanda', async () => {
    listStaffingIncidents.mockResolvedValue(many(INCIDENTS_PAGE_SIZE + 1))
    const status = ref<string | null>(null)
    const { api } = host(() => useStaffingIncidents(ref('b1'), ref(null), status))
    await flushPromises()
    api.showMore()
    await flushPromises()
    status.value = 'activo'
    await flushPromises()
    expect(listStaffingIncidents).toHaveBeenLastCalledWith(null, 'activo', INCIDENTS_PAGE_SIZE)
  })
})
