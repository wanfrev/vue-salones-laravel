import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { appointmentsWithoutNote } from '../components/clinical/cases'

const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    notes: ref<unknown[]>([]),
    appointments: ref<unknown[]>([]),
    isLoading: ref(false),
    pending: ref(false),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/admin/casos/k1/sesiones', params: { caseId: 'k1' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('../store/auth', () => ({ useAuthStore: () => ({ role: 'admin', user: { id: 'u1' }, profile: { id: 'u1' } }) }))
vi.mock('../composables/clinical/useCaseRecords', () => ({
  useCaseSessions: () => ({
    notes: s.notes, appointments: s.appointments, isLoading: s.isLoading,
    createMutation: { isPending: s.pending, mutateAsync: vi.fn() },
    updateMutation: { isPending: s.pending, mutateAsync: vi.fn() },
  }),
}))

import CaseSessionsView from './CaseSessionsView.vue'

const appt = (id: string, status = 'completed') => ({ id, start_time: '2026-10-05T15:00:00', status, service_name: 'Terapia de pareja' })
const note = (id: string, appointment_id: string | null) => ({ id, appointment_id })

beforeEach(() => {
  s.notes.value = []
  s.appointments.value = []
  s.isLoading.value = false
})

describe('appointmentsWithoutNote', () => {
  it('keeps linked appointments that have no note and drops documented, cancelled and no-show ones', () => {
    const list = [appt('a'), appt('b'), appt('c', 'cancelled'), appt('d', 'no_show'), appt('e', 'confirmed')]
    expect(appointmentsWithoutNote(list, [note('n1', 'b')]).map(a => a.id)).toEqual(['a', 'e'])
  })

  it('a note without appointment does not hide anything', () => {
    expect(appointmentsWithoutNote([appt('a')], [note('n1', null)]).map(a => a.id)).toEqual(['a'])
  })
})

describe('CaseSessionsView — citas vinculadas', () => {
  it('lists the linked appointments that still need a note instead of saying there are no sessions', async () => {
    s.appointments.value = [appt('a')]
    const w = mount(CaseSessionsView, { global: { stubs: { SessionNoteCard: true, SessionNoteForm: true } } })

    expect(w.text()).toContain('Citas vinculadas sin nota (1)')
    expect(w.text()).toContain('Terapia de pareja')
    expect(w.text()).not.toContain('todavía no tiene sesiones conjuntas')

    await w.findAll('button').find(b => b.text() === 'Escribir nota')!.trigger('click')
    const form = w.findComponent({ name: 'SessionNoteForm' })
    expect(form.exists()).toBe(true)
    expect(form.props('initial')).toMatchObject({ appointment_id: 'a' })
  })

  it('with nothing linked, explains how to link an appointment', () => {
    const w = mount(CaseSessionsView, { global: { stubs: { SessionNoteCard: true, SessionNoteForm: true } } })
    expect(w.text()).toContain('todavía no tiene sesiones conjuntas')
    expect(w.text()).toContain('Vincular a un caso')
    expect(w.text()).not.toContain('Citas vinculadas sin nota')
  })

  it('an appointment that already has its note is not offered again', () => {
    s.appointments.value = [appt('a')]
    s.notes.value = [note('n1', 'a')]
    const w = mount(CaseSessionsView, { global: { stubs: { SessionNoteCard: true, SessionNoteForm: true } } })
    expect(w.text()).not.toContain('Citas vinculadas sin nota')
  })
})
