import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  createStaffingManualIncome,
  deleteStaffingManualIncome,
  getStaffingFinanceSummary,
  listStaffingManualIncomes,
  type StaffingManualIncomeFormData,
} from '../../services/staffing/staffingService'

/**
 * Finanzas > Resumen for the staffing niche. Ingresos = paid invoices (staffing_invoices with
 * status 'paid' counted in full, 'partial' counted for what's been abonado so far — billed but
 * unpaid 'sent' invoices don't count) plus manual entries. Gastos = what running payroll
 * actually cost the agency (employer_cost: net paid to employees + taxes + fees, adjustments
 * already folded into net) plus the business's normal manual "Gastos Operativos" ledger
 * (passed in from useExpenses, not duplicated here). Ganancia = the nómina margin alone
 * (billed-hours basis, invoice - employer cost) — not reduced by manual expenses, since it
 * represents what staffing services made before any other overhead.
 */
export function useStaffingFinance(businessId: Ref<string | null>, periodStart: Ref<string>, periodEnd: Ref<string>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const summaryKey = computed(() => ['staffing-finance-summary', businessId.value, periodStart.value, periodEnd.value] as const)
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: summaryKey,
    queryFn: () => getStaffingFinanceSummary(periodStart.value, periodEnd.value),
    enabled: computed(() => !!businessId.value && !!periodStart.value && !!periodEnd.value),
  })

  const incomesKey = computed(() => ['staffing-manual-incomes', businessId.value, periodStart.value, periodEnd.value] as const)
  const { data: manualIncomes, isLoading: incomesLoading } = useQuery({
    queryKey: incomesKey,
    queryFn: () => listStaffingManualIncomes(periodStart.value, periodEnd.value),
    enabled: computed(() => !!businessId.value && !!periodStart.value && !!periodEnd.value),
  })

  const invoiceTotal = computed(() => summary.value?.invoiceTotal ?? 0)
  const employerCost = computed(() => summary.value?.employerCost ?? 0)
  const nominaMargin = computed(() => summary.value?.margin ?? 0)
  const manualIncomeTotal = computed(() => (manualIncomes.value ?? []).reduce((acc, i) => acc + i.amount, 0))
  const incomeTotal = computed(() => invoiceTotal.value + manualIncomeTotal.value)

  const isLoading = computed(() => summaryLoading.value || incomesLoading.value)

  const createMutation = useMutation({
    mutationFn: (form: StaffingManualIncomeFormData) => createStaffingManualIncome(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: incomesKey.value, exact: false })
      success('Ingreso registrado')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaffingManualIncome(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: incomesKey.value, exact: false })
      success('Ingreso eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const addManualIncome = async (form: StaffingManualIncomeFormData) => {
    saveError.value = ''
    try {
      await createMutation.mutateAsync(form)
      return true
    } catch {
      return false
    }
  }

  return {
    invoiceTotal,
    employerCost,
    nominaMargin,
    manualIncomes: computed(() => manualIncomes.value ?? []),
    manualIncomeTotal,
    incomeTotal,
    isLoading,
    saveError,
    createMutation,
    addManualIncome,
    removeManualIncome: (id: string) => deleteMutation.mutate(id),
  }
}
