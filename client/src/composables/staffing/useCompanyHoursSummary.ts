import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCompanyHoursSummary, type StaffingHoursPeriod } from '../../services/staffing/staffingService'

/** Total hours per company for a week/month/year, split active vs inactive employees. */
export function useCompanyHoursSummary(
  businessId: Ref<string | null>,
  period: Ref<StaffingHoursPeriod>,
  year: Ref<number>,
  month: Ref<number>,
  weekStart: Ref<string>,
) {
  const enabled = computed(() => {
    if (!businessId.value) return false
    if (period.value === 'week' && !weekStart.value) return false
    return true
  })

  const { data, isLoading } = useQuery({
    queryKey: computed(() => ['staffing-company-hours', businessId.value, period.value, year.value, month.value, weekStart.value] as const),
    queryFn: () => getCompanyHoursSummary(period.value, year.value, { month: month.value, weekStart: weekStart.value }),
    enabled,
  })

  const rows = computed(() => data.value ?? [])

  return { rows, isLoading }
}
