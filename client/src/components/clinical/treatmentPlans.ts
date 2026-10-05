import type { TreatmentGoal, TreatmentGoalStatus, TreatmentPlan, TreatmentPlanData, TreatmentPlanStatus } from '../../types/database'
import type { TreatmentPlanPayload } from '../../services/clinical/treatmentPlanService'

export const PLAN_STATUS_OPTIONS: Array<{ value: TreatmentPlanStatus; label: string }> = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'En pausa' },
  { value: 'completed', label: 'Finalizado' },
]

export const PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = { active: 'Activo', paused: 'En pausa', completed: 'Finalizado' }
export const PLAN_STATUS_TONE: Record<TreatmentPlanStatus, string> = {
  active: 'bg-success/10 text-success',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-bg-secondary text-text-muted',
}

export const GOAL_STATUS_OPTIONS: Array<{ value: TreatmentGoalStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'achieved', label: 'Logrado' },
]

export const APPROACH_OPTIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'Cognitivo-conductual (TCC)', label: 'Cognitivo-conductual (TCC)' },
  { value: 'Psicoanalítico / psicodinámico', label: 'Psicoanalítico / psicodinámico' },
  { value: 'Humanista / centrado en la persona', label: 'Humanista / centrado en la persona' },
  { value: 'Sistémico / familiar', label: 'Sistémico / familiar' },
  { value: 'Gestalt', label: 'Gestalt' },
  { value: 'EMDR', label: 'EMDR' },
  { value: 'Integrativo', label: 'Integrativo' },
  { value: 'Otro', label: 'Otro' },
]

export function newGoalId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyPlanData(): TreatmentPlanData {
  return { approach: '', formulation: '', frequency: '', notes: '', goals: [] }
}

export interface TreatmentPlanForm {
  status: TreatmentPlanStatus
  start_date: string
  end_date: string
  data: TreatmentPlanData
}

export function emptyPlanForm(todayIso: string): TreatmentPlanForm {
  return { status: 'active', start_date: todayIso, end_date: '', data: emptyPlanData() }
}

export function formFromPlan(plan: TreatmentPlan): TreatmentPlanForm {
  return {
    status: plan.status,
    start_date: plan.start_date ?? '',
    end_date: plan.end_date ?? '',
    data: { ...emptyPlanData(), ...plan.data, goals: (plan.data?.goals ?? []).map(g => ({ ...g })) },
  }
}

/** Objetivos sin texto se descartan al guardar — el backend exige texto en cada uno. */
export function payloadFromPlanForm(form: TreatmentPlanForm): TreatmentPlanPayload {
  const goals: TreatmentGoal[] = form.data.goals
    .map(g => ({ ...g, text: g.text.trim() }))
    .filter(g => g.text.length > 0)
  return {
    status: form.status,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    data: {
      approach: form.data.approach,
      formulation: form.data.formulation.trim(),
      frequency: form.data.frequency.trim(),
      notes: form.data.notes.trim(),
      goals,
    },
  }
}

/** % de objetivos logrados (0 si no hay objetivos). */
export function goalsProgress(goals: ReadonlyArray<TreatmentGoal>): number {
  if (goals.length === 0) return 0
  return Math.round((goals.filter(g => g.status === 'achieved').length / goals.length) * 100)
}
