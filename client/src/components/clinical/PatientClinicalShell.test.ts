import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    route: { path: '/admin/clientes/c1/expediente-clinico/historia', params: { id: 'c1' }, query: {} },
    push: vi.fn(),
    cliente: ref<Record<string, unknown> | null>(null),
    cases: ref<unknown[]>([]),
    caps: new Set<string>(),
  }
})

vi.mock('vue-router', () => ({ useRoute: () => s.route, useRouter: () => ({ push: s.push }) }))
vi.mock('@tanstack/vue-query', () => ({ useQuery: () => ({ data: s.cliente }) }))
vi.mock('../../store/business', () => ({ useBusinessStore: () => ({ terminology: { client: 'Paciente' }, hasCapability: (c: string) => s.caps.has(c) }) }))
vi.mock('../../services/clientesService', () => ({ getClienteById: vi.fn() }))
vi.mock('../../composables/clinical/useClinicalToolsNavTabs', () => ({
  useClinicalToolsNavTabs: () => ({ navTabs: { value: [] }, riskAlerts: { value: [] }, hasAccess: { value: true } }),
}))
vi.mock('../../composables/clinical/useCaseRecords', () => ({ useClientCases: () => ({ cases: s.cases }) }))

import PatientClinicalShell from './PatientClinicalShell.vue'

const mountShell = () => mount(PatientClinicalShell, {
  global: { stubs: { DentalToolsNav: true, 'router-view': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
})

// Hoy = 5 oct 2026 en cada prueba, para que la edad sea determinista.
const patient = (over: Record<string, unknown> = {}) => ({ id: 'c1', name: 'Luis Soto', phone: '0414-5', birthday: '2014-03-01', metadata: {}, ...over })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 5, 12))
  s.push.mockClear()
  s.route.path = '/admin/clientes/c1/expediente-clinico/historia'
  s.cliente.value = patient()
  s.cases.value = []
  s.caps = new Set()
})

describe('PatientClinicalShell — menores de edad y tutor', () => {
  it('flags a minor with the age and warns when no guardian is registered', () => {
    const t = mountShell().text()
    expect(t).toContain('12 años')
    expect(t).toContain('Menor de edad')
    expect(t).toContain('sin tutor registrado')
  })

  it('shows the guardian block with relationship, phone, document and whether information may be shared', () => {
    s.cliente.value = patient({ metadata: { guardian_name: 'María Soto', guardian_relationship: 'Madre', guardian_phone: '0412-9', guardian_document: 'V-123', guardian_share_info: 'si' } })
    const t = mountShell().text()
    expect(t).toContain('Tutor / representante legal')
    expect(t).toContain('María Soto')
    expect(t).toContain('Madre')
    expect(t).toContain('0412-9')
    expect(t).toContain('V-123')
    expect(t).toContain('Se puede informar al tutor')
    expect(t).not.toContain('sin tutor registrado')
  })

  it('defaults to NOT authorized to inform the guardian unless it was explicitly set to "sí"', () => {
    s.cliente.value = patient({ metadata: { guardian_name: 'María Soto' } })
    expect(mountShell().text()).toContain('Sin autorización para informar al tutor')
  })

  it('opens WhatsApp to the guardian (not the patient) with only digits', async () => {
    s.cliente.value = patient({ metadata: { guardian_name: 'María', guardian_phone: '+58 412-555.00' } })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const w = mountShell()
    await w.findAll('button').find(b => b.text().includes('WhatsApp tutor'))!.trigger('click')
    expect(open).toHaveBeenCalledWith('https://wa.me/5841255500', '_blank')
  })

  it('an adult never gets the minor tag or the missing-guardian warning', () => {
    s.cliente.value = patient({ birthday: '1990-05-05' })
    const t = mountShell().text()
    expect(t).toContain('36 años')
    expect(t).not.toContain('Menor de edad')
    expect(t).not.toContain('sin tutor registrado')
  })

  it('no birthday on file: no age, no minor assumption', () => {
    s.cliente.value = patient({ birthday: '' })
    const t = mountShell().text()
    expect(t).not.toContain('años')
    expect(t).not.toContain('Menor de edad')
  })

  it('turns 18 today: no longer a minor', () => {
    s.cliente.value = patient({ birthday: '2008-10-05' })
    const t = mountShell().text()
    expect(t).toContain('18 años')
    expect(t).not.toContain('Menor de edad')
  })
})

describe('PatientClinicalShell — pertenencia a casos', () => {
  const link = (over = {}) => ({ id: 'k1', type: 'couple', name: 'Ana y Beto', status: 'active', role: null, is_primary: true, active_member: true, ...over })

  it('lists the active cases the patient belongs to, linking to each case', () => {
    s.cases.value = [link(), link({ id: 'k2', name: 'Familia Soto', type: 'family' })]
    const w = mountShell()
    expect(w.text()).toContain('Integrante de')
    expect(w.text()).toContain('Ana y Beto')
    expect(w.text()).toContain('Familia')
    expect(w.find('a[href="/admin/casos/k1/resumen"]').exists()).toBe(true)
    expect(w.find('a[href="/admin/casos/k2/resumen"]').exists()).toBe(true)
  })

  it('leaves out closed cases and cases the patient already left', () => {
    s.cases.value = [link({ status: 'closed' }), link({ id: 'k3', name: 'Ya salí', active_member: false })]
    expect(mountShell().text()).not.toContain('Integrante de')
  })

  it('uses the employee tree under /dashboard', () => {
    s.route.path = '/dashboard/clientes/c1/expediente-clinico/historia'
    s.cases.value = [link()]
    expect(mountShell().find('a[href="/dashboard/casos/k1/resumen"]').exists()).toBe(true)
  })
})
