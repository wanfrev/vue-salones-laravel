import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { listBudgets, createBudget, updateBudget, type BudgetSections } from '../../services/dental/budgetService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

export function useBudgets(clientId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const budgetsQuery = useQuery({
    queryKey: computed(() => ['dental-budgets', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listBudgets(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const budgets = computed(() => budgetsQuery.data.value ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dental-budgets', clientId()], exact: false })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BudgetSections>) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createBudget(id, data)
    },
    onSuccess: () => { invalidate(); success('Presupuesto creado') },
    onError: (err) => showError(translateError(err, 'Error al crear el presupuesto')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<BudgetSections> }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateBudget(id, payload.id, payload.data)
    },
    onSuccess: () => { invalidate(); success('Presupuesto actualizado') },
    onError: (err) => showError(translateError(err, 'Error al guardar el presupuesto')),
  })

  return { budgetsQuery, budgets, isLoading: budgetsQuery.isLoading, createMutation, updateMutation }
}
