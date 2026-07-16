<template>
  <div class="flex h-full flex-col gap-2 sm:gap-3">
    <!-- Panel de Filtros -->
    <div
      class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2 sm:rounded-xl sm:p-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
        <div v-if="isAdmin" class="flex items-center gap-2">
          <div class="relative">
            <button @click="empDropdownOpen = !empDropdownOpen"
              class="flex items-center gap-2 w-full rounded-lg border border-border bg-surface pl-2.5 pr-3 py-1.5 text-sm font-medium text-text outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-auto"
              :disabled="loadingEmployees">
              <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
                {{ selectedEmployeeName ? getInitials(selectedEmployeeName) : '✦' }}
              </div>
              <span class="truncate max-w-[120px]">{{ selectedEmployeeName || 'Todos' }}</span>
              <svg class="h-3.5 w-3.5 flex-shrink-0 text-text-muted transition-transform" :class="{ 'rotate-180': empDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
              <div v-if="empDropdownOpen" class="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-xl" @click.stop>
                <button @click="selectedEmployeeId = 'all'; empDropdownOpen = false"
                  class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
                  :class="selectedEmployeeId === 'all' ? 'bg-primary/10 text-primary' : 'text-text hover:bg-bg-secondary'">
                  <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Todos los empleados
                </button>
                <div class="my-1 h-px bg-border"></div>
                <div class="max-h-64 overflow-y-auto touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
                  <button v-for="emp in employees" :key="emp.id"
                    @click="selectedEmployeeId = emp.id; empDropdownOpen = false"
                    class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors"
                    :class="selectedEmployeeId === emp.id ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-bg-secondary'">
                    <div class="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 text-[10px] font-bold"
                      :class="selectedEmployeeId === emp.id ? 'bg-primary/20 text-primary' : 'bg-bg-secondary text-text-secondary'">
                      {{ getInitials(emp.full_name) }}
                    </div>
                    <span class="truncate">{{ emp.full_name }}</span>
                    <svg v-if="selectedEmployeeId === emp.id" class="h-4 w-4 ml-auto flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        <div v-else class="flex items-center gap-2 px-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-text">{{ authStore.profile?.full_name }}</span>
        </div>
        <div class="hidden h-5 w-px bg-border sm:block"></div>
        <div class="relative w-full sm:w-48 lg:w-56">
          <input v-model="searchQuery" type="text" placeholder="Buscar cliente..."
            class="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <span v-for="l in legend" :key="l.label" class="flex items-center gap-1 rounded-md px-1.5 py-0.5">
          <span class="h-2 w-2 rounded-full" :style="{ background: l.color }"></span>
          <span class="text-[10px] font-medium text-text-muted sm:text-[11px]">{{ l.label }}</span>
        </span>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="appointmentsError" class="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-danger shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p class="text-sm font-semibold text-danger">Error al cargar citas del calendario</p>
          <p class="text-xs text-danger/70 mt-0.5">{{ typeof appointmentsError === 'object' && appointmentsError !== null ? ((appointmentsError as any).message || String(appointmentsError)) : String(appointmentsError) }}</p>
        </div>
      </div>
    </div>

    <!-- Date Navigator -->
    <div
      class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2 sm:rounded-xl sm:p-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <!-- Nav: arrows + title -->
      <div class="flex items-center justify-between">
        <button @click="navigate(-1)"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong hover:text-text sm:h-9 sm:w-9">
          <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-center text-sm font-semibold text-text truncate px-2 sm:text-base lg:text-lg">{{ titleText }}
        </h2>
        <button @click="navigate(1)"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong hover:text-text sm:h-9 sm:w-9">
          <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Actions: Hoy + View Switcher -->
      <div class="flex items-center justify-center gap-2">
        <button @click="goToday"
          class="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-primary transition-theme hover:bg-primary-light hover:border-primary/20">Hoy</button>
        <div class="inline-flex rounded-lg border border-border bg-bg-secondary/50 p-0.5">
          <button v-for="v in viewOptions" :key="v.value" @click="viewMode = v.value"
            class="px-2 py-1 text-xs font-medium rounded-md transition-theme sm:px-3"
            :class="viewMode === v.value ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'">{{
              v.label }}</button>
        </div>
      </div>
    </div>

    <!-- ============================================================
         MONTH VIEW
         ============================================================ -->
    <AgendaMonthView v-if="viewMode === 'month'" :appointments="appointments ?? []" :services="services ?? []"
      :employees="employees ?? []" :employeeId="selectedEmployeeId" :selectedDate="selectedDate" :todayIso="todayIso"
      @event-click="emitEventClick" @go-to-date="goToDate" />

    <!-- ============================================================
         YEAR VIEW
         ============================================================ -->
    <AgendaYearView v-else-if="viewMode === 'year'" :appointments="appointments ?? []" :employeeId="selectedEmployeeId"
      :selectedDate="selectedDate" :todayIso="todayIso" @go-to-month="goToMonth" />

    <!-- ============================================================
         DAY / WEEK — Time Grid
         ============================================================ -->
    <div v-else class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
      <div class="h-full overflow-auto" ref="gridContainer">
        <div class="relative" :style="{ minHeight: `${totalGridHeight}px` }">
          <!-- Sticky header -->
          <div class="sticky top-0 z-20 flex border-b border-border bg-surface"
            :style="{ paddingLeft: `${TIME_COL_WIDTH}px` }">
            <div v-for="col in gridColumns" :key="col.key"
              class="flex flex-col items-center justify-center gap-0.5 border-r border-border-subtle px-1 py-2 last:border-r-0 sm:px-2"
              :class="col.isToday ? 'bg-primary-light/40' : ''" :style="{ width: `${col.widthPercent}%` }">
              <template v-if="col.number !== undefined">
                <span
                  class="text-[8px] font-medium text-text-muted uppercase tracking-wide leading-none sm:text-[11px]">{{
                  col.label }}</span>
                <span class="text-xs font-bold leading-none sm:text-sm"
                  :class="col.isToday ? 'text-primary' : 'text-text'">{{ col.number }}</span>
              </template>
              <template v-else>
                <div v-if="col.avatar"
                  class="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0 sm:h-7 sm:w-7 sm:text-xs"
                  style="background: var(--color-primary)">{{ col.avatar }}</div>
                <span class="text-[9px] font-semibold text-text truncate sm:text-xs">{{ col.label }}</span>
              </template>
            </div>
          </div>

          <!-- Grid body -->
          <div class="flex">
            <!-- Time labels -->
            <div class="flex-shrink-0 z-10 bg-surface" :style="{ width: `${TIME_COL_WIDTH}px` }">
              <div v-for="hourIdx in totalHours" :key="'t' + hourIdx" class="flex items-start justify-end pr-2"
                :style="{ height: `${HOUR_HEIGHT}px` }">
                <span class="text-[9px] font-medium text-text-muted -mt-2 leading-none tabular-nums sm:text-[11px]">{{
                  hourSlots[hourIdx - 1] }}</span>
              </div>
            </div>

            <!-- Columns -->
            <div class="flex flex-1 relative">
              <div v-for="col in gridColumns" :key="col.key"
                class="relative border-r border-border-subtle last:border-r-0"
                :style="{ width: `${col.widthPercent}%` }" @click="onColumnClick(col, $event)">
                <!-- Hour lines -->
                <div v-for="h in totalHours" :key="'r' + h" class="border-b border-border-subtle/60"
                  :style="{ height: `${HOUR_HEIGHT}px` }" />
                <!-- Half-hour lines -->
                <div v-for="h in totalHours" :key="'m' + h"
                  class="absolute left-0 right-0 border-b border-dashed border-border-subtle/30"
                  :style="{ top: `${(h - 1) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }" />
                <!-- Now line -->
                <div v-if="isToday && nowLineTop >= 0" class="absolute left-0 right-0 z-20 pointer-events-none"
                  :style="{ top: `${nowLineTop}px` }">
                  <div
                    class="absolute -left-1.5 -top-[3px] h-2 w-2 rounded-full bg-primary ring-2 ring-surface dark:ring-zinc-900 shadow-sm shadow-primary/40" />
                  <div
                    class="absolute left-0 right-0 top-[5px] h-px bg-gradient-to-r from-transparent via-primary/60 to-primary/60" />
                </div>
                <!-- Cards -->
                <div v-for="appt in col.appointments" :key="appt.id"
                  class="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-lg cursor-pointer overflow-hidden transition-all duration-150 hover:scale-[1.02] hover:z-10 group"
                  :class="cardBgClass(appt.status)"
                  :style="{ top: `${appt.top}px`, height: `${Math.max(appt.height, 64)}px` }"
                  :title="`${appt.clientName} · ${appt.service} · ${appt.employeeName}\n${appt.time} · ${getStatusLabel(appt.status)}`"
                  @click.stop="showDetailPopup(appt, $event)">
                  <div class="absolute left-0 top-0 bottom-0 w-[3px] sm:w-[4px]"
                    :class="statusStripeClass(appt.status)" />
                  <div class="flex flex-col h-full px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs leading-tight">
                    <div class="flex items-center justify-between gap-1 min-w-0">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span
                          class="text-[11px] font-semibold text-text-muted tabular-nums whitespace-nowrap sm:text-xs">{{
                          appt.time }}</span>
                        <span class="h-2 w-2 rounded-full flex-shrink-0"
                          :class="statusDotClass(appt.status)" />
                      </div>
                      <button v-if="appt.status !== 'paid' && appt.status !== 'cancelled'"
                        class="flex h-5 w-5 items-center justify-center rounded transition-all hover:scale-110 flex-shrink-0"
                        :class="checkoutBtnClass(appt.status)" title="Cobrar" @click.stop="emitCheckout(appt.raw.id)">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                          stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                      </button>
                    </div>
                    <div class="font-bold text-text truncate text-[12px] sm:text-[13px] leading-tight mt-1">{{ appt.clientName }}</div>
                    <div class="text-[10px] text-text-secondary truncate sm:text-xs leading-tight mt-0.5">{{ appt.service }}</div>
                    <div v-if="appt.employeeName" class="text-[10px] text-text-muted truncate sm:text-xs leading-tight mt-0.5">{{ appt.employeeName }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Dropdown -->
    <Teleport to="body">
      <div v-if="statusMenu"
        class="fixed z-[100] rounded-lg border border-border bg-surface shadow-xl p-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-100"
        :style="{ top: `${statusMenu.y}px`, left: `${statusMenu.x}px` }" @click.stop>
        <button v-for="opt in STATUS_OPTIONS" :key="opt.value"
          @click="changeStatus(statusMenu.appointmentId, opt.value)"
          class="flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-[11px] font-medium text-text transition-colors hover:bg-bg-secondary"
          :class="{ 'bg-bg-secondary': statusMenu.currentStatus === opt.value }">
          <span class="h-2 w-2 rounded-full flex-shrink-0" :class="statusDotClass(opt.value)" />
          <span class="flex-1 text-left">{{ opt.label }}</span>
          <svg v-if="statusMenu.currentStatus === opt.value" class="h-3 w-3 text-primary flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Teleport>

    <!-- Detail Popup -->
    <Teleport to="body">
      <div v-if="detailPopup" class="fixed inset-0 z-[90]" @click="detailPopup = null"></div>
      <div v-if="detailPopup"
        class="fixed z-[100] rounded-xl border border-border bg-surface shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-100"
        :style="{ top: `${detailPopup.y}px`, left: `${detailPopup.x}px` }" @click.stop>
        <div class="flex items-center gap-3 mb-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {{ getInitials(detailPopup.appt.clientName) }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-text truncate">{{ detailPopup.appt.clientName }}</p>
            <p class="text-xs text-text-muted">{{ detailPopup.appt.time }}</p>
          </div>
        </div>
        <div class="space-y-1.5 mb-3 text-sm">
          <div class="flex justify-between"><span class="text-text-muted">Servicio</span><span
              class="font-medium text-text">{{ detailPopup.appt.service }}</span></div>
          <div
            v-if="detailPopup.appt.isGroup && detailPopup.appt.groupServices && detailPopup.appt.groupServices.length > 1"
            class="flex flex-col gap-0.5">
            <span class="text-text-muted text-xs">Servicios incluidos</span>
            <span v-for="(gs, i) in detailPopup.appt.groupServices" :key="i" class="text-xs text-text pl-2">{{ gs
              }}</span>
          </div>
          <div class="flex justify-between"><span class="text-text-muted">Empleado</span><span
              class="font-medium text-text">{{ detailPopup.appt.employeeName }}</span></div>
          <div v-if="detailPopup.appt.raw.internal_notes" class="flex justify-between"><span
              class="text-text-muted">Notas</span><span class="font-medium text-text truncate max-w-[140px]">{{
                detailPopup.appt.raw.internal_notes }}</span></div>
          <div class="flex justify-between"><span class="text-text-muted">Estado</span><span class="font-medium"
              :class="statusTextClass(detailPopup.appt.status)">{{ getStatusLabel(detailPopup.appt.status) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end border-t border-border pt-3">
          <button @click="handleDeleteClick"
            class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors">Borrar
            cita</button>
          <button @click="handleEditClick"
            class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse hover:bg-primary-hover transition-colors">Editar
            cita</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAgenda } from '../../composables/agenda/useAgenda'
import { useAuthStore } from '../../store/auth'
import { isAdminPanelRole } from '../../constants/roles'
import { normalizeAppointmentStatus, getStatusLabel, dateToHHmm, dateToHHmm12, toISODate, getInitials, parseLocalDate } from '../../lib/formatters'
import AgendaMonthView from './AgendaMonthView.vue'
import AgendaYearView from './AgendaYearView.vue'
import type { Cita } from '../../types/cita'

const route = useRoute()
const authStore = useAuthStore()
const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))

