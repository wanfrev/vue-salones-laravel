import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  currentMonthKey, currentWeekKey, currentQuarterKey, currentYearKey, currentDayKey,
  parseWeekKey, parseMonthKey, parseQuarterKey, parseDayKey,
  weekLabel, quarterLabel,
  getISOWeek, getMondayOfISOWeek,
} from '../../lib/periodUtils'

export type PeriodValue = 'day' | 'custom' | 'week' | 'month' | 'quarter' | 'year'

export function usePeriodSelection() {
  const route = useRoute()

  const selectedPeriod = ref<PeriodValue>('month')
  const selectedMonth = ref<string>(currentMonthKey())
  const customFrom = ref<string>(currentDayKey())
  const customTo = ref<string>(currentDayKey())

  const periodValues = ['day', 'custom', 'week', 'month', 'quarter', 'year'] as const

  if (route.query.period && periodValues.includes(route.query.period as any)) {
    selectedPeriod.value = route.query.period as PeriodValue
  }
  if (route.query.period === 'day' || route.query.period === 'custom') {
    if (typeof route.query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.from)) {
      selectedMonth.value = route.query.from
      customFrom.value = route.query.from
    } else {
      selectedMonth.value = currentDayKey()
      customFrom.value = currentDayKey()
    }
    if (typeof route.query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.to)) {
      customTo.value = route.query.to
    } else {
      customTo.value = currentDayKey()
    }
  } else if (typeof route.query.month === 'string' && /^\d{4}-\d{2}$/.test(route.query.month)) {
    selectedMonth.value = route.query.month
  }

  watch(selectedPeriod, (newPeriod) => {
    if (newPeriod === 'day') {
      selectedMonth.value = currentDayKey()
    } else if (newPeriod === 'custom') {
      customFrom.value = currentDayKey()
      customTo.value = currentDayKey()
      selectedMonth.value = customFrom.value
    }
  })

  watch(customFrom, (val) => {
    if (selectedPeriod.value === 'custom') selectedMonth.value = val
  })

  const periodKey = computed(() => {
    if (selectedPeriod.value === 'day' || selectedPeriod.value === 'custom') return currentDayKey()
    if (selectedPeriod.value === 'week') return currentWeekKey()
    if (selectedPeriod.value === 'quarter') return currentQuarterKey()
    return currentMonthKey()
  })

  function resetToCurrent() {
    if (selectedPeriod.value === 'day') {
      selectedMonth.value = currentDayKey()
    } else if (selectedPeriod.value === 'custom') {
      customFrom.value = currentDayKey()
      customTo.value = currentDayKey()
    } else {
      selectedMonth.value = periodKey.value
    }
  }

  function goPrev() {
    if (selectedPeriod.value === 'day') {
      const d = parseDayKey(selectedMonth.value) ?? new Date()
      d.setDate(d.getDate() - 1)
      selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'custom') {
      return
    } else if (selectedPeriod.value === 'week') {
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
    if (selectedPeriod.value === 'day') {
      const d = parseDayKey(selectedMonth.value) ?? new Date()
      d.setDate(d.getDate() + 1)
      selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (selectedPeriod.value === 'custom') {
      return
    } else if (selectedPeriod.value === 'week') {
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
    if (selectedPeriod.value === 'day') {
      const d = parseDayKey(selectedMonth.value) ?? new Date()
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
    }
    if (selectedPeriod.value === 'custom') {
      return 'Rango personalizado'
    }
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
    { label: 'Día', value: 'day' },
    { label: 'Rango', value: 'custom' },
    { label: 'Sem', value: 'week' },
    { label: 'Mes', value: 'month' },
    { label: 'Trim', value: 'quarter' },
    { label: 'Año', value: 'year' },
  ]

  return {
    selectedPeriod,
    selectedMonth,
    customFrom,
    customTo,
    resetToCurrent,
    goPrev,
    goNext,
    displayLabel,
    periods,
  }
}
