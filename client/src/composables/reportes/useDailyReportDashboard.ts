import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import { usePeriodSelection } from '../finanzas/usePeriodSelection'
import { resolvePeriodDates } from '../../lib/periodUtils'
import { getDailyReportDashboardSummary, dailyReportsKeys } from '../../services/dailyReportService'

/**
 * Dashboard financiero del módulo de Reportes. Reusa el selector de período
 * de Finanzas (Rango / Mes) para no reinventar el date-picker, y agrega los
 * reportes diarios ya guardados sobre ese rango.
 */
export function useDailyReportDashboard() {
  const businessStore = useBusinessStore()
  const authStore = useAuthStore()

  const activeBusinessId = computed(() => businessStore.business?.id || authStore.profile?.business_id || null)
  const selectedBranchId = computed(() => businessStore.selectedBranchId)

  const period = usePeriodSelection()

  // El pedido fue explícito: "rango o mensual". El resto de opciones de
  // usePeriodSelection (día/semana/trimestre/año) quedan disponibles en el
  // composable por si algún día se necesitan, pero no se exponen acá.
  const periods = period.periods.filter(p => p.value === 'custom' || p.value === 'month')
  if (period.selectedPeriod.value !== 'custom' && period.selectedPeriod.value !== 'month') {
    period.selectedPeriod.value = 'month'
  }

  const dateRange = computed(() => {
    const key = period.selectedPeriod.value === 'custom' ? period.customFrom.value : period.selectedMonth.value
    return resolvePeriodDates(period.selectedPeriod.value, key, period.customTo.value)
  })

  const queryKey = computed(() => dailyReportsKeys.dashboard(
    activeBusinessId.value,
    selectedBranchId.value,
    dateRange.value.start,
    dateRange.value.end,
  ))

  const { data: summary, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => getDailyReportDashboardSummary(
      activeBusinessId.value!,
      dateRange.value.start,
      dateRange.value.end,
      selectedBranchId.value,
    ),
    enabled: computed(() => !!activeBusinessId.value),
    staleTime: 30_000,
  })

  return {
    ...period,
    periods,
    dateRange,
    summary,
    isLoading,
    isFetching,
  }
}
