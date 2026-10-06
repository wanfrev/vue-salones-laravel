import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { ClinicalAuditRow, ClinicalFollowUp, SessionNote } from '../types/database'

// ── Dobles de lo que las vistas consumen del entorno (router, auth, composables de datos) ──
// Refs reales de Vue (no objetos con getters): las vistas hacen watch() y desenvuelven refs en el template.
const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    route: { path: '/admin/clientes/c1/expediente-clinico/sesiones', params: { id: 'c1' } as Record<string, string>, query: {} as Record<string, string> },
    push: vi.fn(),
    replace: vi.fn(),
    auth: { role: 'admin' as string | null, user: { id: 'u-admin' } as { id: string } | null, profile: { id: 'u-admin' } as { id: string } | null },
    notes: ref<unknown[]>([]),
    appts: ref<unknown[]>([]),
    jointNotes: ref<unknown[]>([]),
    jointPlans: ref<unknown[]>([]),
    clientCases: ref<unknown[]>([]),
    falsy: ref(false),
    notesLoading: ref(false),
    followUp: ref<unknown>(null),
    fuLoading: ref(false),
    fuAccess: ref(true),
    auditRows: ref<unknown[]>([]),
    auditMore: ref(false),
    auditFilters: null as null | (() => { page: number }),
  }
})
const h = s

vi.mock('vue-router', () => ({
  useRoute: () => s.route,
  useRouter: () => ({ push: s.push, replace: s.replace }),
}))
vi.mock('../store/auth', () => ({ useAuthStore: () => s.auth }))
vi.mock('../store/business', () => ({ useBusinessStore: () => ({ hasCapability: () => true }) }))
vi.mock('../composables/clinical/useCaseRecords', () => ({
  useClientCases: () => ({ jointNotes: s.jointNotes, jointPlans: s.jointPlans, cases: s.clientCases, isLoading: s.falsy }),
}))

vi.mock('../composables/clinical/useSessionNotes', () => ({
  useSessionNotes: () => ({
    notes: s.notes,
    appointments: s.appts,
    isLoading: s.notesLoading,
    createMutation: { isPending: { value: false }, mutateAsync: vi.fn() },
    updateMutation: { isPending: { value: false }, mutateAsync: vi.fn() },
  }),
}))

vi.mock('../composables/clinical/useClinicalFollowUp', () => ({
  useClinicalFollowUp: () => ({ followUp: s.followUp, isLoading: s.fuLoading, hasAccess: s.fuAccess }),
}))

vi.mock('../composables/clinical/useClinicalAudit', () => ({
  useClinicalAudit: (filters: () => { page: number }) => {
    s.auditFilters = filters
    return {
      auditQuery: { isError: { value: false }, error: { value: null } },
      rows: s.auditRows,
      hasMore: s.auditMore,
      isLoading: s.falsy,
      isFetching: s.falsy,
    }
  },
}))

import ClinicalSessionsView from './ClinicalSessionsView.vue'
import ClinicalFollowUpView from './ClinicalFollowUpView.vue'
import ClinicalAuditView from './ClinicalAuditView.vue'
import SessionNoteForm from '../components/clinical/SessionNoteForm.vue'
import ReportSheet from '../components/clinical/ReportSheet.vue'
import { emptySessionNoteForm } from '../components/clinical/sessionNotes'

const note = (over: Partial<SessionNote>): SessionNote => ({
  id: 'n1', business_id: 'b', branch_id: null, client_id: 'c1', appointment_id: null, created_by: 'u-admin', session_number: 1,
  session_date: '2026-10-01', duration_minutes: 50, risk_level: 'none', mood_rating: null,
  content: { subjective: 's', objective: '', assessment: '', plan: '' }, tasks: null, created_at: '', updated_at: '', ...over,
})

beforeEach(() => {
  h.push.mockClear()
  h.replace.mockClear()
  h.route.path = '/admin/clientes/c1/expediente-clinico/sesiones'
  h.route.query = {}
  h.auth.role = 'admin'
  h.auth.user = { id: 'u-admin' }
  s.notes.value = []
  s.notesLoading.value = false
  s.jointNotes.value = []
  s.jointPlans.value = []
  s.fuLoading.value = false
  s.fuAccess.value = true
  s.auditRows.value = []
  s.auditMore.value = false
})

