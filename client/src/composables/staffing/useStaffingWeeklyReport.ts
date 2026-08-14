import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  getWeeklyCompanyReport,
  saveWeeklyExpense,
  staffingReportKeys,
  type StaffingWeeklyExpenseFormData,
} from '../../services/staffing/staffingService'

/** The "RESULTADOS SEMANALES" sheet: per-company financial summary for one week, with an
 *  editable "otros gastos" field — everything else is computed server-side. */
export function useStaffingWeeklyReport(businessId: Ref<string | null>, weekStart: Ref<string>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const queryKey = computed(() => staffingReportKeys.weekly(businessId.value, weekStart.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getWeeklyCompanyReport(weekStart.value),
    enabled: computed(() => !!businessId.value && !!weekStart.value),
  })

  const rows = computed(() => data.value ?? [])

  const saveMutation = useMutation({
    mutationFn: (form: StaffingWeeklyExpenseFormData) => saveWeeklyExpense(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKey.value, exact: false })
      success('Gasto guardado')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const saveExpense = async (form: StaffingWeeklyExpenseFormData) => {
    saveError.value = ''
    try {
      await saveMutation.mutateAsync(form)
      return true
    } catch {
      return false
    }
  }

  return {
    rows,
    isLoading,
    saveError,
    saveMutation,
    saveExpense,
  }
}
