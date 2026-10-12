import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// La consulta de choques va al servidor: aquí se controla con un doble.
const checkConflicts = vi.hoisted(() => vi.fn())
vi.mock('../../services/clinical/programService', () => ({ checkEnrollmentConflicts: checkConflicts }))

import EnrollmentForm from './EnrollmentForm.vue'
import EnrollmentCard from './EnrollmentCard.vue'
import ProgramForm from './ProgramForm.vue'
import type { ClinicalEnrollment, ClinicalProgram } from '../../types/database'

const svc = (id: string, name: string) => ({ id, name, duration_minutes: 50 })

// Una especialidad, con su especialista.
const ESTIM: ClinicalProgram = {
  id: 'p1', name: 'Estimulación temprana', price: 120, validity_days: 30, active: true, sessions_total: 4,
  components: [{ service_ids: ['s-est'], quantity: 4, employee_id: 'dra-soto', employee_name: 'Dra. Soto', services: [svc('s-est', 'Estimulación')] }],
}
// Dos especialidades, cada una con su especialista distinto.
const MIXTO: ClinicalProgram = {
  id: 'p2', name: 'Programa mixto', price: 180, validity_days: 30, active: true, sessions_total: 4,
  components: [
    { service_ids: ['s-len'], quantity: 2, employee_id: 'dra-soto', employee_name: 'Dra. Soto', services: [svc('s-len', 'Lenguaje')] },
    { service_ids: ['s-psi', 's-aba'], quantity: 2, employee_id: 'lic-rojas', employee_name: 'Lic. Rojas', services: [svc('s-psi', 'Psicopedagogía'), svc('s-aba', 'ABA')] },
  ],
}
// Sin especialista asignado: obliga a elegir un profesional por defecto.
const ABIERTO: ClinicalProgram = {
  id: 'p3', name: 'Abierto', price: 60, validity_days: 30, active: true, sessions_total: 2,
  components: [{ service_ids: ['s-len'], quantity: 2, employee_id: null, employee_name: null, services: [svc('s-len', 'Lenguaje')] }],
}
const EMPLOYEES = [{ id: 'dra-soto', name: 'Dra. Soto' }, { id: 'lic-rojas', name: 'Lic. Rojas' }]

const mountForm = (props: Record<string, unknown> = {}) => mount(EnrollmentForm, {
  props: { patient: { id: 'c1', full_name: '' }, programs: [ESTIM, MIXTO, ABIERTO], employees: EMPLOYEES, saving: false, ...props },
  global: { stubs: { PatientPicker: true } },
})

type W = ReturnType<typeof mountForm>
const selectProgram = async (w: W, id: string) => { await w.findAll('select')[0].setValue(id) }
// 8 de octubre de 2026 es jueves; por defecto vienen lunes y jueves.
const fillBasics = async (w: W) => { await w.find('input[type="date"]').setValue('2026-10-08') }
const submit = (w: W) => w.findAll('button').find(b => b.text().includes('Inscribir y crear citas'))!.trigger('click')
const rowsOf = (w: W) => w.findAll('input[type="datetime-local"]').map(i => (i.element as HTMLInputElement).value)
const sent = (w: W) => w.emitted('submit')![0][0] as { clientId: string; payload: Record<string, any> }

beforeEach(() => {
  checkConflicts.mockReset()
  checkConflicts.mockResolvedValue([])
})