describe('ClinicalSessionsView — llegada desde una cita (?cita=)', () => {
  it('without ?cita= shows the list and no form', () => {
    s.notes.value = [note({})]
    const wrapper = mount(ClinicalSessionsView)
    expect(wrapper.findComponent(SessionNoteForm).exists()).toBe(false)
    expect(wrapper.text()).toContain('Sesión 1')
  })

  it('opens a NEW note already linked to the appointment when it has none yet', () => {
    h.route.query = { cita: 'ap-9' }
    s.notes.value = [note({ appointment_id: 'ap-1' })]

    const form = mount(ClinicalSessionsView).findComponent(SessionNoteForm)

    expect(form.exists()).toBe(true)
    expect(form.props('isEditing')).toBe(false)
    expect(form.props('initial').appointment_id).toBe('ap-9')
    expect(form.props('syncDate')).toBe(true) // la fecha saldrá de la cita al cargar sus datos
    expect(form.text()).toContain('Nueva nota de sesión')
  })

  it('opens the EXISTING note for editing when the appointment already has one (no duplicate)', () => {
    h.route.query = { cita: 'ap-1' }
    s.notes.value = [note({ id: 'n-existing', appointment_id: 'ap-1', content: { subjective: 'ya escrita', objective: '', assessment: '', plan: '' } })]

    const form = mount(ClinicalSessionsView).findComponent(SessionNoteForm)

    expect(form.props('isEditing')).toBe(true)
    expect(form.props('initial').content.subjective).toBe('ya escrita')
    expect(form.props('syncDate')).toBe(false)
  })

  it("does not open someone else's note for editing when the user cannot modify it — it just shows the list", () => {
    h.auth.role = 'empleado'
    h.auth.user = { id: 'u-other' }
    h.route.query = { cita: 'ap-1' }
    s.notes.value = [note({ appointment_id: 'ap-1', created_by: 'u-author' })]

    const wrapper = mount(ClinicalSessionsView)

    expect(wrapper.findComponent(SessionNoteForm).exists()).toBe(false)
    expect(wrapper.text()).toContain('Sesión 1')
  })

  it('waits for the notes to load before deciding (never creates a duplicate while loading)', async () => {
    h.route.query = { cita: 'ap-1' }
    s.notesLoading.value = true
    const wrapper = mount(ClinicalSessionsView)
    expect(wrapper.findComponent(SessionNoteForm).exists()).toBe(false)
  })

  it('clears ?cita= from the URL when the form is cancelled', async () => {
    h.route.query = { cita: 'ap-9', otro: 'x' }
    const wrapper = mount(ClinicalSessionsView)

    await wrapper.findComponent(SessionNoteForm).vm.$emit('cancel')
    await flushPromises()

    expect(h.replace).toHaveBeenCalledWith({ query: { otro: 'x' } })
    expect(wrapper.findComponent(SessionNoteForm).exists()).toBe(false)
  })
})

