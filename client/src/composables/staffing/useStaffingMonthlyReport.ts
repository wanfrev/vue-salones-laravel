import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getMonthlyPayrollReport, staffingReportKeys } from '../../services/staffing/staffingService'

/** Payroll-by-week-of-month, one row per company — the "REPORTE DE NOMINA" sheet. */
export function useStaffingMonthlyReport(businessId: Ref<string | null>, year: Ref<number>, month: Ref<number>) {
  const { data, isLoading } = useQuery({
    queryKey: computed(() => staffingReportKeys.monthlyPayroll(businessId.value, year.value, month.value)),
    queryFn: () => getMonthlyPayrollReport(year.value, month.value),
    enabled: computed(() => !!businessId.value),
  })

  return {
    weeks: computed(() => data.value?.weeks ?? []),
    companies: computed(() => data.value?.companies ?? []),
    isLoading,
  }
}
