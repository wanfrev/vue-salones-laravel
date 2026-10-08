import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ── Dobles: refs reales de Vue (las vistas hacen watch y desenvuelven refs en el template) ──
const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    route: { path: '/admin/casos', params: {} as Record<string, string>, query: {} as Record<string, string> },
    push: vi.fn(),
    auth: { role: 'admin' as string | null },
    search: vi.fn(),
    cases: ref<unknown[]>([]),
    casesLoading: ref(false),
    casesAccess: ref(true),
    createPending: ref(false),
    createCase: vi.fn(),
    attachments: ref<unknown[]>([]),
    upload: vi.fn(),
    del: vi.fn(),
    download: vi.fn(),
    uploadPending: ref(false),
    falsy: ref(false),
    appt: { linked: ref<unknown>(null), linkable: ref<unknown[]>([]), link: vi.fn(), unlink: vi.fn(), pending: ref(false) },
    diagram: ref<unknown>(null),
    save: vi.fn(),
    savePending: ref(false),
  }
})

vi.mock('vue-router', () => ({ useRoute: () => s.route, useRouter: () => ({ push: s.push, replace: vi.fn() }) }))
vi.mock('../store/auth', () => ({ useAuthStore: () => ({ role: s.auth.role, businessId: 'biz-1', user: { id: 'u1' }, profile: { id: 'u1' } }) }))
vi.mock('../store/business', () => ({ useBusinessStore: () => ({ hasCapability: () => true }) }))
vi.mock('../services/clientesService', () => ({ getClienteById: vi.fn() }))
vi.mock('../services/clinical/caseService', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/clinical/caseService')>()),
  searchCasePatients: (...a: unknown[]) => s.search(...a),
}))
vi.mock('../composables/clinical/useCases', () => ({
  useCases: () => ({ cases: s.cases, isLoading: s.casesLoading, hasAccess: s.casesAccess, createMutation: { isPending: s.createPending, mutateAsync: s.createCase } }),
  useCase: () => ({ clinicalCase: { value: null }, isLoading: s.falsy }),
}))
vi.mock('../composables/clinical/useAttachments', () => ({
  useAttachments: () => ({
    attachments: s.attachments, isLoading: s.falsy,
    uploadMutation: { isPending: s.uploadPending, mutateAsync: s.upload },
    deleteMutation: { mutate: s.del },
    download: s.download,
  }),
}))
vi.mock('../composables/clinical/useAppointmentCase', () => ({
  useAppointmentCase: () => ({
    linkedCase: s.appt.linked, linkableCases: s.appt.linkable, isLoading: s.falsy,
    linkMutation: { mutate: s.appt.link, isPending: s.appt.pending },
    unlinkMutation: { mutate: s.appt.unlink, isPending: s.appt.pending },
  }),
}))
vi.mock('../composables/clinical/useDiagram', () => ({
  useDiagram: () => ({ diagram: s.diagram, isLoading: s.falsy, saveMutation: { isPending: s.savePending, mutateAsync: s.save } }),
}))

import ClinicalCasesView from './ClinicalCasesView.vue'
import ClinicalAttachmentsView from './ClinicalAttachmentsView.vue'
import CaseCreateForm from '../components/clinical/CaseCreateForm.vue'
import PatientPicker from '../components/clinical/PatientPicker.vue'
import AppointmentCaseLink from '../components/clinical/AppointmentCaseLink.vue'
import LifeLineEditor from '../components/clinical/LifeLineEditor.vue'
import LifeLineChart from '../components/clinical/LifeLineChart.vue'
import JointRecords from '../components/clinical/JointRecords.vue'

const routerLink = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const btn = (w: ReturnType<typeof mount>, text: string) => {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`No hay botón «${text}»`)
  return b
}
const patient = (id: string, name: string) => ({ id, full_name: name, phone: '0414-1', client_code: null })

