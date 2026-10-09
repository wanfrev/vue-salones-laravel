import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EnrollmentForm from './EnrollmentForm.vue'
import EnrollmentCard from './EnrollmentCard.vue'
import ProgramForm from './ProgramForm.vue'
import type { ClinicalEnrollment, ClinicalProgram } from '../../types/database'

const svc = (id: string, name: string) => ({ id, name, duration_minutes: 50 })

const ESTIM: ClinicalProgram = {
  id: 'p1', name: 'Estimulación temprana', price: 120, validity_days: 30, active: true, sessions_total: 8,
  components: [{ service_ids: ['s-est'], quantity: 8, services: [svc('s-est', 'Estimulación')] }],
}
const MIXTO: ClinicalProgram = {
  id: 'p2', name: 'Programa mixto', price: 180, validity_days: 30, active: true, sessions_total: 3,
  components: [
    { service_ids: ['s-len', 's-aba'], quantity: 2, services: [svc('s-len', 'Lenguaje'), svc('s-aba', 'ABA')] },
    { service_ids: ['s-ase'], quantity: 1, services: [svc('s-ase', 'Asesoría para padres')] },
  ],
}
const EMPLOYEES = [{ id: 'e1', name: 'Dra. Soto' }]

const mountForm = (props: Record<string, unknown> = {}) => mount(EnrollmentForm, {
  props: { patient: { id: 'c1', full_name: '' }, programs: [ESTIM, MIXTO], employees: EMPLOYEES, saving: false, ...props },
  global: { stubs: { PatientPicker: true } },
})

const selectProgram = async (w: ReturnType<typeof mount>, id: string) => {
  await w.findAll('select')[0].setValue(id)
}
const fillBasics = async (w: ReturnType<typeof mount>) => {
  await w.find('input[type="date"]').setValue('2026-10-08') // jueves
  await w.find('input[type="time"]').setValue('16:00')
}
const submit = (w: ReturnType<typeof mount>) => w.findAll('button').find(b => b.text().includes('Inscribir y crear citas'))!.trigger('click')

