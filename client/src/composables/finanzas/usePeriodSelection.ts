import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  currentMonthKey, currentWeekKey, currentQuarterKey, currentYearKey,
  parseWeekKey, parseMonthKey, parseQuarterKey,
  weekLabel, quarterLabel,
  getISOWeek, getMondayOfISOWeek,
} from '../../lib/periodUtils'

export type PeriodValue = 'week' | 'month' | 'quarter' | 'year'

export function usePeriodSelection() {
  const route = useRoute()

  const selectedPeriod = ref<PeriodValue>('month')
  const selectedMonth = ref<string>(currentMonthKey())

  if (route.query.period === 'week' || route.query.period === 'month' || route.query.period === 'quarter' || route.query.period === 'year') {
    selectedPeriod.value = route.query.period as PeriodValue
  }
  if (typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)) {
    selectedMonth.value = route.query.month
  }

  const periodKey = computed(() => {
    if (selectedPeriod.value === 'week') return currentWeekKey()
    if (selectedPeriod.value === 'quarter') return currentQuarterKey()
    return currentMonthKey()
  })

  function resetToCurrent() {
    selectedMonth.value = periodKey.value
  }

  function goPrev() {
    if (selectedPeriod.value === 'week') {
      const parsed = parseWeekKey(selectedMonth.value)
      if (!parsed) { selectedMonth.value = currentWeekKey(); return }
      const monday = getMondayOfISOWeek(parsed.year, parsed.week)
      monday.setDate(monday.getDate() - 7)
      const w = getISOWeek(monday)
      selectedMonth.value = `${monday.getFullYear()}-W${String(w).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'month') {
      const parsed = parseMonthKey(selectedMonth.value)
      if (!parsed) { selectedMonth.value = currentMonthKey(); return }
      const m = parsed.month === 0 ? 11 : parsed.month - 1
      const y = parsed.month === 0 ? parsed.year - 1 : parsed.year
      selectedMonth.value = `${y}-${String(m + 1).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'quarter') {
      const parsed = parseQuarterKey(selectedMonth.value)
      const q = parsed?.quarter ?? (Math.floor(new Date().getMonth() / 3) + 1)
      const y = parsed?.year ?? new Date().getFullYear()
      const newQ = q === 1 ? 4 : q - 1
      const newY = q === 1 ? y - 1 : y
      selectedMonth.value = `${newY}-Q${newQ}`
    } else {
      const y = parseInt(selectedMonth.value) || new Date().getFullYear()
      selectedMonth.value = `${y - 1}`
    }
  }

  function goNext() {
    if (selectedPeriod.value === 'week') {
      const parsed = parseWeekKey(selectedMonth.value)
      if (!parsed) { selectedMonth.value = currentWeekKey(); return }
      const monday = getMondayOfISOWeek(parsed.year, parsed.week)
      monday.setDate(monday.getDate() + 7)
      const w = getISOWeek(monday)
      selectedMonth.value = `${monday.getFullYear()}-W${String(w).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'month') {
      const parsed = parseMonthKey(selectedMonth.value)
      if (!parsed) { selectedMonth.value = currentMonthKey(); return }
      const m = parsed.month === 11 ? 0 : parsed.month + 1
      const y = parsed.month === 11 ? parsed.year + 1 : parsed.year
      selectedMonth.value = `${y}-${String(m + 1).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'quarter') {
      const parsed = parseQuarterKey(selectedMonth.value)
      const q = parsed?.quarter ?? (Math.floor(new Date().getMonth() / 3) + 1)
      const y = parsed?.year ?? new Date().getFullYear()
      const newQ = q === 4 ? 1 : q + 1
      const newY = q === 4 ? y + 1 : y
      selectedMonth.value = `${newY}-Q${newQ}`
    } else {
      const y = parseInt(selectedMonth.value) || new Date().getFullYear()
      selectedMonth.value = `${y + 1}`
    }
  }

  const displayLabel = computed(() => {
    if (selectedPeriod.value === 'week') {
      const parsed = parseWeekKey(selectedMonth.value)
      if (!parsed) return 'Semana actual'
      return weekLabel(parsed.year, parsed.week)
    }
    if (selectedPeriod.value === 'month') {
      const parsed = parseMonthKey(selectedMonth.value)
      if (!parsed) return 'Mes actual'
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      return `${months[parsed.month]} ${parsed.year}`
    }
    if (selectedPeriod.value === 'quarter') {
      const parsed = parseQuarterKey(selectedMonth.value)
      const q = parsed?.quarter ?? (Math.floor(new Date().getMonth() / 3) + 1)
      const y = parsed?.year ?? new Date().getFullYear()
      return quarterLabel(y, q)
    }
    const y = parseInt(selectedMonth.value) || new Date().getFullYear()
    return `Año ${y}`
  })

  const periods: Array<{ label: string; value: PeriodValue }> = [
    { label: 'Semanal', value: 'week' },
    { label: 'Mes', value: 'month' },
    { label: 'Trimestre', value: 'quarter' },
    { label: 'Año', value: 'year' },
  ]

  return {
    selectedPeriod,
    selectedMonth,
    resetToCurrent,
    goPrev,
    goNext,
    displayLabel,
    periods,
  }
}