beforeEach(() => {
  vi.useRealTimers()
  s.push.mockClear(); s.search.mockReset(); s.createCase.mockReset(); s.upload.mockReset(); s.del.mockClear(); s.download.mockReset()
  s.appt.link.mockClear(); s.appt.unlink.mockClear(); s.save.mockReset()
  s.route.path = '/admin/casos'
  s.route.params = {}
  s.auth.role = 'admin'
  s.cases.value = []; s.casesAccess.value = true; s.casesLoading.value = false
  s.attachments.value = []
  s.appt.linked.value = null; s.appt.linkable.value = []
  s.diagram.value = null
})

// ───────────────────────────────────────────────────────────────────────────────────────────────

describe('PatientPicker', () => {
  const mountPicker = (exclude: string[] = []) => mount(PatientPicker, { props: { exclude } })

  it('waits for 2 characters and debounces: typing fast makes ONE search', async () => {
    vi.useFakeTimers()
    s.search.mockResolvedValue([patient('1', 'Ana Pérez')])
    const w = mountPicker()
    const input = w.find('input')

    await input.setValue('a')
    await vi.advanceTimersByTimeAsync(400)
    expect(s.search).not.toHaveBeenCalled()

    await input.setValue('an'); await input.setValue('ana'); await input.setValue('ana p')
    await vi.advanceTimersByTimeAsync(400)
    expect(s.search).toHaveBeenCalledTimes(1)
    expect(s.search.mock.calls[0][0]).toBe('ana p')
  })

  it('never offers already-chosen patients and emits the pick, clearing the box', async () => {
    vi.useFakeTimers()
    s.search.mockResolvedValue([patient('1', 'Ana Pérez'), patient('2', 'Beto Ruiz')])
    const w = mountPicker(['1'])

    await w.find('input').setValue('ruiz')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    expect(w.text()).not.toContain('Ana Pérez')
    await w.findAll('li button').find(b => b.text().includes('Beto Ruiz'))!.trigger('click')
    expect(w.emitted('select')![0][0]).toEqual({ id: '2', full_name: 'Beto Ruiz', phone: '0414-1' })
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('shows names in title case and closes the list when the field loses focus', async () => {
    vi.useFakeTimers()
    s.search.mockResolvedValue([patient('1', 'ANA PÉREZ')])
    const w = mountPicker()
    await w.find('input').setValue('perez')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(w.text()).toContain('Ana Pérez')

    await w.find('input').trigger('blur')
    expect(w.find('ul').exists()).toBe(false)
    await w.find('input').setValue('perez2') // al seguir escribiendo vuelve a abrirse
    expect(w.find('ul').exists()).toBe(true)
  })

  it('ignores a slow response that arrives after a newer search (no stale results)', async () => {
    vi.useFakeTimers()
    let resolveSlow: (v: unknown) => void = () => {}
    s.search
      .mockImplementationOnce(() => new Promise(r => { resolveSlow = r }))
      .mockResolvedValueOnce([patient('9', 'Resultado Nuevo')])
    const w = mountPicker()

    await w.find('input').setValue('vieja')
    await vi.advanceTimersByTimeAsync(300)
    await w.find('input').setValue('nueva')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    resolveSlow([patient('1', 'Resultado Viejo')])
    await flushPromises()

    expect(w.text()).toContain('Resultado Nuevo')
    expect(w.text()).not.toContain('Resultado Viejo')
  })

  it('says so when nothing matches and survives a failing search', async () => {
    vi.useFakeTimers()
    s.search.mockRejectedValueOnce(new Error('red caída'))
    const w = mountPicker()
    await w.find('input').setValue('zzz')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(w.text()).toContain('Ningún paciente coincide')
  })
})

describe('CaseCreateForm', () => {
  const addPatients = async (w: ReturnType<typeof mount>, ...pairs: Array<[string, string]>) => {
    for (const [id, name] of pairs) w.findComponent(PatientPicker).vm.$emit('select', { id, full_name: name, phone: null })
    await flushPromises()
  }

  it('starts empty and cannot be submitted', () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Busca y agrega a las personas del caso')
  })

  it('a couple needs exactly two people: one is not enough, three is an error', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })

    await addPatients(w, ['1', 'Ana Pérez'])
    expect(w.text()).toContain('al menos 2')
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeDefined()

    await addPatients(w, ['2', 'Beto Ruiz'])
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeUndefined()

    await addPatients(w, ['3', 'Carla Soto'])
    expect(w.text()).toContain('exactamente 2')
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeDefined()
  })

  it('the same family of three is valid once the type is "Familia"', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    await addPatients(w, ['1', 'Ana Soto'], ['2', 'Beto Soto'], ['3', 'Carla Soto'])
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeDefined()

    await w.findAll('[role="radio"]').find(r => r.text().startsWith('Familia'))!.trigger('click')
    expect(btn(w, 'Crear caso').attributes('disabled')).toBeUndefined()
  })

  it('suggests a name until the user types their own, and never overwrites it afterwards', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    await addPatients(w, ['1', 'ANA PÉREZ'], ['2', 'beto ruiz'])
    const name = () => (w.find('input[placeholder^="Ej: Ana y Beto"]').element as HTMLInputElement).value
    expect(name()).toBe('Ana y Beto')

    await w.find('input[placeholder^="Ej: Ana y Beto"]').setValue('Mis pacientes')
    await w.findAll('[role="radio"]').find(r => r.text().startsWith('Familia'))!.trigger('click')
    expect(name()).toBe('Mis pacientes')
  })

  it('the first person added is the titular, and the chosen titular is sent in the payload', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    await addPatients(w, ['1', 'Ana Pérez'], ['2', 'Beto Ruiz'])
    const radios = () => w.findAll('input[type="radio"][name="titular"]')
    expect((radios()[0].element as HTMLInputElement).checked).toBe(true)

    await radios()[1].setValue(true)
    await btn(w, 'Crear caso').trigger('click')
    const [payload] = w.emitted('submit')![0] as [Record<string, any>]
    expect(payload).toMatchObject({ type: 'couple', name: 'Ana y Beto', primary_client_id: '2' })
    expect(payload.members).toEqual([{ client_id: '1', role: null }, { client_id: '2', role: null }])
  })

  it('removing the titular reassigns it so a case can never be submitted without one', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    await addPatients(w, ['1', 'Ana Pérez'], ['2', 'Beto Ruiz'])
    await w.findAll('button').find(b => b.text() === 'Quitar')!.trigger('click') // quita a Ana (la titular)
    await addPatients(w, ['3', 'Carla Soto'])
    await btn(w, 'Crear caso').trigger('click')
    expect((w.emitted('submit')![0][0] as { primary_client_id: string }).primary_client_id).toBe('2')
  })

  it('excludes already-added patients from the picker', async () => {
    const w = mount(CaseCreateForm, { props: { saving: false } })
    await addPatients(w, ['1', 'Ana Pérez'])
    expect(w.findComponent(PatientPicker).props('exclude')).toEqual(['1'])
  })
})