describe('EnrollmentForm', () => {
  it('shows nothing to schedule until a program is chosen', () => {
    const w = mountForm()
    expect(w.findAll('input[type="datetime-local"]')).toHaveLength(0)
    expect(w.find('button:last-child').attributes('disabled')).toBeDefined()
  })

  it('proposes one dated row per session and shows the specialties with their specialists', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)

    expect(rowsOf(w)).toEqual(['2026-10-08T16:00', '2026-10-12T16:00', '2026-10-15T16:00', '2026-10-19T16:00'])
    expect(w.text()).toContain('4 sesiones por $120')
    expect(w.text()).toContain('Estimulación')
    expect(w.text()).toContain('Dra. Soto')
    expect(w.text()).toMatch(/Vence el/)
  })

  // ── La hora puede ser distinta cada día ──

  it('each chosen weekday has its own time, and the proposal uses it', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)

    await w.find('input[aria-label="Hora del Jue"]').setValue('17:30')
    expect(rowsOf(w)).toEqual(['2026-10-08T17:30', '2026-10-12T16:00', '2026-10-15T17:30', '2026-10-19T16:00'])
  })

  it('changing the time of one weekday leaves the sessions adjusted by hand alone', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)

    await w.findAll('input[type="datetime-local"]')[2].setValue('2026-10-15T09:00') // el jueves 15, a mano
    await w.find('input[aria-label="Hora del Jue"]').setValue('18:00')

    expect(rowsOf(w)).toEqual(['2026-10-08T18:00', '2026-10-12T16:00', '2026-10-15T09:00', '2026-10-19T16:00'])
  })

  it('a day added later starts with the usual hour and can be changed too', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('button').find(b => b.text() === 'Mié')!.trigger('click')

    expect((w.find('input[aria-label="Hora del Mié"]').element as HTMLInputElement).value).toBe('16:00')
    await w.find('input[aria-label="Hora del Mié"]').setValue('15:00')
    expect(w.text()).toContain('Hora de cada día')
    expect(rowsOf(w)).toContain('2026-10-14T15:00') // miércoles 14
  })

  it('recalculates the proposal when the weekdays change', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('button').find(b => b.text() === 'Lun')!.trigger('click') // deja solo el jueves
    expect(rowsOf(w)[1]).toBe('2026-10-15T16:00')
  })

  it('lets the person adjust the date and hour of one session', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('input[type="datetime-local"]')[2].setValue('2026-10-16T10:00')
    await submit(w)

    expect(new Date(sent(w).payload.sessions[2].start_time).getTime()).toBe(new Date('2026-10-16T10:00').getTime())
  })

  // ── Especialistas por especialidad ──

  it('each session comes with the specialist of its specialty — no professional to choose', async () => {
    const w = mountForm()
    await selectProgram(w, 'p2')
    await fillBasics(w)

    // Alterna: lenguaje (Dra. Soto), psicopedagogía (Lic. Rojas)...
    const specialists = w.findAll('select[aria-label^="Especialista de la sesión"]').map(s => (s.element as HTMLSelectElement).value)
    expect(specialists).toEqual(['dra-soto', 'lic-rojas', 'dra-soto', 'lic-rojas'])
    expect(w.text()).not.toContain('Profesional por defecto') // todas las especialidades tienen especialista

    await submit(w)
    const { payload } = sent(w)
    expect(payload.sessions.map((s: any) => [s.service_id, s.employee_id])).toEqual([
      ['s-len', 'dra-soto'], ['s-psi', 'lic-rojas'], ['s-len', 'dra-soto'], ['s-psi', 'lic-rojas'],
    ])
  })

  it('shows how many sessions each specialty has and warns when they do not add up', async () => {
    const w = mountForm()
    await selectProgram(w, 'p2')
    await fillBasics(w)
    expect(w.text()).toContain('Lenguaje: 2 de 2')
    expect(w.text()).toContain('Psicopedagogía / ABA: 2 de 2')

    await w.findAll('select[aria-label^="Especialidad de la sesión"]')[1].setValue('s-len') // una de psicopedagogía pasa a lenguaje
    expect(w.text()).toContain('Lenguaje: 3 de 2')
    await submit(w)
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('no coinciden con el programa')
  })

  it('changing the specialty of a session switches to that specialty\'s specialist, unless it was chosen by hand', async () => {
    const w = mountForm()
    await selectProgram(w, 'p2')
    await fillBasics(w)
    const specialty = (i: number) => w.findAll('select[aria-label^="Especialidad de la sesión"]')[i]
    const specialist = (i: number) => w.findAll('select[aria-label^="Especialista de la sesión"]')[i]

    await specialty(0).setValue('s-aba')                       // lenguaje → ABA: pasa a la Lic. Rojas
    expect((specialist(0).element as HTMLSelectElement).value).toBe('lic-rojas')

    await specialist(1).setValue('dra-soto')                   // la sesión 2 la atiende otra persona, a mano
    await specialty(1).setValue('s-aba')                       // y aunque cambie de servicio se respeta
    expect((specialist(1).element as HTMLSelectElement).value).toBe('dra-soto')
  })

  it('one session can be given to another specialist', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('select[aria-label^="Especialista de la sesión"]')[3].setValue('lic-rojas')
    await submit(w)

    expect(sent(w).payload.sessions.map((s: any) => s.employee_id)).toEqual(['dra-soto', 'dra-soto', 'dra-soto', 'lic-rojas'])
  })

  it('asks for a default professional only when some specialty has no specialist, and uses it for those', async () => {
    const w = mountForm()
    await selectProgram(w, 'p3')
    await fillBasics(w)
    expect(w.text()).toContain('Profesional por defecto')

    await submit(w) // sin especialista ni profesional por defecto
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('Falta el especialista')

    await w.findAll('select')[1].setValue('lic-rojas')
    await submit(w)
    expect(sent(w).payload.employee_id).toBe('lic-rojas')
    expect(sent(w).payload.sessions.map((s: any) => s.employee_id)).toEqual(['lic-rojas', 'lic-rojas'])
  })

  // ── Choques con la agenda del especialista ──

  it('asks the server which sessions clash and marks only those rows', async () => {
    checkConflicts.mockResolvedValue([{ index: 1, message: 'el especialista ya tiene una cita en ese horario.' }])
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await new Promise(r => setTimeout(r, 450)); await flushPromises()

    expect(checkConflicts).toHaveBeenCalled()
    const body = checkConflicts.mock.calls.at(-1)![0] as Array<{ employee_id: string; service_id: string; start_time: string }>
    expect(body).toHaveLength(4)
    expect(body[0]).toMatchObject({ employee_id: 'dra-soto', service_id: 's-est' })
    expect(w.text()).toContain('Sesión 2: el especialista ya tiene una cita en ese horario.')
    expect(w.text()).not.toContain('Sesión 1: el especialista')
  })

  it('does not let you submit while a clash is marked, and lets you once the hour is fixed', async () => {
    checkConflicts.mockResolvedValueOnce([{ index: 0, message: 'el especialista ya tiene una cita en ese horario.' }]).mockResolvedValue([])
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await new Promise(r => setTimeout(r, 450)); await flushPromises()

    await submit(w)
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('Corrige las sesiones marcadas en rojo')

    await w.findAll('input[type="datetime-local"]')[0].setValue('2026-10-08T17:30') // otra hora ese mismo día
    await new Promise(r => setTimeout(r, 450)); await flushPromises()
    await submit(w)
    expect(w.emitted('submit')).toHaveLength(1)
  })

  it('if the check fails nothing is marked and the server decides on submit', async () => {
    checkConflicts.mockRejectedValue(new Error('sin red'))
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await new Promise(r => setTimeout(r, 450)); await flushPromises()
    await submit(w)
    expect(w.emitted('submit')).toHaveLength(1)
  })

  it('shows the reason the server gave when it refused the enrollment', async () => {
    const w = mountForm({ error: 'Sesión 3 (14/10): el especialista ya tiene una cita en ese horario.' })
    await selectProgram(w, 'p1')
    expect(w.find('[role="alert"]').text()).toContain('Sesión 3')
  })

  // ── Lo de siempre ──

  it('emits the patient, program, first date and every session in UTC', async () => {
    const w = mountForm({ branchId: 'b1' })
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await submit(w)

    const { clientId, payload } = sent(w)
    expect(clientId).toBe('c1')
    expect(payload).toMatchObject({ program_id: 'p1', employee_id: null, branch_id: 'b1', starts_on: '2026-10-08' })
    expect(payload.sessions).toHaveLength(4)
    expect(payload.sessions.every((s: any) => s.service_id === 's-est' && s.start_time.endsWith('Z'))).toBe(true)
  })

  it('refuses sessions that do not fit the validity', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('input[type="datetime-local"]')[3].setValue('2027-03-01T16:00')
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('30 días de vigencia')
  })

  it('warns right away when the chosen days cannot fit the sessions in the validity', async () => {
    const w = mountForm()
    await selectProgram(w, 'p3')
    await fillBasics(w)
    await w.findAll('button').find(b => b.text() === 'Lun')!.trigger('click')
    await w.findAll('button').find(b => b.text() === 'Jue')!.trigger('click')
    await w.findAll('button').find(b => b.text() === 'Dom')!.trigger('click') // un solo día a la semana: 2 sesiones sí caben
    expect(w.text()).not.toContain('no caben')

    const w2 = mountForm()
    await selectProgram(w2, 'p2')
    await w2.find('input[type="date"]').setValue('2026-10-08')
    for (const d of ['Lun', 'Jue']) await w2.findAll('button').find(b => b.text() === d)!.trigger('click')
    await w2.findAll('button').find(b => b.text() === 'Dom')!.trigger('click')
    await w2.findAll('input[type="datetime-local"]')[3].setValue('2026-12-30T16:00')
    expect(w2.text()).toContain('no caben en los 30 días')
  })

  it('refuses two sessions at the same date and time', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    const inputs = w.findAll('input[type="datetime-local"]')
    await inputs[1].setValue((inputs[0].element as HTMLInputElement).value)
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('misma fecha y hora')
  })

  it('without a fixed patient it asks for one first', async () => {
    const w = mountForm({ patient: null })
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await submit(w)
    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('Elige al paciente')
  })
})

