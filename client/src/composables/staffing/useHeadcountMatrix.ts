import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCompanyHeadcountMatrix, staffingReportKeys, type StaffingCompanyStatus } from '../../services/staffing/staffingService'

/** The year-wide headcount matrix behind one Empresas status tab. */
export function useHeadcountMatrix(
  businessId: Ref<string | null>,
  year: Ref<number>,
  status: Ref<StaffingCompanyStatus>,
) {
  const { data, isLoading, isError } = useQuery({
    queryKey: computed(() => staffingReportKeys.headcountMatrix(businessId.value, year.value, status.value)),
    queryFn: () => getCompanyHeadcountMatrix(year.value, status.value),
    enabled: computed(() => !!businessId.value),
  })

  return {
    weeks: computed(() => data.value?.weeks ?? []),
    companies: computed(() => data.value?.companies ?? []),
    isLoading,
    isError,
  }
}
