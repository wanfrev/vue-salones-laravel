import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AssessmentForm from './AssessmentForm.vue'
import SessionNoteForm from './SessionNoteForm.vue'
import TreatmentPlanForm from './TreatmentPlanForm.vue'
import AssessmentTrend from './AssessmentTrend.vue'
import { emptySessionNoteForm } from './sessionNotes'
import { emptyPlanForm } from './treatmentPlans'
import type { SessionAppointmentOption } from '../../types/database'

const buttonByText = (wrapper: ReturnType<typeof mount>, text: string) => {
  const found = wrapper.findAll('button').find(b => b.text().includes(text))
  if (!found) throw new Error(`No hay botón con "${text}"`)
  return found
}

describe('AssessmentForm', () => {
  const answerItem = async (wrapper: ReturnType<typeof mount>, item: number, label: string) => {
    const group = wrapper.findAll('[role="radiogroup"]')[item]
    await group.findAll('button').find(b => b.text() === label)!.trigger('click')
  }

  it('renders every PHQ-9 question with the four response options', () => {
    const wrapper = mount(AssessmentForm, { props: { instrument: 'phq9', saving: false } })
    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(9)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(36)
    expect(wrapper.text()).toContain('Poco interés o placer')
  })

  it('cannot be saved until every question is answered, and says how many are missing', async () => {
    const wrapper = mount(AssessmentForm, { props: { instrument: 'gad7', saving: false } })
    const save = () => wrapper.findAll('button').find(b => /Faltan|Guardar resultado/.test(b.text()))!

    expect(save().attributes('disabled')).toBeDefined()
    expect(save().text()).toContain('Faltan 7')

    await answerItem(wrapper, 0, 'Varios días')
    expect(save().text()).toContain('Faltan 6')
  })

  it('updates the live score and severity, and emits the raw answers (no score) once complete', async () => {
    const wrapper = mount(AssessmentForm, { props: { instrument: 'gad7', saving: false } })

    for (let i = 0; i < 7; i++) await answerItem(wrapper, i, 'Casi todos los días')

    expect(wrapper.text()).toContain('21')
    expect(wrapper.text()).toContain('Severa')

    const save = buttonByText(wrapper, 'Guardar resultado')
    expect(save.attributes('disabled')).toBeUndefined()
    await save.trigger('click')

    const [payload] = wrapper.emitted('save')![0] as [Record<string, unknown>]
    expect(payload).toEqual({ instrument: 'gad7', answers: [3, 3, 3, 3, 3, 3, 3], notes: null })
  })

  it('flags the suicidal-ideation item as soon as PHQ-9 question 9 is above zero', async () => {
    const wrapper = mount(AssessmentForm, { props: { instrument: 'phq9', saving: false } })
    expect(wrapper.text()).not.toContain('Ítem de ideación positivo')

    await answerItem(wrapper, 8, 'Varios días')
    expect(wrapper.text()).toContain('Ítem de ideación positivo')
  })

  it('blocks saving while a save is already in flight', async () => {
    const wrapper = mount(AssessmentForm, { props: { instrument: 'gad7', saving: true } })
    for (let i = 0; i < 7; i++) await answerItem(wrapper, i, 'Nunca')
    expect(buttonByText(wrapper, 'Guardando').attributes('disabled')).toBeDefined()
  })
})