const props = defineProps<{
  initialDate?: string
}>()

const emit = defineEmits<{
  eventClick: [event: { id: string; title: string; start: Date; end: Date; status?: string; citaData?: Omit<Cita, 'paymentStatus' | 'statusLabel' | 'statusColor'> }]
  statusChange: [payload: { id: string; status: 'pending' | 'confirmed' | 'cancelled' | 'paid' }]
  eventChange: [payload: { id: string; start: string; end: string; employeeId?: string }]
  slotSelect: [payload: { start: Date; end: Date; employeeId?: string }]
  checkout: [appointmentId: string]
  delete: [id: string]
}>()

const { selectedEmployeeId, setDateRange, employees, loadingEmployees, services, appointments, appointmentsError } = useAgenda()

// ---- Constants ----
const START_HOUR = 7
const END_HOUR = 21
const HOUR_HEIGHT = 128
const TIME_COL_WIDTH = 40
const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT
const totalHours = END_HOUR - START_HOUR

const legend = [
  { label: 'En Silla', color: 'var(--color-primary)' },
  { label: 'Cobrada', color: 'var(--color-success)' },
  { label: 'Pendiente', color: 'var(--color-warning)' },
  { label: 'Cancelada', color: 'var(--color-danger)' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'paid', label: 'Pagada' },
  { value: 'cancelled', label: 'Cancelada' },
] as const

