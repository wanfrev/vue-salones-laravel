import { apiRequest } from '../../lib/api'
import type { TreatmentPlan, TreatmentPlanData, TreatmentPlanStatus } from '../../types/database'

export interface TreatmentPlanPayload {
  status: TreatmentPlanStatus
  start_date: string | null
  end_date: string | null
  data: TreatmentPlanData
}

export const listTreatmentPlans = async (clientId: string) =>
  apiRequest<TreatmentPlan[]>('GET', `/clients/${clientId}/treatment-plans`)

export const createTreatmentPlan = async (clientId: string, data: TreatmentPlanPayload) =>
  apiRequest<TreatmentPlan>('POST', `/clients/${clientId}/treatment-plans`, data)

export const updateTreatmentPlan = async (clientId: string, id: string, data: TreatmentPlanPayload) =>
  apiRequest<TreatmentPlan>('PUT', `/clients/${clientId}/treatment-plans/${id}`, data)