describe('ClinicalCasesView', () => {
  const kase = (over = {}) => ({
    id: 'c1', type: 'couple', name: 'Ana y Beto', status: 'active', opened_on: '2026-09-01', closed_on: null,
    members: [
      { client_id: '1', client_name: 'ANA PÉREZ', phone: null, role: null, is_primary: true, joined_on: null, left_on: null },
      { client_id: '2', client_name: 'beto ruiz', phone: null, role: null, is_primary: false, joined_on: null, left_on: null },
    ], ...over,
  })
  const mountView = () => mount(ClinicalCasesView, { global: { stubs: { 'router-link': routerLink } } })

  it('lists each case with its type, members and a link to it', () => {
    s.cases.value = [kase()]
    const w = mountView()
    expect(w.text()).toContain('Ana y Beto')
    expect(w.text()).toContain('Pareja')
    expect(w.text()).toContain('2 integrantes')
    expect(w.find('a[href="/admin/casos/c1/resumen"]').exists()).toBe(true)
  })

  it('uses the employee tree under /dashboard', () => {
    s.route.path = '/dashboard/casos'
    s.cases.value = [kase()]
    expect(mountView().find('a[href="/dashboard/casos/c1/resumen"]').exists()).toBe(true)
  })

  it('shows a friendly empty state and the lock message without clinical permission', () => {
    expect(mountView().text()).toContain('No hay casos activos')
    s.casesAccess.value = false
    expect(mountView().text()).toContain('No tienes permiso')
  })

  it('creating a case opens it; a failure keeps the form open', async () => {
    const w = mountView()
    await btn(w, 'Nuevo caso').trigger('click')
    const payload = { type: 'couple', name: 'X', primary_client_id: '1', members: [{ client_id: '1', role: null }, { client_id: '2', role: null }] }

    s.createCase.mockResolvedValueOnce({ id: 'nuevo' })
    w.findComponent(CaseCreateForm).vm.$emit('submit', payload)
    await flushPromises()
    expect(s.createCase).toHaveBeenCalledWith(payload)
    expect(s.push).toHaveBeenCalledWith('/admin/casos/nuevo/resumen')
    expect(w.findComponent(CaseCreateForm).exists()).toBe(false)

    await btn(w, 'Nuevo caso').trigger('click')
    s.push.mockClear()
    s.createCase.mockRejectedValueOnce(new Error('422'))
    w.findComponent(CaseCreateForm).vm.$emit('submit', payload)
    await flushPromises()
    expect(s.push).not.toHaveBeenCalled()
    expect(w.findComponent(CaseCreateForm).exists()).toBe(true)
  })
})

