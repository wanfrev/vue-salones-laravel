import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const svc = vi.hoisted(() => ({
  saveCita: vi.fn(),
  updateCitaStatus: vi.fn(async () => undefined),
  updateAppointmentTime: vi.fn(async () => undefined),
  deleteCita: vi.fn(async () => undefined),
  setAppointmentCheckedIn: vi.fn(),
}))

vi.mock('../../services/agendaService', () => svc)
vi.mock('../../services/dental/consentService', () => ({ listConsents: vi.fn(async () => []) }))
vi.mock('../../services/posService', () => ({ posKeys: { pending: () => ['pos-pending'] }, updateTransaction: vi.fn() }))
vi.mock('../../services/clientesService', () => ({ clientesKeys: { all: () => ['clientes'] } }))
vi.mock('../../services/employeeDashboardService', () => ({
  dashboardKeys: { payments: () => ['d-pay'], history: () => ['d-his'], appointments: () => ['d-app'], earnings: () => ['d-earn'] },
}))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: 'br-1', hasFeature: () => true }) }))
vi.mock('../../store/auth', () => ({ useAuthStore: () => ({ role: 'admin', profile: { can_create_clients: true } }) }))
vi.mock('../../lib/api', () => ({ db: { auth: { getSession: vi.fn(async () => ({})) } } }))
vi.mock('../../lib/audioPlayer', () => ({ playSound: vi.fn() }))

import { useAppointmentMutations } from './useAppointmentMutations'
import { UNDO_WINDOW_MS, useNotification } from '../common/useNotification'

const raw = (over: Record<string, unknown> = {}) => ({
  id: 'a1', employee_id: 'nayleth', status: 'pending', payment_status: 'unpaid', group_id: null,
  start_time: '2026-10-31T09:00:00.000Z', end_time: '2026-10-31T10:00:00.000Z', clients: { full_name: 'Mary Bracho' }, ...over,
})

let api: ReturnType<typeof useAppointmentMutations>
let queryClient: QueryClient

const setup = (appointments: any[]) => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['appointments', 'b1', 'k'], appointments)
  mount(defineComponent({ setup() { api = useAppointmentMutations({ businessId: ref('b1') }); return () => null } }), {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}
const cached = () => queryClient.getQueryData<any[]>(['appointments', 'b1', 'k'])!
const toasts = () => useNotification().notifications.value
const flush = async () => { await vi.advanceTimersByTimeAsync(0) }

describe('«Deshacer» en la agenda', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 0 })
    Object.values(svc).forEach(f => f.mockClear())
    toasts().splice(0)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('mover una cita ofrece deshacer y devuelve la cita a su horario y profesional anteriores', async () => {
    setup([raw()])

    await api.handleEventChange({ id: 'a1', start: '2026-10-31T13:00:00.000Z', end: '2026-10-31T14:00:00.000Z' })
    expect(svc.updateAppointmentTime).toHaveBeenCalledWith('a1', '2026-10-31T13:00:00.000Z', '2026-10-31T14:00:00.000Z', undefined)
    expect(toasts().at(-1)?.action?.label).toBe('Deshacer')

    await useNotification().runAction(toasts().at(-1)!.id)
    expect(svc.updateAppointmentTime).toHaveBeenLastCalledWith('a1', '2026-10-31T09:00:00.000Z', '2026-10-31T10:00:00.000Z', 'nayleth')
  })

  it('mover encima de otra cita de la misma profesional se rechaza con el nombre de la clienta (también la 2.ª hora de una larga)', async () => {
    setup([raw({ end_time: '2026-10-31T11:00:00.000Z' }), raw({ id: 'a2', start_time: '2026-10-31T14:00:00.000Z', end_time: '2026-10-31T15:00:00.000Z' })])

    // a2 pasa a 10:00–10:30, dentro de las dos horas de a1 (9:00–11:00)
    await api.handleEventChange({ id: 'a2', start: '2026-10-31T10:00:00.000Z', end: '2026-10-31T10:30:00.000Z' })

    expect(svc.updateAppointmentTime).not.toHaveBeenCalled()
    expect(toasts().at(-1)?.message).toMatch(/Ya tiene a Mary Bracho/)
  })

  it('cambiar el estado ofrece deshacer y vuelve al estado anterior', async () => {
    setup([raw({ status: 'pending' })])

    await api.handleStatusChange({ id: 'a1', status: 'confirmed' })
    expect(svc.updateCitaStatus).toHaveBeenCalledWith('a1', 'confirmed')
    expect(toasts().at(-1)?.message).toBe('Estado actualizado a Confirmada')

    await useNotification().runAction(toasts().at(-1)!.id)
    expect(svc.updateCitaStatus).toHaveBeenLastCalledWith('a1', 'pending')
  })

  it('eliminar oculta la cita al instante y solo borra de verdad al vencer el plazo', async () => {
    vi.stubGlobal('confirm', () => true)
    setup([raw(), raw({ id: 'a2' })])

    api.handleDeleteCita('a1')
    expect(cached().map(a => a.id)).toEqual(['a2'])
    expect(svc.deleteCita).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 50)
    expect(svc.deleteCita).toHaveBeenCalledWith('a1')
  })

  it('deshacer un borrado restaura la cita y nunca llega a borrarla', async () => {
    vi.stubGlobal('confirm', () => true)
    setup([raw(), raw({ id: 'a2' })])

    api.handleDeleteCita('a1')
    const toast = toasts().find(t => t.message === 'Cita eliminada')!
    await useNotification().runAction(toast.id)
    await flush()

    expect(cached().map(a => a.id)).toEqual(['a1', 'a2'])
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2)
    expect(svc.deleteCita).not.toHaveBeenCalled()
  })

  it('si la persona cancela la confirmación no se oculta ni se borra nada', async () => {
    vi.stubGlobal('confirm', () => false)
    setup([raw()])

    api.handleDeleteCita('a1')
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2)

    expect(cached()).toHaveLength(1)
    expect(svc.deleteCita).not.toHaveBeenCalled()
  })
})
