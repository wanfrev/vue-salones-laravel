import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from './useNotification'
import { useCurrency } from './useCurrency'
import { useBusinessStore } from '../store/business'
import { expensesKeys, listExpenses, saveExpense, deleteExpense, type ExpenseFormData, type ExpenseRow } from '../services/expensesService'
import { resolvePeriodDates } from '../lib/periodUtils'

type PeriodValue = 'month' | 'quarter' | 'year'

export function useExpenses(
  businessId: import('vue').Ref<string | null>,
  selectedPeriod?: import('vue').Ref<PeriodValue>,
  selectedMonth?: import('vue').Ref<string>,
) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const { exchangeRate } = useCurrency()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const periodDates = computed(() => {
    if (!selectedPeriod) return { start: '', end: '' }
    return resolvePeriodDates(selectedPeriod.value, selectedMonth?.value)
  })

  const queryKey = computed(() =>
    expensesKeys.filtered(businessId.value, branchId.value, periodDates.value.start, periodDates.value.end)
  )

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey,
    queryFn: () => listExpenses(businessId.value!, periodDates.value.start, periodDates.value.end, branchId.value),
    enabled: computed(() => !!businessId.value && !!selectedPeriod?.value),
  })

  const expenses = computed(() => data.value ?? [])
  const expenseTotal = computed(() => expenses.value.reduce((acc, row) => acc + row.amount, 0))

  const saveMutation = useMutation({
    mutationFn: (formData: ExpenseFormData & { id?: string }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveExpense(businessId.value, formData, branchId.value, exchangeRate.value)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: expensesKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-expenses', businessId.value], exact: false }),
      ])
      success('Gasto registrado correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Error al guardar el gasto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: expensesKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-expenses', businessId.value], exact: false }),
      ])
      success('Gasto eliminado correctamente')
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al eliminar el gasto')
    },
  })

  const showExpenseModal = ref(false)
  const editingExpenseId = ref<string | null>(null)
  const expenseForm = ref<ExpenseFormData>({
    name: '',
    category: 'General',
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const saveError = ref('')

  const resetForm = () => {
    expenseForm.value = {
      name: '',
      category: 'General',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    }
    editingExpenseId.value = null
    saveError.value = ''
  }

  const openNew = () => {
    resetForm()
    showExpenseModal.value = true
  }

  const openEdit = (expense: ExpenseRow) => {
    editingExpenseId.value = expense.id
    expenseForm.value = {
      name: expense.name,
      category: expense.category,
      amount: expense.originalAmount,
      currency: expense.currency,
      date: expense.date,
      notes: expense.notes,
    }
    saveError.value = ''
    showExpenseModal.value = true
  }

  const closeModal = () => {
    showExpenseModal.value = false
    resetForm()
  }

  const handleSave = async () => {
    if (saveMutation.isPending.value) return
    saveError.value = ''
    try {
      await saveMutation.mutateAsync({ ...expenseForm.value, id: editingExpenseId.value ?? undefined })
    } catch (err) {
      saveError.value = err instanceof Error ? err.message : 'Error al guardar el gasto'
      throw err
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id)
    }
  }

  return {
    expenses,
    expenseTotal,
    isLoading,
    isError,
    queryError,
    saveMutation,
    deleteMutation,
    saveError,
    showExpenseModal,
    editingExpenseId,
    expenseForm,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}