describe('AppointmentCaseLink (detalle de la cita en el calendario)', () => {
  const mountLink = () => mount(AppointmentCaseLink, { props: { appointmentId: 'ap-1', clientId: 'c-1' } })

  it('renders nothing when the patient has no case to link to', () => {
    expect(mountLink().html()).toBe('<!--v-if-->')
  })

  it('offers only the cases it was given and links the chosen one', async () => {
    s.appt.linkable.value = [{ id: 'k1', name: 'Pareja A' }, { id: 'k2', name: 'Familia B' }]
    const w = mountLink()
    expect(btn(w, 'Vincular').attributes('disabled')).toBeDefined()

    await w.find('select').setValue('k2')
    await btn(w, 'Vincular').trigger('click')
    expect(s.appt.link).toHaveBeenCalledWith('k2', expect.anything())
  })

  it('shows the linked case, lets you remove it, and tells the parent which case it is', async () => {
    s.appt.linked.value = { id: 'k1', name: 'Pareja A', type: 'couple', status: 'active' }
    const w = mountLink()
    expect(w.text()).toContain('Sesión del caso: Pareja A')
    expect(w.emitted('linked')![0][0]).toMatchObject({ id: 'k1' })

    await btn(w, 'Quitar').trigger('click')
    expect(s.appt.unlink).toHaveBeenCalledWith('k1')
  })
})