// ---- State ----
const searchQuery = ref('')
const viewMode = ref<'day' | 'week' | 'month' | 'year'>('day')
const selectedDate = ref(toISODate(new Date()))
const gridContainer = ref<HTMLElement | null>(null)
const statusMenu = ref<{ appointmentId: string; currentStatus: string; x: number; y: number } | null>(null)
const empDropdownOpen = ref(false)

const selectedEmployeeName = computed(() => {
  if (selectedEmployeeId.value === 'all') return ''
  return employees.value?.find(e => e.id === selectedEmployeeId.value)?.full_name || ''
})

const viewOptions = [
  { value: 'day' as const, label: 'Día' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'month' as const, label: 'Mes' },
  { value: 'year' as const, label: 'Año' },
]

// ---- Date helpers ----
const todayIso = computed(() => toISODate(new Date()))
const isToday = computed(() => selectedDate.value === todayIso.value)

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const titleText = computed(() => {
  const d = parseLocalDate(selectedDate.value, 12, 0, 0)
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  if (viewMode.value === 'year') return `${d.getFullYear()}`
  if (viewMode.value === 'day') return `${dayNamesFull[d.getDay()]} ${d.getDate()} de ${monthNames[d.getMonth()]}, ${d.getFullYear()}`
  if (viewMode.value === 'week') {
    const sow = new Date(d); sow.setDate(d.getDate() - d.getDay())
    const eow = new Date(sow); eow.setDate(sow.getDate() + 6)
    if (sow.getMonth() === eow.getMonth()) return `${sow.getDate()} - ${eow.getDate()} de ${monthNames[sow.getMonth()]}, ${sow.getFullYear()}`
    return `${sow.getDate()} ${monthNames[sow.getMonth()]} - ${eow.getDate()} ${monthNames[eow.getMonth()]}, ${eow.getFullYear()}`
  }
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`
})

const nowLineTop = computed(() => {
  if (!isToday.value) return -1
  const m = new Date().getHours() * 60 + new Date().getMinutes()
  if (m < START_HOUR * 60 || m > END_HOUR * 60) return -1
  return ((m - START_HOUR * 60) / 60) * HOUR_HEIGHT
})

const hourSlots = computed(() => Array.from({ length: totalHours }, (_, h) => {
  const hour24 = START_HOUR + h
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const h12 = hour24 % 12 || 12
  return `${h12}:00 ${ampm}`
}))

// ---- Navigation ----
function navigate(dir: number) {
  const d = parseLocalDate(selectedDate.value, 12, 0, 0)
  if (viewMode.value === 'year') d.setFullYear(d.getFullYear() + dir)
  else if (viewMode.value === 'month') d.setMonth(d.getMonth() + dir)
  else if (viewMode.value === 'week') d.setDate(d.getDate() + dir * 7)
  else d.setDate(d.getDate() + dir)
  selectedDate.value = toISODate(d)
}

function goToday() { selectedDate.value = todayIso.value }
function goToDate(iso: string) { selectedDate.value = iso; viewMode.value = 'day' }
function goToMonth(m: number, y: number) { selectedDate.value = toISODate(new Date(y, m, 1)); viewMode.value = 'month' }

// ---- Date range sync ----
watch([selectedDate, viewMode], ([d, mode]) => {
  const base = parseLocalDate(d, 12, 0, 0)
  let start: Date, end: Date
  if (mode === 'year') { start = new Date(base.getFullYear(), 0, 1); end = new Date(base.getFullYear() + 1, 0, 1) }
  else if (mode === 'month') { start = new Date(base.getFullYear(), base.getMonth(), 1); end = new Date(base.getFullYear(), base.getMonth() + 1, 1) }
  else if (mode === 'week') { start = new Date(base); start.setDate(base.getDate() - base.getDay()); start.setHours(0, 0, 0, 0); end = new Date(start); end.setDate(start.getDate() + 7) }
  else { start = parseLocalDate(d, 0, 0, 0); end = new Date(start); end.setDate(end.getDate() + 1) }
  setDateRange(start, end)
}, { immediate: true })

// ---- Grid Columns (day & week) ----
interface GridColumn { key: string; label: string; avatar?: string; number?: number; isToday?: boolean; widthPercent: number; appointments: DisplayAppointment[] }
interface DisplayAppointment { id: string; clientName: string; service: string; time: string; top: number; height: number; status: string; employeeInitials: string; employeeName: string; raw: any; isGroup?: boolean; groupServices?: string[] }

function buildDisplayAppointments(appts: any[]): any[] {
  const result: any[] = []
  const groupEmployeeMap = new Map<string, any>()

  for (const a of appts) {
    if (!a.group_id) {
      result.push(a)
      continue
    }
    const key = `${a.group_id}:${a.employee_id}`
    const existing = groupEmployeeMap.get(key)
    if (!existing) {
      const wrapper = { ...a, _groupId: a.group_id, _groupEmployeeMembers: [a] }
      groupEmployeeMap.set(key, wrapper)
      result.push(wrapper)
    } else {
      existing._groupEmployeeMembers.push(a)
    }
  }

  return result
}

function mapAppt(a: any, svcList: any[], empName: string) {
  const start = new Date(a.start_time); const end = new Date(a.end_time)
  const svc = svcList.find(s => s.id === a.service_id)
  const topMin = (start.getHours() * 60 + start.getMinutes()) - (START_HOUR * 60)
  const groupAllMembers = a._groupId
    ? (appointments.value ?? []).filter((x: any) => x.group_id === a._groupId)
    : []
  const isGroup = groupAllMembers.length > 1
  const groupServices = isGroup
    ? groupAllMembers.map((m: any) => svcList.find(s => s.id === m.service_id)?.name || 'Servicio')
    : undefined
  return {
    id: a.id,
    clientName: a.client?.full_name || a.clients?.full_name || 'Cliente',
    service: svc?.name || 'Servicio',
    time: dateToHHmm12(start),
    top: Math.max(0, (topMin / 60) * HOUR_HEIGHT),
    height: ((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT,
    status: normalizeAppointmentStatus(a),
    employeeInitials: getInitials(empName),
    employeeName: empName,
    raw: a,
    isGroup,
    groupServices,
  }
}

const gridColumns = computed<GridColumn[]>(() => {
  const emps = employees.value ?? []
  const empId = selectedEmployeeId.value
  const appts = buildDisplayAppointments(appointments.value ?? [])
  const svcs = services.value ?? []

  if (viewMode.value === 'week') {
    const sel = new Date(selectedDate.value + 'T12:00:00')
    const sow = new Date(sel); sow.setDate(sel.getDate() - sel.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sow); d.setDate(sow.getDate() + i)
      const iso = toISODate(d)
      const dayAppts = appts
        .filter(a => toISODate(new Date(a.start_time)) === iso && (empId === 'all' || a.employee_id === empId) && (!searchQuery.value || ((a.client?.full_name || a.clients?.full_name) || '').toLowerCase().includes(searchQuery.value.toLowerCase())))
        .map(a => mapAppt(a, svcs, emps.find(e => e.id === a.employee_id)?.full_name || ''))
        .sort((a, b) => a.top - b.top)
      const isT = iso === todayIso.value
      return { key: iso, label: dayNames[d.getDay()], number: d.getDate(), isToday: isT, widthPercent: 100 / 7, appointments: dayAppts }
    })
  }

  let cols = empId !== 'all' ? emps.filter(e => e.id === empId).map(e => ({ id: e.id, name: e.full_name })) : emps.map(e => ({ id: e.id, name: e.full_name }))
  if (!cols.length) cols = [{ id: '__default__', name: 'Citas' }]

  return cols.map(c => {
    const cAppts = appts
      .filter(a => (c.id === '__default__' || (toISODate(new Date(a.start_time)) === selectedDate.value && a.employee_id === c.id)) && (!searchQuery.value || ((a.client?.full_name || a.clients?.full_name) || '').toLowerCase().includes(searchQuery.value.toLowerCase())))
      .map(a => mapAppt(a, svcs, c.name))
      .sort((a, b) => a.top - b.top)
    return { key: c.id, label: c.id === '__default__' ? 'Citas' : c.name.split(' ')[0], avatar: c.id === '__default__' ? undefined : getInitials(c.name), widthPercent: 100 / cols.length, appointments: cAppts }
  })
})

// ---- Card styling ----
const statusColors: Record<string, { bg: string; dot: string; stripe: string; checkout: string }> = {
  confirmed: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', dot: 'bg-primary', stripe: 'bg-primary', checkout: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white' },
  pending: { bg: 'bg-amber-50/80 dark:bg-amber-950/30', dot: 'bg-warning', stripe: 'bg-warning', checkout: 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white' },
  paid: { bg: 'bg-green-50/70 dark:bg-green-950/25', dot: 'bg-success', stripe: 'bg-success', checkout: 'bg-transparent text-transparent' },
  cancelled: { bg: 'bg-red-50/50 dark:bg-red-950/15 opacity-60', dot: 'bg-danger', stripe: 'bg-danger', checkout: 'bg-transparent text-transparent' },
  no_show: { bg: 'bg-red-50/50 dark:bg-red-950/15 opacity-60', dot: 'bg-danger', stripe: 'bg-danger', checkout: 'bg-transparent text-transparent' },
}
const cardBgClass = (s: string) => statusColors[s]?.bg || 'bg-zinc-50/70 dark:bg-zinc-900/30'
const statusDotClass = (s: string) => statusColors[s]?.dot || 'bg-primary'
const statusStripeClass = (s: string) => statusColors[s]?.stripe || 'bg-primary'
const checkoutBtnClass = (s: string) => statusColors[s]?.checkout || ''

// ---- Interactions ----
function onColumnClick(col: GridColumn, e: MouseEvent) {
  const c = gridContainer.value; if (!c) return
  const clickY = e.clientY - c.getBoundingClientRect().top + c.scrollTop
  const mins = (clickY / HOUR_HEIGHT) * 60
  const hour = START_HOUR + Math.floor(mins / 60)
  const minute = Math.floor((mins % 60) / 15) * 15
  if (hour >= END_HOUR || hour < START_HOUR) return
  const dateStr = viewMode.value === 'week' ? col.key : selectedDate.value
  const start = new Date(dateStr + 'T12:00:00'); start.setHours(hour, minute, 0, 0)
  const end = new Date(start); end.setMinutes(end.getMinutes() + 30)
  emit('slotSelect', { start, end, employeeId: col.key !== '__default__' && viewMode.value !== 'week' ? col.key : undefined })
}

function emitEventClick(raw: any) {
  const start = new Date(raw.start_time); const end = new Date(raw.end_time)
  const svc = services.value?.find(s => s.id === raw.service_id)
  const status = normalizeAppointmentStatus(raw)
  const effectiveDuration = raw.duration_override != null
    ? Number(raw.duration_override)
    : Math.round((end.getTime() - start.getTime()) / 60000) || Number(svc?.duration_minutes ?? 30)
  const effectivePrice = raw.price_override != null
    ? Number(raw.price_override)
    : Number(svc?.price ?? 0)
  emit('eventClick', {
    id: raw.id, title: raw.client?.full_name || raw.clients?.full_name || 'Cliente', start, end, status,
    citaData: {
      id: raw.id, clientId: raw.client_id, clientName: raw.client?.full_name || raw.clients?.full_name || 'Cliente',
      serviceId: raw.service_id, service: svc?.name || 'Servicio', employeeId: raw.employee_id,
      employee: employees.value?.find(e => e.id === raw.employee_id)?.full_name || 'Empleado',
      assistantId: raw.assistant_employee_id || undefined,
      assistantName: raw.assistant_profile?.full_name ?? undefined,
      assistantPercentage: raw.assistant_percentage ?? undefined,
      groupId: raw.group_id || undefined,
      date: toISODate(start), time: dateToHHmm(start),
      duration: effectiveDuration,
      price: effectivePrice, status: status as Cita['status'], paymentStatus: raw.payment_status as Cita['paymentStatus'], notes: raw.internal_notes || '',
    },
  })
}

function emitCheckout(id: string) { emit('checkout', id) }

// ---- Status menu ----
function toggleStatusMenu(appt: DisplayAppointment, e: MouseEvent) {
  if (statusMenu.value?.appointmentId === appt.id) { statusMenu.value = null; return }
  const r = (e.target as HTMLElement).getBoundingClientRect()
  statusMenu.value = { appointmentId: appt.id, currentStatus: appt.status, x: r.left - 8, y: r.bottom + 4 }
}

function changeStatus(id: string, s: string) {
  emit('statusChange', { id, status: s as 'pending' | 'confirmed' | 'cancelled' | 'paid' })
  statusMenu.value = null
}

function onDocClick(e: MouseEvent) { if (statusMenu.value && !(e.target as HTMLElement)?.closest('.fixed')) statusMenu.value = null; if (empDropdownOpen.value && !(e.target as HTMLElement)?.closest('.relative')) empDropdownOpen.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

// ---- Detail Popup ----
const detailPopup = ref<{ appt: DisplayAppointment; x: number; y: number } | null>(null)

function showDetailPopup(appt: DisplayAppointment, e: MouseEvent) {
  const x = Math.min(e.clientX - 140, window.innerWidth - 300)
  const y = Math.min(e.clientY, window.innerHeight - 300)
  detailPopup.value = { appt, x: Math.max(x, 8), y: Math.max(y, 8) }
}

function handleEditClick() {
  if (!detailPopup.value) return
  const raw = detailPopup.value.appt.raw
  detailPopup.value = null
  emitEventClick(raw)
}

function handleDeleteClick() {
  if (!detailPopup.value) return
  const id = detailPopup.value.appt.id
  detailPopup.value = null
  emit('delete', id)
}

function statusTextClass(status: string) {
  const map: Record<string, string> = {
    confirmed: 'text-primary', pending: 'text-warning', paid: 'text-success',
    cancelled: 'text-danger', no_show: 'text-danger',
  }
  return map[status] || 'text-text'
}

// ---- Init ----
onMounted(() => {
  const now = new Date()
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= START_HOUR * 60 && m <= END_HOUR * 60) {
    nextTick(() => {
      if (gridContainer.value) gridContainer.value.scrollTop = Math.max(0, ((m - START_HOUR * 60) / 60) * HOUR_HEIGHT - 200)
    })
  }
  if (!isAdmin.value && authStore.profile?.id) selectedEmployeeId.value = authStore.profile.id
  const ep = route.query.employee as string | undefined
  if (ep) selectedEmployeeId.value = ep
  if (props.initialDate) goToDate(props.initialDate)
})
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
