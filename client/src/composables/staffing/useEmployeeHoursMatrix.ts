import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getEmployeeHoursMatrix, staffingReportKeys } from '../../services/staffing/staffingService'

/** The year-wide employee hours matrix behind one Horas Reportadas tab (todos/activos/inactivos). */
export function useEmployeeHoursMatrix(businessId: Ref<string | null>, year: Ref<number>, active: Ref<boolean | null>) {
  const { data, isLoading } = useQuery({
    queryKey: computed(() => staffingReportKeys.employeeHours(businessId.value, year.value, active.value)),
    queryFn: () => getEmployeeHoursMatrix(year.value, active.value),
    enabled: computed(() => !!businessId.value),
  })

  return {
    weeks: computed(() => data.value?.weeks ?? []),
    employees: computed(() => data.value?.employees ?? []),
    isLoading,
  }
}