describe('ClinicalAttachmentsView', () => {
  const att = (over = {}) => ({ id: 'a1', category: 'test_result', title: 'MMPI-2', original_name: 'mmpi.pdf', mime: 'application/pdf', size: 2048, created_at: '2026-10-01T10:00:00-04:00', ...over })
  const mountView = () => { s.route.params = { id: 'c1' }; return mount(ClinicalAttachmentsView) }
  const pick = async (w: ReturnType<typeof mount>, name: string, size: number) => {
    const input = w.find('input[type="file"]')
    const file = new File(['x'], name)
    Object.defineProperty(file, 'size', { value: size })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    return file
  }

  it('lists files with category, readable size and the encryption notice', () => {
    s.attachments.value = [att()]
    const t = mountView().text()
    expect(t).toContain('MMPI-2')
    expect(t).toContain('Resultado de prueba')
    expect(t).toContain('2 KB')
    expect(t).toContain('cifrado')
  })

  it('upload stays disabled until there is a valid file AND a title; the title is suggested from the name', async () => {
    const w = mountView()
    expect(btn(w, 'Subir archivo').attributes('disabled')).toBeDefined()

    await pick(w, 'resultados_mmpi.pdf', 1000)
    expect((w.find('input[placeholder^="Ej: MMPI"]').element as HTMLInputElement).value).toBe('Resultados mmpi')
    expect(btn(w, 'Subir archivo').attributes('disabled')).toBeUndefined()
  })

  it('refuses bad formats and oversized files with a clear message, without calling the server', async () => {
    const w = mountView()
    await pick(w, 'virus.exe', 100)
    expect(w.text()).toContain('Formato no permitido')
    expect(btn(w, 'Subir archivo').attributes('disabled')).toBeDefined()

    await pick(w, 'enorme.pdf', 11 * 1024 * 1024)
    expect(w.text()).toContain('supera el máximo')
    expect(s.upload).not.toHaveBeenCalled()
  })

  it('uploads with the chosen category/title and resets the form on success, keeps it on failure', async () => {
    const w = mountView()
    const file = await pick(w, 'informe.pdf', 500)
    await w.find('input[placeholder^="Ej: MMPI"]').setValue('Informe del pediatra')
    await w.find('select').setValue('external_report')

    s.upload.mockRejectedValueOnce(new Error('falló'))
    await btn(w, 'Subir archivo').trigger('click'); await flushPromises()
    expect((w.find('input[placeholder^="Ej: MMPI"]').element as HTMLInputElement).value).toBe('Informe del pediatra') // se conserva

    s.upload.mockResolvedValueOnce({})
    await btn(w, 'Subir archivo').trigger('click'); await flushPromises()
    expect(s.upload).toHaveBeenLastCalledWith({ category: 'external_report', title: 'Informe del pediatra', file })
    expect((w.find('input[placeholder^="Ej: MMPI"]').element as HTMLInputElement).value).toBe('')
  })

  it('only the admin sees "Eliminar", and deleting asks for confirmation', async () => {
    s.attachments.value = [att()]
    s.auth.role = 'empleado'
    expect(mountView().findAll('button').some(b => b.text() === 'Eliminar')).toBe(false)

    s.auth.role = 'admin'
    const w = mountView()
    // happy-dom no trae window.confirm: se define uno controlable.
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    ;(window as unknown as { confirm: unknown }).confirm = confirm

    await btn(w, 'Eliminar').trigger('click')
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(s.del).not.toHaveBeenCalled() // dijo que no

    await btn(w, 'Eliminar').trigger('click')
    expect(s.del).toHaveBeenCalledWith('a1') // dijo que sí
  })

  it('download goes through the authenticated helper', async () => {
    s.attachments.value = [att()]
    s.download.mockResolvedValue(true)
    await btn(mountView(), 'Descargar').trigger('click')
    await flushPromises()
    expect(s.download).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', original_name: 'mmpi.pdf' }))
  })
})

