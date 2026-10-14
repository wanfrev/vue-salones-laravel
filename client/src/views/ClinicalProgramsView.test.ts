import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    programs: ref<unknown[]>([]),
    isAdmin: ref(true),
    remove: vi.fn(),
    deletePending: ref(false),
    loading: ref(false),
  }
})

vi.mock('@tanstack/vue-query', () => ({ useQuery: () => ({ data: { value: [] } }), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('../composables/clinical/usePrograms', () => ({
  usePrograms: () => ({
    programs: s.programs, isLoading: s.loading, isAdmin: s.isAdmin,
    createMutation: { isPending: { value: false }, mutateAsync: vi.fn() },
    updateMutation: { isPending: { value: false }, mutateAsync: vi.fn() },
    deleteMutation: { isPending: s.deletePending, mutate: s.remove },
  }),
  useEnrollmentOptions: () => ({ programs: { value: [] }, employees: { value: [] }, branchId: { value: null } }),
}))
vi.mock('../composables/common/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../services/clinical/programService', () => ({ enrollClient: vi.fn() }))
vi.mock('../services/serviciosService', () => ({ listServicios: vi.fn() }))
vi.mock('../store/auth', () => ({ useAuthStore: () => ({ businessId: 'b1' }) }))
vi.mock('../store/business', () => ({ useBusinessStore: () => ({ currentBranchId: null }) }))

import ClinicalProgramsView from './ClinicalProgramsView.vue'

const program = (id: string, name: string) => ({
  id, name, price: 120, validity_days: 30, active: true, sessions_total: 8,
  components: [{ service_ids: ['s'], quantity: 8, employee_id: 'e1', employee_name: 'Dra. Soto', services: [{ id: 's', name: 'Estimulación', duration_minutes: 50 }] }],
})
const mountView = () => mount(ClinicalProgramsView, { global: { stubs: { EnrollmentForm: true, ProgramForm: true } } })
const buttons = (w: ReturnType<typeof mountView>, text: string) => w.findAll('button').filter(b => b.text() === text)

beforeEach(() => {
  s.remove.mockClear()
  s.isAdmin.value = true
  s.deletePending.value = false
  s.programs.value = [program('p1', 'Estimulación temprana'), program('p2', 'Programa mixto')]
})

describe('ClinicalProgramsView — eliminar programas', () => {
  it('the administrator sees «Eliminar» on every program', () => {
    expect(buttons(mountView(), 'Eliminar')).toHaveLength(2)
  })

  it('reception only reads the catalog: no «Editar» and no «Eliminar»', () => {
    s.isAdmin.value = false
    const w = mountView()
    expect(w.text()).toContain('Estimulación temprana') // el catálogo sí se ve
    expect(buttons(w, 'Eliminar')).toHaveLength(0)
    expect(buttons(w, 'Editar')).toHaveLength(0)
  })

  it('asks first, explaining that what was sold is kept; saying no deletes nothing', async () => {
    const confirm = vi.fn().mockReturnValue(false)
    ;(window as unknown as { confirm: unknown }).confirm = confirm
    await buttons(mountView(), 'Eliminar')[0].trigger('click')

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0]).toContain('Estimulación temprana')
    expect(confirm.mock.calls[0][0]).toContain('conservan')
    expect(confirm.mock.calls[0][0]).toContain('desactívalo')
    expect(s.remove).not.toHaveBeenCalled()
  })

  it('deletes THAT program once confirmed', async () => {
    ;(window as unknown as { confirm: unknown }).confirm = vi.fn().mockReturnValue(true)
    await buttons(mountView(), 'Eliminar')[1].trigger('click')

    expect(s.remove).toHaveBeenCalledTimes(1)
    expect(s.remove).toHaveBeenCalledWith('p2')
  })

  it('the button is disabled while a deletion is in progress', () => {
    s.deletePending.value = true
    const all = buttons(mountView(), 'Eliminar')
    expect(all).toHaveLength(2)
    expect(all.every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })
})
