import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getDailyReportDashboardSummary, dailyReportsKeys, type DailyReportDashboardSummary } from '../../services/dailyReportService'

/**
 * A diferencia de useDailyReportDashboard (que trae su propio selector de período para la
 * pestaña "Reportes"), esto recibe el período de afuera -- el mismo que ya está seleccionado
 * arriba en Finanzas -- para que "Cuadre del Día" no tenga un segundo selector de fecha
 * desincronizado del resto de la pantalla.
 */
export function useCuadreDelDia(
  businessId: import('vue').Ref<string | null>,
  periodDates: import('vue').Ref<{ start: string; end: string }>,
  branchId: import('vue').Ref<string | null>,
) {
  const queryKey = computed(() => dailyReportsKeys.dashboard(
    businessId.value,
    branchId.value,
    periodDates.value.start,
    periodDates.value.end,
  ))

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => getDailyReportDashboardSummary(
      businessId.value!,
      periodDates.value.start,
      periodDates.value.end,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value),
    staleTime: 15_000,
  })

  const banks = computed(() => data.value?.banks ?? {})
  const byCashier = computed(() => data.value?.by_cashier ?? [])

  return {
    data: data as import('vue').Ref<DailyReportDashboardSummary | undefined>,
    isLoading,
    isFetching,
    banks,
    byCashier,
  }
}