describe('LifeLineEditor', () => {
  const mountEditor = (birthYear: number | null = null) => mount(LifeLineEditor, { props: { scope: { kind: 'client', id: 'c1' }, birthYear } })
  const saved = (events: unknown[]) => ({ id: 'd1', type: 'life_line', client_id: 'c1', case_id: null, data: { events }, updated_at: '' })

  it('starts empty with a helpful hint and nothing to save', () => {
    const w = mountEditor()
    expect(w.text()).toContain('Registra los hechos importantes')
    expect(btn(w, 'Guardar línea de vida').attributes('disabled')).toBeDefined()
  })

  it('adding an event enables saving only once it has a title; saves a trimmed, ordered payload', async () => {
    const w = mountEditor()
    await btn(w, 'Agregar evento').trigger('click')
    expect(btn(w, 'Guardar línea de vida').attributes('disabled')).toBeDefined() // sin título
    expect(w.text()).toContain('Cada evento necesita un título')

    await w.find('input[placeholder^="Ej: Se mudó"]').setValue('  Mudanza  ')
    expect(btn(w, 'Guardar línea de vida').attributes('disabled')).toBeUndefined()

    s.save.mockResolvedValue(saved([]))
    await btn(w, 'Guardar línea de vida').trigger('click')
    const [payload] = s.save.mock.calls[0] as [{ events: Array<{ title: string; valence: number }> }]
    expect(payload.events).toHaveLength(1)
    expect(payload.events[0]).toMatchObject({ title: 'Mudanza', valence: 0 })
  })

  it('loads a saved line, shows the summary, and marks "unsaved" only after a real change', async () => {
    s.diagram.value = saved([
      { id: 'a', year: 1990, age: null, title: 'Nacimiento', valence: 2, note: '' },
      { id: 'b', year: 2010, age: null, title: 'Pérdida', valence: -2, note: '' },
    ])
    const w = mountEditor()
    expect(w.text()).toContain('2 eventos · 1 negativo')
    expect(w.text()).not.toContain('Cambios sin guardar')

    await w.findAll('input[placeholder^="Ej: Se mudó"]')[1].setValue('Pérdida importante')
    expect(w.text()).toContain('Cambios sin guardar')
  })

  it('shows the approximate age at each event when the birth year is known', () => {
    s.diagram.value = saved([{ id: 'a', year: 2010, age: null, title: 'x', valence: 0, note: '' }])
    expect(mountEditor(1998).text()).toContain('≈ 12 años')
    expect(mountEditor(null).text()).not.toContain('≈')
  })

  it('removing an event updates the chart and the summary', async () => {
    s.diagram.value = saved([{ id: 'a', year: 2000, age: null, title: 'Uno', valence: 1, note: '' }, { id: 'b', year: 2001, age: null, title: 'Dos', valence: -1, note: '' }])
    const w = mountEditor()
    expect(w.findAll('circle')).toHaveLength(2)
    await w.findAll('button').find(b => b.text() === 'Quitar')!.trigger('click')
    expect(w.findAll('circle')).toHaveLength(1)
    expect(w.text()).toContain('1 evento')
  })

  it('a failed save keeps the edits (no data loss)', async () => {
    const w = mountEditor()
    await btn(w, 'Agregar evento').trigger('click')
    await w.find('input[placeholder^="Ej: Se mudó"]').setValue('Evento')
    s.save.mockRejectedValueOnce(new Error('falló'))
    await btn(w, 'Guardar línea de vida').trigger('click'); await flushPromises()
    expect(w.text()).toContain('Cambios sin guardar')
    expect((w.find('input[placeholder^="Ej: Se mudó"]').element as HTMLInputElement).value).toBe('Evento')
  })
})

describe('LifeLineChart', () => {
  it('draws one point per event colored by impact, with an accessible title, and emits the selection', async () => {
    const events = [
      { id: 'a', year: 1990, age: null, title: 'Nacimiento', valence: 2 as const, note: '' },
      { id: 'b', year: 2005, age: null, title: 'Pérdida', valence: -2 as const, note: '' },
    ]
    const w = mount(LifeLineChart, { props: { events } })
    expect(w.findAll('circle')).toHaveLength(2)
    expect(w.find('svg').attributes('aria-label')).toContain('2 eventos')
    expect(w.text()).toContain('Nacimiento')
    await w.findAll('g.cursor-pointer')[1].trigger('click')
    expect(w.emitted('select')![0]).toEqual(['b'])
  })

  it('shows an empty-state message with no events', () => {
    expect(mount(LifeLineChart, { props: { events: [] } }).text()).toContain('Agrega eventos')
  })
})

describe('JointRecords', () => {
  it('renders nothing when there is nothing joint', () => {
    expect(mount(JointRecords, { props: { basePath: '/admin' } }).html()).toBe('<!--v-if-->')
  })
})