// ───────────────────────────────────────────────────────────────────────────────────────────────

const enrollment = (over: Partial<ClinicalEnrollment> = {}): ClinicalEnrollment => ({
  id: 'e1', client_id: 'c1', program_id: 'p1', program_name: 'Estimulación temprana', price: 120, sessions_total: 8,
  starts_on: '2026-10-08', expires_on: '2026-11-07', status: 'active', used: 3, remaining: 5, is_paid: false,
  sessions: [
    { appointment_id: 'a1', number: 1, start_time: '2026-10-08T20:00:00Z', status: 'completed', payment_status: 'unpaid', service_id: 's', service_name: 'Estimulación', employee_id: 'd', employee_name: 'Dra. Soto', consumes: null, counted: true },
    { appointment_id: 'a2', number: 2, start_time: '2026-10-12T20:00:00Z', status: 'cancelled', payment_status: 'unpaid', service_id: 's', service_name: 'Estimulación', employee_id: 'd', employee_name: 'Dra. Soto', consumes: null, counted: false },
  ],
  ...over,
})

describe('EnrollmentCard', () => {
  it('shows the count, the progress, the sessions and whether it still has to be paid', () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment(), isAdmin: false } })
    expect(w.text()).toContain('3 de 8 sesiones realizadas')
    expect(w.text()).toContain('5 por usar')
    expect(w.text()).toContain('Por cobrar en el POS')
    expect(w.text()).toContain('Realizada')
    expect(w.text()).toContain('Cancelada')
    expect(w.find('[role="progressbar"] > div').attributes('style')).toContain('width: 38%')
  })

  it('shows «Pagado» once paid, and the expired warning', () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment({ is_paid: true, status: 'expired' }), isAdmin: false } })
    expect(w.text()).toContain('Pagado')
    expect(w.text()).toContain('Venció con 5 sesiones sin usar')
  })

  it('reception sees no administration controls', () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment(), isAdmin: false } })
    expect(w.find('select').exists()).toBe(false)
    expect(w.text()).not.toContain('Cancelar programa')
    expect(w.text()).not.toContain('Extender vigencia')
  })

  it('administration can force whether a session counts, and goes back to automatic', async () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment(), isAdmin: true } })
    const select = w.find('select[aria-label="Criterio de la sesión 2"]')
    await select.setValue('yes')
    await select.setValue('auto')
    expect(w.emitted('consumes')).toEqual([['a2', true], ['a2', null]])
  })

  it('administration can extend the validity (only with a different date)', async () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment(), isAdmin: true } })
    const save = w.findAll('button').find(b => b.text() === 'Guardar')!
    expect(save.attributes('disabled')).toBeDefined()
    await w.find('input[type="date"]').setValue('2026-12-01')
    await save.trigger('click')
    expect(w.emitted('extend')).toEqual([['2026-12-01']])
  })

  it('cancelling asks first and only exists while unpaid', async () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment(), isAdmin: true } })
    const cancel = () => w.findAll('button').find(b => b.text() === 'Cancelar programa')!

    window.confirm = () => false
    await cancel().trigger('click')
    expect(w.emitted('cancel')).toBeUndefined()

    window.confirm = () => true
    await cancel().trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)

    const paid = mount(EnrollmentCard, { props: { enrollment: enrollment({ is_paid: true }), isAdmin: true } })
    expect(paid.text()).not.toContain('Cancelar programa')
  })

  it('a cancelled enrollment has no controls', () => {
    const w = mount(EnrollmentCard, { props: { enrollment: enrollment({ status: 'cancelled' }), isAdmin: true } })
    expect(w.find('select').exists()).toBe(false)
    expect(w.text()).not.toContain('Pagado')
    expect(w.text()).not.toContain('Por cobrar')
  })
})

