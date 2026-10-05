import { describe, it, expect } from 'vitest'
import { emptyPlanForm, formFromPlan, goalsProgress, newGoalId, payloadFromPlanForm } from './treatmentPlans'
import type { TreatmentPlan } from '../../types/database'

describe('payloadFromPlanForm', () => {
  it('drops blank goals, trims text and maps empty dates to null', () => {
    const form = emptyPlanForm('2026-10-05')
    form.data.formulation = '  Cuadro ansioso  '
    form.data.goals = [
      { id: 'g1', text: '  Reducir rumiación  ', status: 'in_progress' },
      { id: 'g2', text: '   ', status: 'pending' },
    ]
    const payload = payloadFromPlanForm(form)
    expect(payload.end_date).toBeNull()
    expect(payload.start_date).toBe('2026-10-05')
    expect(payload.data.formulation).toBe('Cuadro ansioso')
    expect(payload.data.goals).toEqual([{ id: 'g1', text: 'Reducir rumiación', status: 'in_progress' }])
  })
})

describe('formFromPlan', () => {
  it('copies goals instead of aliasing the saved plan, and backfills missing data keys', () => {
    const plan = { status: 'paused', start_date: null, end_date: null, data: { goals: [{ id: 'g', text: 't', status: 'pending' }] } } as unknown as TreatmentPlan
    const form = formFromPlan(plan)
    expect(form.data.approach).toBe('')
    form.data.goals[0].text = 'editado'
    expect(plan.data.goals[0].text).toBe('t')
  })
})

describe('goalsProgress', () => {
  it('is the rounded share of achieved goals, 0 with none', () => {
    expect(goalsProgress([])).toBe(0)
    expect(goalsProgress([
      { id: '1', text: 'a', status: 'achieved' },
      { id: '2', text: 'b', status: 'pending' },
      { id: '3', text: 'c', status: 'in_progress' },
    ])).toBe(33)
  })
})

describe('newGoalId', () => {
  it('returns distinct non-empty ids', () => {
    expect(newGoalId()).not.toBe(newGoalId())
    expect(newGoalId().length).toBeGreaterThan(5)
  })
})
