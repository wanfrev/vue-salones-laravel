import { apiRequest } from '../../lib/api'
import type { Budget, BudgetItem } from '../../types/database'

export type BudgetSections = { items: BudgetItem[]; observaciones_generales: string | null }

export const listBudgets = async (clientId: string) =>
  apiRequest<Budget[]>('GET', `/clients/${clientId}/budgets`)

export const createBudget = async (clientId: string, data: Partial<BudgetSections>) =>
  apiRequest<Budget>('POST', `/clients/${clientId}/budgets`, data)

export const updateBudget = async (clientId: string, id: string, data: Partial<BudgetSections>) =>
  apiRequest<Budget>('PUT', `/clients/${clientId}/budgets/${id}`, data)