// ───────────────────────────────────────────────────────────────────────────────────────────────

describe('ProgramForm', () => {
  const services = [{ id: 's-len', name: 'Lenguaje' }, { id: 's-aba', name: 'ABA' }, { id: 's-ase', name: 'Asesoría' }]
  const mountProgram = (props: Record<string, unknown> = {}) => mount(ProgramForm, { props: { services, employees: EMPLOYEES, saving: false, ...props } })
  const save = (w: ReturnType<typeof mountProgram>) => w.findAll('button').find(b => b.text() === 'Guardar programa')!
  const chip = (w: ReturnType<typeof mountProgram>, name: string, nth = 0) => w.findAll('button[aria-pressed]').filter(b => b.text() === name)[nth]
  const specialist = (w: ReturnType<typeof mountProgram>, nth = 0) => w.findAll('select')[nth]

  it('cannot be saved empty, and says what is missing', async () => {
    const w = mountProgram()
    expect(save(w).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Ponle un nombre')
  })

  it('builds the payload: name, price, validity and a specialty with its services and no specialist yet', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('Terapias de lenguaje') // nombre
    await inputs[1].setValue('120')                    // precio
    await inputs[2].setValue('30')                     // vigencia
    await chip(w, 'Lenguaje').trigger('click')
    await save(w).trigger('click')

    expect(w.emitted('submit')![0][0]).toEqual({
      name: 'Terapias de lenguaje', price: 120, validity_days: 30,
      components: [{ service_ids: ['s-len'], quantity: 8, employee_id: null }],
    })
  })

  it('each specialty gets its own specialist (the mixed program has two specialties)', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('Programa mixto')
    await inputs[1].setValue('180')
    await chip(w, 'Lenguaje').trigger('click')
    await inputs[3].setValue('6')
    await specialist(w, 0).setValue('dra-soto')
    expect(w.text()).toContain('Especialidades del programa')

    await w.findAll('button').find(b => b.text().includes('Agregar otra especialidad'))!.trigger('click')
    await w.findAll('input')[4].setValue('6')
    await chip(w, 'ABA', 1).trigger('click') // el chip «ABA» de la 2.ª especialidad
    await specialist(w, 1).setValue('lic-rojas')
    expect(w.text()).toContain('Total: 12 sesiones')

    await save(w).trigger('click')
    expect((w.emitted('submit')![0][0] as any).components).toEqual([
      { service_ids: ['s-len'], quantity: 6, employee_id: 'dra-soto' },
      { service_ids: ['s-aba'], quantity: 6, employee_id: 'lic-rojas' },
    ])
  })

  it('offers the team to choose the specialist, and «Sin asignar» by default', () => {
    const w = mountProgram()
    expect(specialist(w).findAll('option').map(o => o.text())).toEqual(['Sin asignar (se elige al inscribir)', 'Dra. Soto', 'Lic. Rojas'])
    expect((specialist(w).element as HTMLSelectElement).value).toBe('')
  })

  it('needs at least one service in each specialty', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('Programa')
    await inputs[1].setValue('10')
    expect(w.text()).toContain('Elige al menos un servicio')
    expect(save(w).attributes('disabled')).toBeDefined()
  })

  it('editing starts from the program (its specialists included), shows the active switch and never mutates the original', async () => {
    const original = JSON.parse(JSON.stringify(MIXTO)) as ClinicalProgram
    const w = mountProgram({ initial: MIXTO })

    expect(w.text()).toContain('Editar programa')
    expect(w.text()).toContain('Programa activo')
    expect((specialist(w, 0).element as HTMLSelectElement).value).toBe('dra-soto')
    expect((specialist(w, 1).element as HTMLSelectElement).value).toBe('lic-rojas')

    await w.findAll('input')[1].setValue('200')
    await specialist(w, 1).setValue('dra-soto')
    await w.find('input[type="checkbox"]').setValue(false)
    await save(w).trigger('click')

    const out = w.emitted('submit')![0][0] as any
    expect(out).toMatchObject({ name: 'Programa mixto', price: 200, active: false })
    expect(out.components.map((c: any) => c.employee_id)).toEqual(['dra-soto', 'dra-soto'])
    expect(MIXTO).toEqual(original)
  })
})
