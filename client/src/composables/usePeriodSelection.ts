import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { currentMonthKey } from '../lib/periodUtils'

export type PeriodValue = 'month' | 'quarter' | 'year'

export function usePeriodSelection() {
  const route = useRoute()

  const selectedPeriod = ref<PeriodValue>('month')
  const selectedMonth = ref<string>(currentMonthKey())

  if (route.query.period === 'quarter' || route.query.period === 'year' || route.query.period === 'month') {
    selectedPeriod.value = route.query.period as PeriodValue
  }

  if (typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)) {
    selectedMonth.value = route.query.month
  }

  function resetToCurrentMonth() {
    selectedPeriod.value = 'month'
    selectedMonth.value = currentMonthKey()
  }

  const periods: Array<{ label: string; value: PeriodValue }> = [
    { label: 'Mes', value: 'month' },
    { label: 'Trimestre', value: 'quarter' },
    { label: 'Año', value: 'year' },
  ]

  return {
    selectedPeriod,
    selectedMonth,
    resetToCurrentMonth,
    periods,
  }
}