describe('EnrollmentForm', () => {
  it('shows nothing to schedule until a program is chosen', () => {
    const w = mountForm()
    expect(w.findAll('input[type="datetime-local"]')).toHaveLength(0)
    expect(w.find('button:last-child').attributes('disabled')).toBeDefined()
  })

  it('proposes one dated row per session (Monday and Thursday by default) and shows the expiry', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)

    const inputs = w.findAll('input[type="datetime-local"]')
    expect(inputs).toHaveLength(8)
    expect((inputs[0].element as HTMLInputElement).value).toBe('2026-10-08T16:00')
    expect((inputs[1].element as HTMLInputElement).value).toBe('2026-10-12T16:00')
    expect(w.text()).toContain('8 sesiones por $120')
    expect(w.text()).toMatch(/Vence el/)
  })

  it('recalculates the proposal when the weekdays change', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)

    const mon = w.findAll('button').find(b => b.text() === 'Lun')!
    await mon.trigger('click') // deja solo el jueves
    const inputs = w.findAll('input[type="datetime-local"]')
    expect((inputs[1].element as HTMLInputElement).value).toBe('2026-10-15T16:00')
  })

  it('lets the person adjust the date of one session', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('input[type="datetime-local"]')[2].setValue('2026-10-16T10:00')
    await w.findAll('select')[1].setValue('e1')
    await submit(w)

    const sent = w.emitted('submit')![0][0] as { payload: { sessions: Array<{ start_time: string }> } }
    expect(new Date(sent.payload.sessions[2].start_time).getTime()).toBe(new Date('2026-10-16T10:00').getTime())
  })

  it('emits the patient, program, professional, first date and every session in UTC', async () => {
    const w = mountForm({ branchId: 'b1' })
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('select')[1].setValue('e1')
    await submit(w)

    const { clientId, payload } = w.emitted('submit')![0][0] as { clientId: string; payload: Record<string, any> }
    expect(clientId).toBe('c1')
    expect(payload).toMatchObject({ program_id: 'p1', employee_id: 'e1', branch_id: 'b1', starts_on: '2026-10-08' })
    expect(payload.sessions).toHaveLength(8)
    expect(payload.sessions.every((s: any) => s.service_id === 's-est' && s.start_time.endsWith('Z'))).toBe(true)
  })

  it('refuses to submit without a professional, and says why', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('Elige al profesional')
  })

  it('refuses sessions that do not fit the validity', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('select')[1].setValue('e1')
    await w.findAll('input[type="datetime-local"]')[7].setValue('2027-03-01T16:00')
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('30 días de vigencia')
  })

  it('warns right away when the chosen days cannot fit the sessions in the validity', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    expect(w.text()).not.toContain('no caben')

    await w.findAll('button').find(b => b.text() === 'Lun')!.trigger('click') // solo los jueves: 8 semanas > 30 días
    expect(w.text()).toContain('no caben en los 30 días')
  })

  it('refuses two sessions at the same date and time', async () => {
    const w = mountForm()
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('select')[1].setValue('e1')
    const inputs = w.findAll('input[type="datetime-local"]')
    await inputs[1].setValue((inputs[0].element as HTMLInputElement).value)
    await submit(w)

    expect(w.emitted('submit')).toBeUndefined()
    expect(w.text()).toContain('misma fecha y hora')
  })

  it('in the mixed program, a session picks its service among its component and the extra is fixed', async () => {
    const w = mountForm()
    await selectProgram(w, 'p2')
    await fillBasics(w)
    await w.findAll('select')[1].setValue('e1')

    const serviceSelects = w.findAll('select[aria-label^="Servicio de la sesión"]')
    expect(serviceSelects).toHaveLength(2) // las 2 del componente a elegir; la asesoría no ofrece opciones
    await serviceSelects[1].setValue('s-aba')
    await submit(w)

    const { payload } = w.emitted('submit')![0][0] as { payload: { sessions: Array<{ service_id: string }> } }
    expect(payload.sessions.map(s => s.service_id)).toEqual(['s-len', 's-aba', 's-ase'])
    expect(w.text()).toContain('Asesoría para padres')
  })

  it('without a fixed patient it asks for one first', async () => {
    const w = mountForm({ patient: null })
    await selectProgram(w, 'p1')
    await fillBasics(w)
    await w.findAll('select')[1].setValue('e1')
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
  const mountProgram = (props: Record<string, unknown> = {}) => mount(ProgramForm, { props: { services, saving: false, ...props } })
  const save = (w: ReturnType<typeof mount>) => w.findAll('button').find(b => b.text() === 'Guardar programa')!
  const chip = (w: ReturnType<typeof mount>, name: string, nth = 0) => w.findAll('button[aria-pressed]').filter(b => b.text() === name)[nth]

  it('cannot be saved empty, and says what is missing', async () => {
    const w = mountProgram()
    expect(save(w).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Ponle un nombre')
  })

  it('builds the payload: name, price, validity and components with their services', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('Terapias de lenguaje') // nombre
    await inputs[1].setValue('120')                    // precio
    await inputs[2].setValue('30')                     // vigencia
    await chip(w, 'Lenguaje').trigger('click')
    await save(w).trigger('click')

    expect(w.emitted('submit')![0][0]).toEqual({
      name: 'Terapias de lenguaje', price: 120, validity_days: 30,
      components: [{ service_ids: ['s-len'], quantity: 8 }],
    })
  })

  it('supports several kinds of session, each with its own services (the mixed program) and totals them', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('Programa mixto')
    await inputs[1].setValue('180')
    await chip(w, 'Lenguaje').trigger('click')
    await chip(w, 'ABA').trigger('click')
    await inputs[3].setValue('12') // cantidad del primer componente
    await w.findAll('button').find(b => b.text().includes('Agregar otro tipo de sesión'))!.trigger('click')

    await w.findAll('input')[4].setValue('1')
    await chip(w, 'Asesoría', 1).trigger('click') // el chip «Asesoría» del 2.º componente
    expect(w.text()).toContain('Total: 13 sesiones')

    await save(w).trigger('click')
    expect((w.emitted('submit')![0][0] as any).components).toEqual([
      { service_ids: ['s-len', 's-aba'], quantity: 12 },
      { service_ids: ['s-ase'], quantity: 1 },
    ])
  })

  it('needs at least one service in each kind of session', async () => {
    const w = mountProgram()
    const inputs = w.findAll('input')
    await inputs[0].setValue('X')
    await inputs[0].setValue('Programa')
    await inputs[1].setValue('10')
    expect(w.text()).toContain('Elige al menos un servicio')
    expect(save(w).attributes('disabled')).toBeDefined()
  })

  it('editing starts from the program, shows the active switch and never mutates the original', async () => {
    const original = JSON.parse(JSON.stringify(MIXTO)) as ClinicalProgram
    const w = mountProgram({ initial: MIXTO })

    expect(w.text()).toContain('Editar programa')
    expect(w.text()).toContain('Programa activo')
    await w.findAll('input')[1].setValue('200')
    await w.find('input[type="checkbox"]').setValue(false)
    await save(w).trigger('click')

    const sent = w.emitted('submit')![0][0] as any
    expect(sent).toMatchObject({ name: 'Programa mixto', price: 200, active: false })
    expect(MIXTO).toEqual(original)
  })
})