describe('ClinicalSessionsView — sesiones conjuntas en la ficha de un integrante', () => {
  const joint = {
    ...({} as SessionNote), id: 'j1', case_id: 'case-9', case_name: 'Pareja Pérez-Ruiz', session_number: 3, session_date: '2026-10-02',
    risk_level: 'moderate', content: { subjective: 'Discutieron por las finanzas', objective: '', assessment: '', plan: '' },
  }

  it('shows them apart from the individual notes, labelled as joint, with the case name and a link to the case', () => {
    s.notes.value = [note({ id: 'own' })]
    s.jointNotes.value = [joint]
    const wrapper = mount(ClinicalSessionsView, { global: { stubs: { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
    const text = wrapper.text()

    expect(text).toContain('Sesiones conjuntas')
    expect(text).toContain('Conjunta')
    expect(text).toContain('Pareja Pérez-Ruiz')
    expect(text).toContain('Discutieron por las finanzas')
    expect(text).toContain('Riesgo moderado')
    expect(wrapper.find('a[href="/admin/casos/case-9/sesiones"]').exists()).toBe(true)
    expect(text).toContain('Sesión 1') // la individual sigue ahí, sin mezclarse
  })

  it('joint notes are read-only here: no edit button for them', () => {
    s.jointNotes.value = [joint]
    const wrapper = mount(ClinicalSessionsView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.findAll('button').filter(b => b.text() === 'Editar')).toHaveLength(0)
  })

  it('renders nothing extra when the patient is in no case', () => {
    s.notes.value = [note({})]
    expect(mount(ClinicalSessionsView).text()).not.toContain('Sesiones conjuntas')
  })

  it('uses the /dashboard tree for employees', () => {
    h.route.path = '/dashboard/clientes/c1/expediente-clinico/sesiones'
    s.jointNotes.value = [joint]
    const wrapper = mount(ClinicalSessionsView, { global: { stubs: { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
    expect(wrapper.find('a[href="/dashboard/casos/case-9/sesiones"]').exists()).toBe(true)
  })
})

describe('SessionNoteForm — fecha desde la cita preseleccionada', () => {
  it('takes the date of the preselected appointment once the appointment list arrives', async () => {
    const initial = { ...emptySessionNoteForm(), appointment_id: 'ap-1' }
    const wrapper = mount(SessionNoteForm, { props: { initial, appointments: [], saving: false, isEditing: false, syncDate: true } })

    await wrapper.setProps({ appointments: [{ id: 'ap-1', start_time: '2026-09-20T15:00:00-04:00', status: 'completed', service_name: 'Terapia' }] })
    await wrapper.findAll('textarea')[0].setValue('x')
    await wrapper.findAll('button').find(b => b.text().includes('Guardar nota'))!.trigger('click')

    const [payload] = wrapper.emitted('save')![0] as [Record<string, unknown>]
    expect(payload.session_date).toBe('2026-09-20')
    expect(payload.appointment_id).toBe('ap-1')
  })

  it('leaves a date the user already chose alone when syncDate is off', async () => {
    const initial = { ...emptySessionNoteForm(), appointment_id: 'ap-1', session_date: '2026-01-02' }
    const wrapper = mount(SessionNoteForm, { props: { initial, appointments: [], saving: false, isEditing: true, syncDate: false } })

    await wrapper.setProps({ appointments: [{ id: 'ap-1', start_time: '2026-09-20T15:00:00-04:00', status: 'completed', service_name: null }] })
    await wrapper.findAll('textarea')[0].setValue('x')
    await wrapper.findAll('button').find(b => b.text().includes('Guardar nota'))!.trigger('click')

    expect((wrapper.emitted('save')![0] as [Record<string, unknown>])[0].session_date).toBe('2026-01-02')
  })
})

describe('ClinicalFollowUpView', () => {
  const data = (): ClinicalFollowUp => ({
    weeks: 4,
    risk_cases: [], risk_unfollowed: [{ client_id: 'p1', client_name: 'ANA PÉREZ', phone: '0414-1', risk_level: 'high', session_date: '2026-09-25', session_number: 2, days_since: 10 }],
    notes_pending: [{ appointment_id: 'ap-7', client_id: 'p2', client_name: 'beto ruiz', start_time: '2026-10-02T10:00:00-04:00', service_name: 'Psicoterapia individual' }],
    inactive: [{ client_id: 'p3', client_name: 'Carla Soto', phone: null, last_session: '2026-08-10', days_since: 56, sessions: 1 }],
  })

  it('renders the three lists with counts, readable names and labels', () => {
    s.followUp.value = data()
    const text = mount(ClinicalFollowUpView).text()

    expect(text).toContain('Riesgo sin próxima sesión')
    expect(text).toContain('Ana Pérez') // el nombre llega en MAYÚSCULAS y se muestra con capitalización normal
    expect(text).toContain('Riesgo alto')
    expect(text).toContain('Sesión 2 · hace 10 días')
    expect(text).toContain('Beto Ruiz')
    expect(text).toContain('Psicoterapia individual')
    expect(text).toContain('1 sesión en total')
    expect(text).toContain('hace 8 semanas')
  })

  it('says so when a list is empty', () => {
    s.followUp.value = { weeks: 4, notes_pending: [], risk_unfollowed: [], risk_cases: [], inactive: [] }
    const text = mount(ClinicalFollowUpView).text()
    expect(text).toContain('Ningún paciente ni caso en esta situación.')
    expect(text).toContain('Todas las sesiones recientes tienen su nota.')
    expect(text).toContain('Ningún paciente inactivo con ese criterio.')
  })

  it('"Escribir nota" jumps straight to that appointment\'s note; "Abrir expediente" just opens Sesiones', async () => {
    s.followUp.value = data()
    const wrapper = mount(ClinicalFollowUpView)

    await wrapper.findAll('button').find(b => b.text() === 'Escribir nota')!.trigger('click')
    expect(h.push).toHaveBeenLastCalledWith({ path: '/admin/clientes/p2/expediente-clinico/sesiones', query: { cita: 'ap-7' } })

    await wrapper.findAll('button').find(b => b.text() === 'Abrir expediente')!.trigger('click')
    expect(h.push).toHaveBeenLastCalledWith({ path: '/admin/clientes/p1/expediente-clinico/sesiones', query: undefined })
  })

  it('uses the /dashboard tree for employees', async () => {
    h.route.path = '/dashboard/seguimiento'
    s.followUp.value = data()
    await mount(ClinicalFollowUpView).findAll('button').find(b => b.text() === 'Escribir nota')!.trigger('click')
    expect(h.push).toHaveBeenLastCalledWith({ path: '/dashboard/clientes/p2/expediente-clinico/sesiones', query: { cita: 'ap-7' } })
  })

  it('only offers WhatsApp when the patient has a phone', () => {
    s.followUp.value = data()
    const buttons = mount(ClinicalFollowUpView).findAll('button').filter(b => b.text().includes('WhatsApp'))
    expect(buttons).toHaveLength(1) // Ana tiene teléfono; Carla no
  })

  it('lists cases at risk apart from patients, and writes a joint session note on the CASE (not on the individual file)', async () => {
    s.followUp.value = {
      weeks: 4,
      risk_unfollowed: [],
      risk_cases: [{ case_id: 'k1', case_name: 'Ana y Beto', type: 'couple', risk_level: 'high', session_date: '2026-10-01', session_number: 2, days_since: 4 }],
      notes_pending: [{ appointment_id: 'ap-3', client_id: 'p1', client_name: 'ANA PÉREZ', start_time: '2026-10-02T10:00:00-04:00', service_name: 'Terapia de pareja', case_id: 'k1', case_name: 'Ana y Beto' }],
      inactive: [],
    }
    const wrapper = mount(ClinicalFollowUpView)
    const text = wrapper.text()

    expect(text).toContain('Caso de pareja')
    expect(text).toContain('Riesgo alto')
    expect(text).toContain('Sesión conjunta 2 · hace 4 días')
    expect(text).not.toContain('Ningún paciente ni caso') // el caso cuenta como una alerta
    expect(text).toContain('Sesión conjunta')              // la nota pendiente es del caso

    await wrapper.findAll('button').find(b => b.text() === 'Abrir caso')!.trigger('click')
    expect(h.push).toHaveBeenLastCalledWith({ path: '/admin/casos/k1/sesiones', query: undefined })

    await wrapper.findAll('button').find(b => b.text() === 'Escribir nota')!.trigger('click')
    expect(h.push).toHaveBeenLastCalledWith({ path: '/admin/casos/k1/sesiones', query: { cita: 'ap-3' } })
  })

  it('shows a clear message instead of lists when the user has no clinical permission', () => {
    s.fuAccess.value = false
    s.followUp.value = data()
    expect(mount(ClinicalFollowUpView).text()).toContain('No tienes permiso para ver el expediente clínico.')
  })
})

describe('ClinicalAuditView', () => {
  const row = (over: Partial<ClinicalAuditRow>): ClinicalAuditRow => ({
    id: 'l1', created_at: '2026-10-05T14:30:00-04:00', action: 'viewed', resource: 'session_note', resource_id: null, detail: null,
    ip: '10.0.0.7', client_id: 'c1', client_name: 'Ana Pérez', user_id: 'u1', user_name: 'Dra. Rivas', ...over,
  })

  it('is admin-only: any other role sees a notice and nothing is requested', () => {
    h.auth.role = 'encargado'
    const wrapper = mount(ClinicalAuditView)
    expect(wrapper.text()).toContain('Solo el administrador')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('lists who did what with readable labels, including deleted patients/users and printed reports', () => {
    s.auditRows.value = [
      row({ id: 'a' }),
      row({ id: 'b', action: 'report_printed', resource: 'report', detail: 'referral' }),
      row({ id: 'c', client_name: null, user_name: null }),
    ]
    const text = mount(ClinicalAuditView).text()

    expect(text).toContain('Dra. Rivas')
    expect(text).toContain('Consultó')
    expect(text).toContain('Notas de sesión')
    expect(text).toContain('Imprimió')
    expect(text).toContain('Informe — Carta de derivación')
    expect(text).toContain('Usuario eliminado')
    expect(text).toContain('Paciente eliminado')
  })

  it('filters the loaded page client-side by patient, user or IP', async () => {
    s.auditRows.value = [row({ id: 'a' }), row({ id: 'b', client_name: 'Luis Gómez', user_name: 'Lic. Mora', ip: '10.9.9.9' })]
    const wrapper = mount(ClinicalAuditView)

    await wrapper.find('input[placeholder="Paciente, usuario o IP"]').setValue('gómez')
    expect(wrapper.text()).toContain('Luis Gómez')
    expect(wrapper.text()).not.toContain('Ana Pérez')

    await wrapper.find('input[placeholder="Paciente, usuario o IP"]').setValue('nadie')
    expect(wrapper.text()).toContain('Ningún resultado coincide')
  })

  it('refuses to apply a range the server would reject (more than 180 days)', async () => {
    const wrapper = mount(ClinicalAuditView)
    const [from] = wrapper.findAll('input[type="date"]')

    await from.setValue('2020-01-01')

    expect(wrapper.text()).toContain('180')
    expect(wrapper.findAll('button').find(b => b.text() === 'Aplicar filtros')!.attributes('disabled')).toBeDefined()
  })

  it('pages through results: Siguiente only when the server says there is more, Anterior never on page 1', async () => {
    s.auditRows.value = [row({})]
    s.auditMore.value = true
    const wrapper = mount(ClinicalAuditView)
    const btn = (t: string) => wrapper.findAll('button').find(b => b.text() === t)!

    expect(btn('Anterior').attributes('disabled')).toBeDefined()
    expect(btn('Siguiente').attributes('disabled')).toBeUndefined()

    await btn('Siguiente').trigger('click')
    expect(wrapper.text()).toContain('Página 2')
    expect(s.auditFilters!().page).toBe(2)

    s.auditMore.value = false
    await btn('Siguiente').trigger('click').catch(() => {})
  })
})

describe('ReportSheet', () => {
  const sheet = (body: string, extra: Record<string, string> = {}) =>
    mount(ReportSheet, {
      props: { title: 'Informe psicológico', body, businessName: 'Consultorio Luz', professionalName: 'Lic. María Rivas', license: 'Psicóloga · FPV 123', city: 'Caracas', dateText: '5 de octubre de 2026', ...extra },
    })

  it('draws the letterhead, signature block, place/date and the confidentiality footer', () => {
    const text = sheet('Texto.').text()
    expect(text).toContain('Consultorio Luz')
    expect(text).toContain('Informe psicológico')
    expect(text).toContain('Caracas, 5 de octubre de 2026')
    expect(text).toContain('Lic. María Rivas')
    expect(text).toContain('FPV 123')
    expect(text).toContain('Firma y sello')
    expect(text).toContain('confidencial')
  })

  it('turns an UPPERCASE first line into a section heading and keeps the rest as body text', () => {
    const wrapper = sheet('Intro del informe.\n\nMOTIVO DE CONSULTA\nAnsiedad y falta de sueño.\n\nRECOMENDACIONES')
    const headings = wrapper.findAll('p.uppercase').map(p => p.text())

    expect(headings).toContain('MOTIVO DE CONSULTA')
    expect(wrapper.text()).toContain('Ansiedad y falta de sueño.')
    expect(wrapper.text()).toContain('Intro del informe.')
    // Un encabezado sin texto (RECOMENDACIONES) deja espacio en blanco para escribir a mano.
    expect(headings).toContain('RECOMENDACIONES')
    expect(wrapper.find('.h-16').exists()).toBe(true)
  })

  it('never treats a normal sentence as a heading', () => {
    const wrapper = sheet('Quien suscribe, hace constar.\n\nOTRO PÁRRAFO normal con minúsculas')
    expect(wrapper.findAll('p.uppercase').map(p => p.text())).not.toContain('OTRO PÁRRAFO normal con minúsculas')
  })

  it('omits the place/date line and license when they are not provided', () => {
    const text = sheet('x', { city: '', dateText: '', license: '' }).text()
    expect(text).not.toContain(', 5 de octubre')
    expect(text).not.toContain('FPV')
  })
})

