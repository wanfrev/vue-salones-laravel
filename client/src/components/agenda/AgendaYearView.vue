<template>
  <div class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
    <div class="h-full overflow-auto p-2 sm:p-4">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-4">
        <div v-for="m in months" :key="m.month"
          class="rounded-lg border border-border bg-bg p-2 sm:p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm sm:hover:scale-[1.02]"
          :class="m.isCurrent ? 'ring-2 ring-primary/30' : ''" @click="$emit('goToMonth', m.month, m.year)">
          <div class="flex items-center justify-between mb-1.5 sm:mb-2">
            <span class="text-[11px] font-semibold text-text sm:text-sm">{{ m.label }}</span>
            <span v-if="m.count > 0"
              class="inline-flex items-center justify-center h-4 min-w-[18px] rounded-full bg-primary-light px-1 text-[9px] font-bold text-primary sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px]">{{
              m.count }}</span>
          </div>
          <div class="grid grid-cols-7 mb-0.5">
            <span v-for="dn in miniDayNames" :key="dn"
              class="text-center text-[6px] font-medium text-text-muted uppercase sm:text-[7px]">{{ dn }}</span>
          </div>
          <div class="grid grid-cols-7 gap-px">
            <div v-for="(day, di) in m.days" :key="di"
              class="aspect-square flex items-center justify-center rounded-sm text-[7px] sm:text-[9px]" :class="[
                day.isToday ? 'bg-primary text-white rounded-full font-bold' : '',
                !day.isCurrentMonth ? 'text-text-muted/30' : day.hasAppointments ? 'text-primary font-semibold' : 'text-text-muted'
              ]">
              {{ day.number || '' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toISODate } from '../../lib/formatters'

const props = defineProps<{
  appointments: any[]
  employeeId: string | 'all'
  selectedDate: string
  todayIso: string
}>()

defineEmits<{
  goToMonth: [month: number, year: number]
}>()

const miniDayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const months = computed(() => {
  const d = new Date(props.selectedDate + 'T12:00:00')
  const year = d.getFullYear()
  const today = new Date()

  return Array.from({ length: 12 }, (_, m) => {
    const firstDay = new Date(year, m, 1)
    const lastDay = new Date(year, m + 1, 0)
    const startDow = firstDay.getDay()

    const days: { number: number; isCurrentMonth: boolean; isToday: boolean; hasAppointments: boolean }[] = []
    for (let i = 0; i < startDow; i++) {
      days.push({ number: 0, isCurrentMonth: false, isToday: false, hasAppointments: false })
    }
    for (let d2 = 1; d2 <= lastDay.getDate(); d2++) {
      const iso = toISODate(new Date(year, m, d2))
      days.push({
        number: d2,
        isCurrentMonth: true,
        isToday: d2 === today.getDate() && m === today.getMonth() && year === today.getFullYear(),
        hasAppointments: props.appointments.some(a => {
          if (toISODate(new Date(a.start_time)) !== iso) return false
          if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) return false
          return true
        }),
      })
    }

    const count = props.appointments.filter(a => {
      const am = new Date(a.start_time).getMonth()
      const ay = new Date(a.start_time).getFullYear()
      if (am !== m || ay !== year) return false
      if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) return false
      return true
    }).length

    return {
      month: m, year,
      label: monthNames[m],
      isCurrent: m === today.getMonth() && year === today.getFullYear(),
      count, days,
    }
  })
})
</script>
