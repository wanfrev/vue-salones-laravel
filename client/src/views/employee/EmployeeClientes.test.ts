import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    push: vi.fn(),
    clients: ref<unknown[]>([]),
    nicheType: 'psicologia' as string,
    caps: new Set<string>(),
    auth: { role: 'empleado', profile: {} as Record<string, unknown> },
  }
})

vi.mock('vue-router', () => ({ useRouter: () => ({ push: s.push }) }))
vi.mock('@tanstack/vue-query', () => ({ useQuery: () => ({ data: s.clients }), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('../../store/auth', () => ({ useAuthStore: () => ({ businessId: 'b1', get role() { return s.auth.role }, get profile() { return s.auth.profile } }) }))
vi.mock('../../store/business', () => ({
  useBusinessStore: () => ({
    currentBranchId: null,
    get nicheType() { return s.nicheType },
    terminology: { client: 'Paciente', clientPlural: 'Pacientes', appointmentPlural: 'Sesiones' },
    hasFeature: () => true,
    hasCapability: (c: string) => s.caps.has(c),
  }),
}))
// El layout real conecta con el websocket al importarse; aquí solo importa la lista.
vi.mock('../../components/layout/AppLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('../../components/modals/ClienteFormModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../../services/clientesService', () => ({ clientesKeys: { all: () => ['clientes'] }, listClientes: vi.fn(), saveCliente: vi.fn() }))

import EmployeeClientes from './EmployeeClientes.vue'

const client = (id: string, name: string) => ({ id, name, phone: '0414-1', email: '', joinDate: '2026-01-01', lastVisit: 'Sin visitas', totalAppointments: 0, totalSpent: 0 })
const mountList = () => mount(EmployeeClientes, { global: { stubs: { AppLayout: { template: '<div><slot /></div>' }, ClienteFormModal: true } } })
const buttons = (w: ReturnType<typeof mount>, text: string) => w.findAll('button').filter(b => b.text() === text)

beforeEach(() => {
  s.push.mockClear()
  s.nicheType = 'psicologia'
  s.caps = new Set(['clinical.intake', 'clinical.attachments'])
  s.auth.role = 'empleado'
  s.auth.profile = {}
  s.clients.value = [client('c1', 'Ana Pérez'), client('c2', 'Beto Ruiz')]
})

describe('EmployeeClientes — acceso directo al expediente (psicología)', () => {
  it('each patient has «Expediente» and «Archivos» buttons', () => {
    const w = mountList()
    expect(buttons(w, 'Expediente')).toHaveLength(2)
    expect(buttons(w, 'Archivos')).toHaveLength(2)
  })

  it('«Expediente» opens the clinical history of THAT patient without opening the ficha', async () => {
    const w = mountList()
    await buttons(w, 'Expediente')[1].trigger('click')
    expect(s.push).toHaveBeenCalledTimes(1)
    expect(s.push).toHaveBeenCalledWith('/dashboard/clientes/c2/expediente-clinico/historia')
  })

  it('«Archivos» opens the attachments tab to see and upload files', async () => {
    const w = mountList()
    await buttons(w, 'Archivos')[0].trigger('click')
    expect(s.push).toHaveBeenCalledWith('/dashboard/clientes/c1/expediente-clinico/adjuntos')
  })

  it('clicking the row still opens the ficha', async () => {
    const w = mountList()
    await w.find('tbody tr').trigger('click')
    expect(s.push).toHaveBeenCalledWith('/dashboard/clientes/c1')
  })

  it('an employee whose clinical permission was switched off sees neither button', () => {
    s.auth.profile = { can_access_dental_clinical: false }
    const w = mountList()
    expect(buttons(w, 'Expediente')).toHaveLength(0)
    expect(buttons(w, 'Archivos')).toHaveLength(0)
  })

  it('without the attachments capability only «Expediente» shows', () => {
    s.caps = new Set(['clinical.intake'])
    const w = mountList()
    expect(buttons(w, 'Expediente')).toHaveLength(2)
    expect(buttons(w, 'Archivos')).toHaveLength(0)
  })

  it('other niches never get the buttons', () => {
    for (const niche of ['barberia', 'odontologia', 'salon']) {
      s.nicheType = niche
      const w = mountList()
      expect(buttons(w, 'Expediente'), niche).toHaveLength(0)
      expect(buttons(w, 'Archivos'), niche).toHaveLength(0)
    }
  })
})
