<template>
  <div class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
    <div class="h-full flex flex-col overflow-hidden">
      <div class="grid grid-cols-7 border-b border-border bg-bg-secondary/40 shrink-0">
        <div v-for="dayName in dayNames" :key="dayName"
          class="py-1.5 text-center text-[9px] font-semibold text-text-muted uppercase tracking-wide sm:text-xs sm:py-2.5">
          {{ dayName }}
        </div>
      </div>
      <div class="grid grid-cols-7 flex-1 min-h-0" style="grid-auto-rows: 1fr;">
        <div v-for="(cell, idx) in cells" :key="idx"
          class="border-r border-b border-border-subtle/60 p-0.5 sm:p-1.5 cursor-pointer transition-colors hover:bg-bg-secondary/40 overflow-hidden min-h-0"
          :class="[
            cell.iso === todayIso ? 'bg-primary-light/40' : '',
            cell.isCurrentMonth ? '' : 'opacity-30',
            cell.iso ? 'hover:bg-bg-secondary/60' : '',
            (idx % 7) === 6 ? 'border-r-0' : '',
          ]" @click="cell.iso && $emit('goToDate', cell.iso)">
          <span
            class="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-semibold sm:h-6 sm:w-6 sm:text-sm"
            :class="cell.iso === todayIso ? 'bg-primary text-white' : cell.iso === selectedDate ? 'bg-primary/15 text-primary' : 'text-text'">
            {{ cell.number }}
          </span>
          <div class="mt-1 space-y-1 overflow-hidden">
            <div v-for="appt in cell.appointments.slice(0, 2)" :key="appt.id"
              class="flex flex-col gap-0.5 rounded-md px-1.5 py-1 cursor-pointer transition-colors hover:brightness-95 sm:gap-1 sm:rounded-md sm:px-2 sm:py-1.5"
              :class="monthCardBg(appt.status)"
              :title="`${appt.clientName} · ${appt.service} · ${appt.employeeName}\n${appt.time} · ${getStatusLabel(appt.status)}`"
              @click.stop="$emit('eventClick', appt.raw)">
              <div class="flex items-center justify-between gap-1 min-w-0">
                <span class="text-[9px] text-text-muted font-semibold tabular-nums sm:text-[10px]">{{ appt.time }}</span>
                <span class="h-1.5 w-1.5 rounded-full flex-shrink-0 sm:h-2 sm:w-2"
                  :class="statusDotClass(appt.status)" />
              </div>
              <div class="text-[10px] font-bold leading-tight truncate sm:text-xs">{{ appt.clientName }}</div>
              <div class="text-[9px] text-text-secondary truncate sm:text-[10px] leading-tight">{{ appt.service }}</div>
              <div v-if="appt.employeeName" class="text-[9px] text-text-muted truncate sm:text-[10px] leading-tight">{{ appt.employeeName }}</div>
            </div>
            <div v-if="cell.appointments.length > 2"
              class="text-[9px] font-medium text-text-muted pl-0.5 sm:text-[10px] sm:pl-1">
              +{{ cell.appointments.length - 2 }} más
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toISODate, dateToHHmm, dateToHHmm12, getStatusLabel, normalizeAppointmentStatus, parseLocalDate } from '../../lib/formatters'

const props = defineProps<{
  appointments: any[]
  services: any[]
  employees: any[]
  employeeId: string | 'all'
  selectedDate: string
  todayIso: string
}>()

defineEmits<{
  eventClick: [raw: any]
  goToDate: [iso: string]
}>()

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const statusDotClass = (s: string) => {
  const map: Record<string, string> = {
    confirmed: 'bg-primary', pending: 'bg-warning', paid: 'bg-success',
    cancelled: 'bg-danger', no_show: 'bg-danger',
  }
  return map[s] || 'bg-primary'
}

const monthCardBg = (s: string) => {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 dark:bg-emerald-950/30',
    pending: 'bg-amber-50 dark:bg-amber-950/30',
    paid: 'bg-green-50 dark:bg-green-950/20',
    cancelled: 'bg-red-50/60 dark:bg-red-950/15',
    no_show: 'bg-red-50/60 dark:bg-red-950/15',
  }
  return map[s] || 'bg-zinc-50 dark:bg-zinc-900/30'
}

function getApptsForDate(iso: string) {
  return props.appointments
    .filter(a => {
      if (toISODate(new Date(a.start_time)) !== iso) return false
      if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) return false
      return true
    })
    .reduce((acc: any[], a: any) => {
      if (a.group_id) {
        const key = `${a.group_id}:${a.employee_id}`
        const existing = acc.find(x => x._primaryKey === key)
        if (existing) {
          existing._groupEmployeeMembers.push(a)
          return acc
        }
        a._primaryKey = key
        a._groupEmployeeMembers = []
      }
      acc.push(a)
      return acc
    }, [])
    .map(a => {
      const svc = props.services.find((s: any) => s.id === a.service_id)
      const emp = props.employees.find((e: any) => e.id === a.employee_id)?.full_name || ''
      const groupAllMembers = a._primaryKey
        ? props.appointments.filter((x: any) => x.group_id === a.group_id)
        : []
      const isGroup = groupAllMembers.length > 1
      const groupNames = isGroup
        ? groupAllMembers.map((m: any) => props.services.find((s: any) => s.id === m.service_id)?.name || 'Servicio')
        : undefined
      return {
        id: a.id,
        clientName: a.client?.full_name || a.clients?.full_name || 'Cliente',
        service: isGroup ? groupNames!.join(' + ') : (svc?.name || 'Servicio'),
        time: dateToHHmm12(new Date(a.start_time)),
        status: normalizeAppointmentStatus(a),
        employeeName: emp,
        raw: a,
        _sortTime: dateToHHmm(new Date(a.start_time)),
        isGroup,
        groupServices: groupNames,
      }
    })
    .sort((a, b) => a._sortTime.localeCompare(b._sortTime))
}

const cells = computed(() => {
  const d = parseLocalDate(props.selectedDate, 12, 0, 0)
  const year = d.getFullYear()
  const month = d.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const prevMonthLast = new Date(year, month, 0).getDate()
  const totalDays = lastDay.getDate()

  const result: {
    number: number
    iso: string | null
    isCurrentMonth: boolean
    appointments: ReturnType<typeof getApptsForDate>
  }[] = []

  // Previous month filler
  for (let i = startDow - 1; i >= 0; i--) {
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    result.push({
      number: prevMonthLast - i,
      iso: toISODate(new Date(py, pm, prevMonthLast - i)),
      isCurrentMonth: false,
      appointments: getApptsForDate(toISODate(new Date(py, pm, prevMonthLast - i))),
    })
  }

  // Current month
  for (let day = 1; day <= totalDays; day++) {
    const iso = toISODate(new Date(year, month, day))
    result.push({
      number: day, iso, isCurrentMonth: true,
      appointments: getApptsForDate(iso),
    })
  }

  // Fill to 42 cells
  while (result.length < 42) {
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    const dayNum = result.length - totalDays - startDow + 1
    const iso = toISODate(new Date(ny, nm, dayNum))
    result.push({
      number: dayNum, iso, isCurrentMonth: false,
      appointments: getApptsForDate(iso),
    })
  }

  return result
})
</script>