describe('SessionNoteForm', () => {
  const appointments: SessionAppointmentOption[] = [
    { id: 'ap-1', start_time: '2026-09-20T15:00:00-04:00', status: 'completed', service_name: 'Psicoterapia individual' },
  ]
  const mountForm = (extra: Record<string, unknown> = {}) =>
    mount(SessionNoteForm, { props: { initial: emptySessionNoteForm(), appointments, saving: false, isEditing: false, ...extra } })

  it('shows the four SOAP sections and the appointment choices', () => {
    const wrapper = mountForm()
    for (const label of ['Subjetivo', 'Objetivo', 'Evaluación', 'Plan']) expect(wrapper.text()).toContain(label)
    expect(wrapper.text()).toContain('Psicoterapia individual')
    expect(wrapper.text()).toContain('Nueva nota de sesión')
  })

  it('cannot be saved while every SOAP section is empty, then emits a clean payload', async () => {
    const wrapper = mountForm()
    expect(buttonByText(wrapper, 'Guardar nota').attributes('disabled')).toBeDefined()

    await wrapper.findAll('textarea')[0].setValue('  Semana difícil, durmió poco  ')
    const save = buttonByText(wrapper, 'Guardar nota')
    expect(save.attributes('disabled')).toBeUndefined()
    await save.trigger('click')

    const [payload] = wrapper.emitted('save')![0] as [Record<string, any>]
    expect(payload.content.subjective).toBe('Semana difícil, durmió poco')
    expect(payload.risk_level).toBe('none')
    expect(payload.duration_minutes).toBe(50)
    expect(payload.appointment_id).toBeNull()
  })

  it('edits its own copy: typing never mutates the object the parent passed in', async () => {
    const initial = emptySessionNoteForm()
    const wrapper = mountForm({ initial })
    await wrapper.findAll('textarea')[0].setValue('texto nuevo')
    expect(initial.content.subjective).toBe('')
  })

  it('picking an appointment takes its (local) date', async () => {
    const wrapper = mountForm()
    const select = wrapper.findAll('select').find(s => s.text().includes('Sin cita vinculada'))!
    await select.setValue('ap-1')
    await wrapper.findAll('textarea')[0].setValue('x')
    await buttonByText(wrapper, 'Guardar nota').trigger('click')

    const [payload] = wrapper.emitted('save')![0] as [Record<string, any>]
    expect(payload.appointment_id).toBe('ap-1')
    expect(payload.session_date).toBe('2026-09-20')
  })

  it('emits cancel', async () => {
    const wrapper = mountForm()
    await buttonByText(wrapper, 'Cancelar').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})

describe('TreatmentPlanForm', () => {
  const mountForm = (initial = emptyPlanForm('2026-10-05')) =>
    mount(TreatmentPlanForm, { props: { initial, saving: false, isEditing: false } })

  it('adds and removes goals, and drops blank ones from the saved payload', async () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('Sin objetivos todavía')

    await buttonByText(wrapper, 'Agregar objetivo').trigger('click')
    await buttonByText(wrapper, 'Agregar objetivo').trigger('click')
    expect(wrapper.findAll('input[placeholder^="Ej: Reducir"]')).toHaveLength(2)

    await wrapper.findAll('input[placeholder^="Ej: Reducir"]')[0].setValue('Dormir 7 horas')
    await buttonByText(wrapper, 'Guardar plan').trigger('click')

    const [payload] = wrapper.emitted('save')![0] as [Record<string, any>]
    expect(payload.data.goals).toHaveLength(1) // el objetivo en blanco se descarta
    expect(payload.data.goals[0].text).toBe('Dormir 7 horas')
    expect(payload.status).toBe('active')
    expect(payload.start_date).toBe('2026-10-05')
    expect(payload.end_date).toBeNull()

    await buttonByText(wrapper, 'Quitar').trigger('click')
    expect(wrapper.findAll('input[placeholder^="Ej: Reducir"]')).toHaveLength(1)
  })

  it('does not mutate the plan the parent passed in', async () => {
    const initial = emptyPlanForm('2026-10-05')
    const wrapper = mountForm(initial)
    await buttonByText(wrapper, 'Agregar objetivo').trigger('click')
    expect(initial.data.goals).toHaveLength(0)
  })
})

describe('AssessmentTrend', () => {
  it('draws nothing for a single point and a line with a dot per point from two on', () => {
    expect(mount(AssessmentTrend, { props: { scores: [8], max: 27 } }).find('svg').exists()).toBe(false)

    const wrapper = mount(AssessmentTrend, { props: { scores: [18, 12, 6], max: 27 } })
    expect(wrapper.find('polyline').exists()).toBe(true)
    expect(wrapper.findAll('circle')).toHaveLength(3)
    expect(wrapper.find('svg').attributes('aria-label')).toContain('18, 12, 6')
  })

  it('keeps every point inside the viewBox even if a score exceeds the maximum', () => {
    const wrapper = mount(AssessmentTrend, { props: { scores: [0, 99], max: 27 } })
    for (const c of wrapper.findAll('circle')) {
      expect(Number(c.attributes('cy'))).toBeGreaterThanOrEqual(0)
      expect(Number(c.attributes('cy'))).toBeLessThanOrEqual(48)
    }
  })
})
