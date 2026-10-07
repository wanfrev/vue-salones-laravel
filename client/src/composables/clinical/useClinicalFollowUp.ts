import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getClinicalFollowUp } from '../../services/clinical/followUpService'
import { useClinicalAccess } from './useClinicalToolsNavTabs'
import type { ClinicalFollowUp } from '../../types/database'

const EMPTY: ClinicalFollowUp = { weeks: 4, notes_pending: [], risk_unfollowed: [], risk_cases: [], inactive: [] }

/** @param weeks Semanas sin asistir a partir de las cuales un paciente cuenta como posible abandono. */
export function useClinicalFollowUp(weeks: () => number) {
  const hasAccess = useClinicalAccess()

  const followUpQuery = useQuery({
    queryKey: computed(() => ['clinical-follow-up', weeks()]),
    queryFn: () => getClinicalFollowUp(weeks()),
    enabled: hasAccess,
    staleTime: 0,
  })

  const followUp = computed(() => followUpQuery.data.value ?? EMPTY)

  return { followUpQuery, followUp, isLoading: followUpQuery.isLoading, hasAccess }
}
