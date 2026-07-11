import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { useCurrency } from '../common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { expensesKeys, listExpenses, saveExpense, deleteExpense, type ExpenseFormData, type ExpenseRow } from '../../services/expensesService'
import { translateError } from '../../lib/errors'

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
    const today = new Date()
    const toYmd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (selectedPeriod.value === 'month') {
      const monthMatch = selectedMonth?.value.match(/^(\d{4})-(\d{2})$/)
      if (monthMatch) {
        const y = Number(monthMatch[1])
        const m = Number(monthMatch[2]) - 1
        const isCurrent = y === today.getFullYear() && m === today.getMonth()
        return { start: toYmd(new Date(y, m, 1)), end: toYmd(isCurrent ? today : new Date(y, m + 1, 0)) }
      }
    }
    if (selectedPeriod.value === 'quarter') {
      const qs = Math.floor(today.getMonth() / 3) * 3
      return { start: toYmd(new Date(today.getFullYear(), qs, 1)), end: toYmd(today) }
    }
    return { start: toYmd(new Date(today.getFullYear(), 0, 1)), end: toYmd(today) }
  })

  const queryKey = computed(() =>
    expensesKeys.filtered(businessId.value, branchId.value, periodDates.value.start, periodDates.value.end),
  )

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey,
    queryFn: () => listExpenses(businessId.value!, periodDates.value.start, periodDates.value.end, branchId.value),
    enabled: computed(() => !!businessId.value && !!selectedPeriod?.value),
    staleTime: 0,
  })

  const expenses = computed(() => (data.value ?? []).map((row: ExpenseRow) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    currency: row.currency,
    originalAmount: row.original_amount,
    exchangeRateUsed: row.exchange_rate_used,
    date: row.expense_date,
    notes: row.notes,
  })))

  const expenseTotal = computed(() => expenses.value.reduce((acc, row) => acc + row.amount, 0))

  const saveMutation = useMutation({
    mutationFn: (formData: ExpenseFormData & { id?: string }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveExpense(businessId.value, formData, branchId.value, exchangeRate.value)
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: expensesKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-expenses', businessId.value], exact: false }),
      ])
      success('Gasto registrado')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al guardar el gasto'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: expensesKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions', businessId.value], exact: false }),
      ])
      success('Gasto eliminado')
    },
    onError: (err: unknown) => {
      showError(translateError(err, 'Error al eliminar el gasto'))
    },
  })

  const showExpenseModal = ref(false)
  const editingExpenseId = ref<string | null>(null)
  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const expenseForm = ref<ExpenseFormData>({
    name: '',
    category: 'General',
    amount: 0,
    currency: 'USD',
    expenseDate: todayStr(),
    notes: '',
  })

  const saveError = ref('')

  const resetForm = () => {
    expenseForm.value = {
      name: '',
      category: 'General',
      amount: 0,
      currency: 'USD',
      expenseDate: todayStr(),
      notes: '',
    }
    editingExpenseId.value = null
    saveError.value = ''
  }

  const openNew = () => { resetForm(); showExpenseModal.value = true }
  const openEdit = (expense: any) => {
    editingExpenseId.value = expense.id
    expenseForm.value = {
      name: expense.name,
      category: expense.category,
      amount: expense.currency === 'VES' ? expense.originalAmount : expense.amount,
      currency: expense.currency ?? 'USD',
      expenseDate: expense.date ?? expense.expense_date,
      notes: expense.notes ?? '',
    }
    saveError.value = ''
    showExpenseModal.value = true
  }

  const closeModal = () => { showExpenseModal.value = false; resetForm() }

  const handleSave = async () => {
    if (saveMutation.isPending.value) return
    saveError.value = ''
    try {
      await saveMutation.mutateAsync({ ...expenseForm.value, id: editingExpenseId.value ?? undefined })
    } catch (err) {
      saveError.value = translateError(err, 'Error al guardar el gasto')
      throw err
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este gasto?')) {
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
