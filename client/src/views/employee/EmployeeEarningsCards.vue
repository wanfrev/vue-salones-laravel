<template>
  <div v-if="groups.length > 0" class="mb-6">
    <div class="flex items-center justify-between border-b border-border pb-2 mb-3">
      <h3 class="text-sm font-semibold text-text">Citas realizadas</h3>
      <span class="text-xs text-text-muted">{{ groups.length }} cita{{ groups.length !== 1 ? 's' : '' }} · {{ totalServices }} servicios</span>
    </div>

    <div class="space-y-3">
      <div v-for="(group, gi) in visibleGroups" :key="group.key"
        class="rounded-xl border border-border bg-surface overflow-hidden transition-shadow hover:shadow-sm">
        <!-- Card header (always visible) -->
        <button
          @click="toggle(group.key)"
          class="w-full flex items-center justify-between p-4 text-left"
        >
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {{ getInitials(group.clientName) }}
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-text truncate">{{ group.clientName }}</p>
              <p class="text-xs text-text-muted">{{ formatDate(group.date) }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-text-muted">{{ group.serviceCount }} servicio{{ group.serviceCount !== 1 ? 's' : '' }}</span>
                <span v-if="group.totalTip > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  +${{ group.totalTip.toFixed(2) }} propina
                </span>
              </div>
            </div>
          </div>
          <div class="text-right shrink-0 ml-3">
            <p class="font-bold text-text">${{ group.totalBilled.toFixed(2) }}</p>
            <p class="text-xs font-medium text-primary">Ganancia: ${{ group.totalEarned.toFixed(2) }}</p>
            <svg
              :class="['h-4 w-4 text-text-muted ml-auto mt-1 transition-transform', expanded.has(group.key) ? 'rotate-180' : '']"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <!-- Expanded services list -->
        <div v-if="expanded.has(group.key)" class="border-t border-border divide-y divide-border-subtle">
          <div v-for="svc in group.services" :key="svc.id"
            class="flex items-center justify-between px-4 py-3 bg-bg-secondary/30 text-sm">
            <div class="min-w-0 flex-1">
              <p class="font-medium text-text truncate">{{ svc.serviceName }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-text-muted">${{ svc.totalAmount.toFixed(2) }}</span>
                <span class="text-xs font-medium text-text-secondary">{{ svc.employeePercentage }}%</span>
                <span v-if="svc.tipAmount > 0" class="text-xs text-primary">+${{ svc.tipAmount.toFixed(2) }} prop</span>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="font-semibold text-primary">${{ svc.employeeEarnings.toFixed(2) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button v-if="hasMore" @click="$emit('toggle')"
      class="mt-3 w-full rounded-lg border border-border bg-surface py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
      {{ showAll ? 'Ver menos' : `Ver todas las citas (${groups.length})` }}
    </button>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-8 text-center">
    <p class="text-sm text-text-muted">No hay citas en este período.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, getInitials } from '../../lib/formatters'
import type { EmployeeEarningRecord } from '../../services/employeeDashboardService'

const props = defineProps<{
  earnings: EmployeeEarningRecord[]
  showAll: boolean
  visibleLimit?: number
}>()

defineEmits<{ toggle: [] }>()

const expanded = ref(new Set<string>())

function toggle(key: string) {
  if (expanded.value.has(key)) {
    expanded.value.delete(key)
  } else {
    expanded.value.add(key)
  }
}

interface ServiceItem {
  id: string
  serviceName: string
  totalAmount: number
  employeePercentage: number
  employeeEarnings: number
  tipAmount: number
}

interface AppointmentGroup {
  key: string
  clientName: string
  date: string
  serviceCount: number
  totalBilled: number
  totalTip: number
  totalEarned: number
  services: ServiceItem[]
}

const groups = computed<AppointmentGroup[]>(() => {
  const map = new Map<string, { clientName: string; date: string; services: ServiceItem[] }>()

  for (const r of props.earnings) {
    const groupKey = r.groupId || r.id
    const existing = map.get(groupKey)
    const svc: ServiceItem = {
      id: r.id,
      serviceName: r.serviceName,
      totalAmount: r.totalAmount,
      employeePercentage: r.employeePercentage,
      employeeEarnings: r.employeeEarnings,
      tipAmount: r.tipAmount,
    }
    if (existing) {
      existing.services.push(svc)
      if (!existing.clientName || existing.clientName === '—') {
        existing.clientName = r.clientName
      }
    } else {
      map.set(groupKey, {
        clientName: r.clientName,
        date: r.date,
        services: [svc],
      })
    }
  }

  return Array.from(map.entries()).map(([key, data]) => ({
    key,
    clientName: data.clientName,
    date: data.date,
    serviceCount: data.services.length,
    totalBilled: data.services.reduce((s, svc) => s + svc.totalAmount, 0),
    totalTip: data.services.reduce((s, svc) => s + svc.tipAmount, 0),
    totalEarned: data.services.reduce((s, svc) => s + svc.employeeEarnings, 0),
    services: data.services,
  }))
})

const totalServices = computed(() => props.earnings.length)

const visibleGroups = computed(() =>
  props.showAll ? groups.value : groups.value.slice(0, props.visibleLimit ?? 6)
)

const hasMore = computed(() => groups.value.length > (props.visibleLimit ?? 6))
</script>
