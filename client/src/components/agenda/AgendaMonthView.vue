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

interface MonthCellAppt {
  id: string
  clientName: string
  service: string
  time: string
  status: string
  employeeName: string
  raw: any
  _sortTime: string
  isGroup: boolean
  groupServices?: string[]
}

const cells = computed(() => {
  const d = parseLocalDate(props.selectedDate, 12, 0, 0)
  const year = d.getFullYear()
  const month = d.getMonth()

  // ── Pre-index: O(n) single pass ──────────────────────────────────
  const byDate = new Map<string, any[]>()
  const groupMembers = new Map<string, any[]>()
  const serviceMap = new Map<string, any>((props.services ?? []).map((s: any) => [s.id, s]))
  const employeeMap = new Map<string, any>((props.employees ?? []).map((e: any) => [e.id, e]))

  for (const a of props.appointments) {
    if (props.employeeId !== 'all' && a.employee_id !== props.employeeId) continue

    const iso = toISODate(new Date(a.start_time))
    const bucket = byDate.get(iso)
    if (bucket) bucket.push(a)
    else byDate.set(iso, [a])

    if (a.group_id) {
      const gm = groupMembers.get(a.group_id)
      if (gm) gm.push(a)
      else groupMembers.set(a.group_id, [a])
    }
  }

  function buildApptsForDate(iso: string): MonthCellAppt[] {
    const apps = byDate.get(iso)
    if (!apps || apps.length === 0) return []

    const seen = new Set<string>()
    const unique: any[] = []

    for (const a of apps) {
      if (a.group_id) {
        const key = `${a.group_id}:${a.employee_id}`
        if (seen.has(key)) continue
        seen.add(key)
      }
      unique.push(a)
    }

    return unique.map(a => {
      const svc = serviceMap.get(a.service_id)
      const emp = employeeMap.get(a.employee_id)?.full_name || ''
      const groupAll = a.group_id ? (groupMembers.get(a.group_id) ?? []) : []
      const isGroup = groupAll.length > 1
      const groupNames = isGroup
        ? groupAll.map((m: any) => serviceMap.get(m.service_id)?.name || 'Servicio')
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
    }).sort((a, b) => a._sortTime.localeCompare(b._sortTime))
  }

  // ── Build 42 cells ───────────────────────────────────────────────
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const prevMonthLast = new Date(year, month, 0).getDate()
  const totalDays = lastDay.getDate()

  const result: {
    number: number
    iso: string | null
    isCurrentMonth: boolean
    appointments: MonthCellAppt[]
  }[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    const iso = toISODate(new Date(py, pm, prevMonthLast - i))
    result.push({ number: prevMonthLast - i, iso, isCurrentMonth: false, appointments: buildApptsForDate(iso) })
  }

  for (let day = 1; day <= totalDays; day++) {
    const iso = toISODate(new Date(year, month, day))
    result.push({ number: day, iso, isCurrentMonth: true, appointments: buildApptsForDate(iso) })
  }

  while (result.length < 42) {
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    const dayNum = result.length - totalDays - startDow + 1
    const iso = toISODate(new Date(ny, nm, dayNum))
    result.push({ number: dayNum, iso, isCurrentMonth: false, appointments: buildApptsForDate(iso) })
  }

  return result
})
</script>
