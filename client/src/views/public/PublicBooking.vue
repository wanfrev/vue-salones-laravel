<template>
  <div class="booking-root" :style="cssVars">
    <div class="booking-page">
      <!-- Header -->
      <header class="header">
        <div class="flex items-center gap-2.5 min-w-0">
          <img :src="logo" alt="Luma" class="h-7 sm:h-8 w-auto object-contain" />
          <span v-if="business?.name" class="text-[11px] sm:text-xs font-semibold text-text-muted truncate">{{ business.name }}</span>
        </div>
        <button
          type="button"
          @click="toggleTheme"
          class="h-9 w-9 flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text active:scale-90 transition-all bg-transparent shrink-0"
          :aria-label="isDarkEffective ? 'Modo claro' : 'Modo oscuro'"
        >
          <svg v-if="!isDarkEffective" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>
        </button>
      </header>

      <!-- Employee -->
      <div v-if="employeeName" class="emp-line">
        <div class="emp-avatar" :style="{ background: primaryColor }">{{ getInitials(employeeName) }}</div>
        <span class="text-sm font-semibold text-text truncate">Agenda con {{ employeeName }}</span>
      </div>

      <!-- Steps -->
      <nav class="steps-nav" aria-label="Progreso">
        <template v-for="(label, i) in steps" :key="i">
          <button
            type="button"
            @click="goToStep(i)"
            :disabled="i > maxReachedStep"
            class="step-btn"
            :class="i > maxReachedStep ? 'opacity-25 pointer-events-none' : ''"
          >
            <span
              class="step-num"
              :style="i === currentStep
                ? { background: primaryColor, color: '#fff' }
                : i < currentStep
                  ? { background: `${primaryColor}88`, color: '#fff' }
                  : {}"
            >
              <template v-if="i < currentStep">✓</template>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="step-txt" :style="i === currentStep ? { color: primaryColor, fontWeight: 700 } : {}">{{ label }}</span>
          </button>
          <span v-if="i < steps.length - 1" class="step-divider" :style="i < currentStep ? { background: `${primaryColor}55` } : {}" />
        </template>
      </nav>

      <!-- Loading / Errors -->
      <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center"><div class="spinner" /></div>
      <div v-else-if="businessError" class="flex-1 flex items-center justify-center text-center px-4"><p class="text-sm text-text-muted">Negocio no encontrado.</p></div>
      <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center text-center px-4"><p class="text-sm text-text-muted">Reservas no disponibles.</p></div>

      <!-- Content -->
      <div v-else class="content-area">
        <!-- STEP EMPLEADO (solo cuando el link no trae uno fijo) -->
        <div v-if="!hasPresetEmployee && currentStep === stepEmployee" class="step-view">
          <p class="step-hint">¿Con quién te gustaría atenderte?</p>

          <div v-if="loadingEmployeesList" class="flex-1 flex items-center justify-center"><div class="spinner" /></div>
          <div v-else-if="(employeesList ?? []).length === 0" class="flex-1 flex items-center justify-center">
            <p class="text-xs text-text-muted">No hay empleados disponibles.</p>
          </div>
          <div v-else class="svc-list">
            <button
              v-for="emp in (employeesList ?? [])"
              :key="emp.id"
              type="button"
              class="svc-item"
              @click="onSelectEmployee(emp)"
            >
              <span class="emp-avatar" :style="{ background: primaryColor }">{{ getInitials(emp.full_name) }}</span>
              <span class="svc-info">
                <span class="svc-name">{{ emp.full_name }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- STEP Día -->
        <div v-else-if="currentStep === stepDay" class="step-view">
          <div class="cal-head">
            <button type="button" @click="prevMonth" :disabled="!canGoPrevMonth" class="cal-nav-btn" :class="{ 'opacity-20': !canGoPrevMonth }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span class="cal-month-title">{{ calendarMonthLabel }}</span>
            <button type="button" @click="nextMonth" :disabled="!canGoNextMonth" class="cal-nav-btn" :class="{ 'opacity-20': !canGoNextMonth }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div class="cal-dow"><span v-for="d in dayOfWeekHeaders" :key="d">{{ d }}</span></div>
          <div class="cal-grid">
            <button
              v-for="(c, ci) in calendarCells"
              :key="ci"
              type="button"
              class="cal-day"
              :disabled="!c.selectable"
              :class="{
                'cal-day-sel': c.isSelected,
                'cal-day-today': c.isToday && !c.isSelected,
                'cal-day-ghost': !c.selectable,
              }"
              :style="c.isSelected ? { background: primaryColor, color: '#fff' } : c.isToday ? { boxShadow: `inset 0 0 0 1.5px ${primaryColor}` } : {}"
              @click="onSelectDay(c)"
            >{{ c.dayNumber }}</button>
          </div>
        </div>

        <!-- STEP Horario -->
        <div v-else-if="currentStep === stepTime" class="step-view">
          <button type="button" class="back-link" @click="goToStep(stepDay)">← {{ formatDateLabel(selectedDate) }}</button>
          <p class="step-hint">{{ freeSlots.length }} horario{{ freeSlots.length !== 1 ? 's' : '' }} disponible{{ freeSlots.length !== 1 ? 's' : '' }}</p>

          <div v-if="loadingCalendar" class="flex-1 flex items-center justify-center"><div class="spinner" /></div>
          <div v-else-if="!hasSchedule" class="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <p class="font-semibold text-text text-sm">Sin horario este día</p>
            <p class="text-xs text-text-muted">{{ employeeName || 'El profesional' }} no atiende.</p>
            <button type="button" class="text-xs font-semibold" :style="{ color: primaryColor }" @click="goToStep(stepDay)">Elegir otro día</button>
          </div>
          <div v-else-if="freeSlots.length === 0" class="flex-1 flex items-center justify-center">
            <p class="text-sm text-text-muted">No hay horarios libres.</p>
          </div>
          <div v-else class="slots-wrap">
            <button
              v-for="s in freeSlots"
              :key="s.label + s.start"
              type="button"
              class="slot"
              :class="{ 'slot-sel': pendingSlot?.start === s.start }"
              :style="pendingSlot?.start === s.start ? { borderColor: primaryColor, background: `${primaryColor}14` } : {}"
              @click="onSelectTime(s)"
            >{{ s.label }}</button>
          </div>
        </div>

        <!-- STEP Servicios (multi-select) -->
        <div v-else-if="currentStep === stepServices" class="step-view">
          <div class="svc-top">
            <button type="button" class="back-link" @click="goToStep(stepTime)">
              ← {{ formatDateLabel(selectedDate) }} · {{ pendingSlot ? formatSlotTime(pendingSlot) : '' }}
            </button>
            <span class="text-[10px] sm:text-xs text-text-muted font-medium shrink-0">{{ formatDuration(availableMinutes) }} disp.</span>
          </div>
          <p class="step-hint">Puedes elegir varios servicios</p>

          <div v-if="(services ?? []).length === 0" class="flex-1 flex items-center justify-center">
            <p class="text-xs text-text-muted">Sin servicios disponibles.</p>
          </div>
          <div v-else class="svc-list">
            <button
              v-for="svc in (services ?? [])"
              :key="svc.id"
              type="button"
              class="svc-item"
              :class="{ 'svc-sel': isServiceSelected(svc) }"
              :style="isServiceSelected(svc) ? { borderColor: primaryColor, background: `${primaryColor}0A` } : {}"
              @click="toggleService(svc)"
            >
              <span class="svc-check" :style="isServiceSelected(svc) ? { background: primaryColor, borderColor: primaryColor } : {}">
                <svg v-if="isServiceSelected(svc)" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </span>
              <span class="svc-info">
                <span class="svc-name">{{ svc.name }}</span>
                <span class="svc-meta">{{ svc.duration_minutes }} min</span>
              </span>
              <span class="svc-price">${{ Number(svc.price).toFixed(0) }}</span>
            </button>
          </div>

          <div v-if="chosenServices.length > 0" class="svc-footer">
            <span class="text-[11px] text-text-muted">{{ chosenServices.length }} · {{ formatDuration(totalSelectedDuration) }}</span>
            <span class="text-sm font-extrabold" :style="{ color: primaryColor }">${{ totalSelectedPrice.toFixed(0) }}</span>
          </div>
          <p v-if="chosenServices.length > 0 && !canConfirm" class="err-msg">
            La duración total supera el tiempo disponible en este horario. Quita un servicio o elige otro horario.
          </p>
          <button
            type="button"
            class="cta-btn"
            :disabled="!canConfirm"
            :style="{ background: primaryColor, opacity: canConfirm ? 1 : 0.35 }"
            @click="goToConfirm"
          >
            {{ chosenServices.length
              ? `Continuar con ${chosenServices.length} servicio${chosenServices.length !== 1 ? 's' : ''}`
              : 'Selecciona al menos un servicio' }}
          </button>
        </div>

        <!-- STEP Confirmar -->
        <div v-else-if="currentStep === stepConfirm" class="step-view">
          <button type="button" class="back-link" @click="goToStep(stepServices)">← Cambiar servicios</button>
          <p class="text-sm font-bold text-text">Confirma tu reserva</p>

          <div class="summary">
            <div class="sum-row">
              <span class="sum-lbl">Servicios</span>
              <span class="sum-val">{{ chosenServices.map(s => s.name).join(', ') }}</span>
            </div>
            <div class="sum-row">
              <span class="sum-lbl">Duración</span>
              <span class="sum-val">{{ formatDuration(totalSelectedDuration) }}</span>
            </div>
            <div class="sum-row">
              <span class="sum-lbl">Día y hora</span>
              <span class="sum-val">{{ formatSlotRange(pendingSlot) }}</span>
            </div>
            <div class="sum-row">
              <span class="sum-lbl">Profesional</span>
              <span class="sum-val">{{ employeeName }}</span>
            </div>
            <div class="sum-row sum-total" :style="{ background: `${primaryColor}0A` }">
              <span class="text-xs font-bold text-text">Total</span>
              <span class="text-base font-extrabold" :style="{ color: primaryColor }">${{ totalSelectedPrice.toFixed(0) }}</span>
            </div>
          </div>

          <label class="name-label">¿Cómo te llamas? <span class="text-danger">*</span></label>
          <input
            v-model="clientName"
            type="text"
            placeholder="Tu nombre completo"
            maxlength="200"
            class="name-inp"
            :class="{ 'name-err': nameTouched && !nameValid }"
            @input="nameTouched = true"
          />
          <p v-if="nameTouched && !nameValid" class="err-msg">El nombre es obligatorio.</p>
          <p v-if="submitError" class="err-msg">{{ submitError }}</p>

          <button
            type="button"
            class="cta-btn"
            :disabled="submitting || !canSubmit"
            :style="{ background: primaryColor, opacity: (submitting || !canSubmit) ? 0.4 : 1 }"
            @click="submitRequest"
          >
            <span v-if="submitting" class="spinner-sm" />
            {{ submitting ? 'Reservando…' : 'Confirmar reserva' }}
          </button>
        </div>

        <!-- STEP Éxito -->
        <div v-else-if="currentStep === stepSuccess" class="step-view success-view">
          <div class="success-circle" :style="{ background: `${primaryColor}15` }">
            <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: primaryColor }">
              <path d="M5 13l4 4L19 7" class="success-path" />
            </svg>
          </div>
          <h2 class="text-lg font-extrabold text-text mt-3">¡Reserva enviada!</h2>
          <p class="text-sm text-text-muted mt-2 leading-relaxed max-w-xs">
            {{ employeeName }} recibirá tu solicitud para
            <b class="text-text">{{ chosenServices.map(s => s.name).join(', ') }}</b>
            el {{ formatSlotRange(pendingSlot) }}.
          </p>
          <p class="text-xs text-text-muted/50 mt-3">Gracias por tu reserva.</p>
        </div>
      </div>

      <footer v-if="business && publicBookingEnabled && currentStep !== stepSuccess" class="footer">
        <p class="text-[10px] text-text-muted/40">{{ business.name }} recibirá tu solicitud.</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useThemeStore } from '../../store/theme'
import {
  getBusinessPublic,
  getEmployeePublic,
  listPublicEmployees,
  listPublicServices,
  submitBookingRequest,
  getCalendarData,
} from '../../services/publicBookingService'
import type { PublicEmployee, PublicService } from '../../services/publicBookingService'
import logoLight from '../../assets/Luma.svg'
import logoDark from '../../assets/Luma blanco.svg'

const route = useRoute()
const themeStore = useThemeStore()
const slug = computed(() => route.params.slug as string)
const presetEmployeeId = ref(String(route.query.empleado || ''))
const hasPresetEmployee = computed(() => !!presetEmployeeId.value)
const pickedEmployee = ref<PublicEmployee | null>(null)
const effectiveEmployeeId = computed(() => presetEmployeeId.value || pickedEmployee.value?.id || '')

const logo = computed(() => (themeStore.isDark ? logoDark : logoLight))
const isDarkEffective = computed(() => themeStore.isDark)
function toggleTheme() { themeStore.toggle() }

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const maxCal = new Date(today.getFullYear(), today.getMonth() + 4, 0)
const maxCalStr = maxCal.toISOString().slice(0, 10)

const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(todayStr)

// The "Empleado" step only exists when the invitation link doesn't already pin one — every
// other step index shifts by one to make room for it.
const steps = computed(() =>
  hasPresetEmployee.value
    ? ['Día', 'Horario', 'Servicios', 'Confirmar', 'Listo']
    : ['Empleado', 'Día', 'Horario', 'Servicios', 'Confirmar', 'Listo'],
)
const stepOffset = computed(() => (hasPresetEmployee.value ? 0 : 1))
const stepEmployee = 0
const stepDay = computed(() => stepOffset.value)
const stepTime = computed(() => 1 + stepOffset.value)
const stepServices = computed(() => 2 + stepOffset.value)
const stepConfirm = computed(() => 3 + stepOffset.value)
const stepSuccess = computed(() => 4 + stepOffset.value)

const canGoPrevMonth = computed(() => {
  const cm = calendarMonth.value
  return cm.getFullYear() > today.getFullYear()
    || (cm.getFullYear() === today.getFullYear() && cm.getMonth() > today.getMonth())
})
const canGoNextMonth = computed(() => {
  const cm = calendarMonth.value
  return cm.getFullYear() < maxCal.getFullYear()
    || (cm.getFullYear() === maxCal.getFullYear() && cm.getMonth() < maxCal.getMonth())
})
const calendarMonthLabel = computed(() =>
  calendarMonth.value.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }),
)
const dayOfWeekHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalCell {
  dateStr: string
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  selectable: boolean
}

const calendarCells = computed<CalCell[]>(() => {
  const y = calendarMonth.value.getFullYear()
  const m = calendarMonth.value.getMonth()
  const first = new Date(y, m, 1)
  let sd = first.getDay()
  if (sd === 0) sd = 7
  const dim = new Date(y, m + 1, 0).getDate()
  const prevEnd = new Date(y, m, 0).getDate()
  const cells: CalCell[] = []

  for (let i = sd - 1; i > 0; i--) {
    cells.push({ dateStr: '', dayNumber: prevEnd - i + 1, isToday: false, isSelected: false, selectable: false })
  }
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      dateStr: ds,
      dayNumber: d,
      isToday: ds === todayStr,
      isSelected: ds === selectedDate.value,
      selectable: ds >= todayStr && ds <= maxCalStr,
    })
  }
  const rem = 7 - (cells.length % 7)
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) {
      cells.push({ dateStr: '', dayNumber: d, isToday: false, isSelected: false, selectable: false })
    }
  }
  return cells
})

function prevMonth() {
  if (!canGoPrevMonth.value) return
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1)
}
function nextMonth() {
  if (!canGoNextMonth.value) return
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
}

const currentStep = ref(0)
const maxReachedStep = ref(0)

function goToStep(s: number) {
  if (s <= maxReachedStep.value) currentStep.value = s
}
function advanceTo(s: number) {
  currentStep.value = s
  maxReachedStep.value = Math.max(maxReachedStep.value, s)
}

const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({
  queryKey: computed(() => ['pb-biz', slug.value] as const),
  queryFn: () => getBusinessPublic(slug.value),
  staleTime: 5 * 60 * 1000,
})

const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')
const cssVars = computed(() => ({ '--color-primary': primaryColor.value }))

const publicBookingEnabled = computed(() => {
  const f = business.value?.features
  if (!f || typeof f !== 'object') return true
  return f.enable_public_booking !== false
})

const { data: employeeData } = useQuery({
  queryKey: computed(() => ['pb-emp', slug.value, presetEmployeeId.value] as const),
  queryFn: () => getEmployeePublic(slug.value, presetEmployeeId.value),
  enabled: computed(() => !!presetEmployeeId.value && !!business.value),
  staleTime: 5 * 60 * 1000,
})
const employeeName = computed(() => employeeData.value?.full_name || pickedEmployee.value?.full_name || '')

const { data: employeesList, isLoading: loadingEmployeesList } = useQuery({
  queryKey: computed(() => ['pb-emps', slug.value] as const),
  queryFn: () => listPublicEmployees(slug.value),
  enabled: computed(() => !hasPresetEmployee.value && !!business.value),
  staleTime: 5 * 60 * 1000,
})

function onSelectEmployee(emp: PublicEmployee) {
  pickedEmployee.value = emp
  advanceTo(stepDay.value)
}

const { data: services } = useQuery({
  queryKey: computed(() => ['pb-svcs', slug.value] as const),
  queryFn: () => listPublicServices(slug.value),
  enabled: computed(() => !!business.value),
  staleTime: 5 * 60 * 1000,
})

const dateRange = computed(() => ({
  from: `${selectedDate.value}T00:00:00`,
  to: `${selectedDate.value}T23:59:59`,
}))
const { data: calendarData, isLoading: loadingCalendar } = useQuery({
  queryKey: computed(() => ['pb-cal', slug.value, effectiveEmployeeId.value, selectedDate.value] as const),
  queryFn: () => getCalendarData(slug.value, effectiveEmployeeId.value, dateRange.value.from, dateRange.value.to),
  enabled: computed(() => !!effectiveEmployeeId.value && !!business.value && currentStep.value >= stepDay.value),
  staleTime: 0,
})

const schedules = computed(() => (calendarData.value?.schedules ?? []) as Array<{ weekday: number; start_time: string; end_time: string }>)
const occupied = computed(() => (calendarData.value?.occupied ?? []) as Array<{ start: string; end: string }>)
const absences = computed(() => (calendarData.value?.absences ?? []) as Array<{ start: string; end: string }>)
const selDow = computed(() => new Date(selectedDate.value + 'T12:00:00').getDay())
const hasSchedule = computed(() => schedules.value.some(s => Number(s.weekday) === selDow.value))

interface FreeSlot { start: string; label: string; availableMs: number }

const freeSlots = computed<FreeSlot[]>(() => {
  const date = selectedDate.value
  const daySchedules = schedules.value.filter(s => Number(s.weekday) === selDow.value)
  if (!daySchedules.length) return []

  const occ = [
    ...occupied.value.map(o => ({ s: new Date(o.start).getTime(), e: new Date(o.end).getTime() })),
    ...absences.value.map(a => ({ s: new Date(a.start).getTime(), e: new Date(a.end).getTime() })),
  ].sort((a, b) => a.s - b.s)

  const results: FreeSlot[] = []
  const STEP = 30 * 60 * 1000

  for (const sch of daySchedules) {
    const [sh, sm] = sch.start_time.split(':').map(Number)
    const [eh, em] = sch.end_time.split(':').map(Number)
    const ss = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`).getTime()
    const se = new Date(`${date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`).getTime()
    let cur = ss
    while (cur < se) {
      const slotEnd = cur + STEP
      if (slotEnd > se) break
      if (!occ.some(o => cur < o.e && slotEnd > o.s)) {
        let gapEnd = slotEnd
        while (gapEnd + STEP <= se && !occ.some(o => gapEnd < o.e && gapEnd + STEP > o.s)) {
          gapEnd += STEP
        }
        for (const o of occ) {
          if (o.s > cur && o.s < gapEnd) gapEnd = Math.floor(o.s / STEP) * STEP
        }
        const sd = new Date(cur)
        const h12 = sd.getHours() % 12 || 12
        const mm = sd.getMinutes()
        const ap = sd.getHours() >= 12 ? 'PM' : 'AM'
        results.push({
          start: new Date(cur).toISOString(),
          label: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ap}`,
          availableMs: gapEnd - cur,
        })
      }
      cur += STEP
    }
  }
  return results
})

const pendingSlot = ref<FreeSlot | null>(null)
const chosenServices = ref<PublicService[]>([])
const submitting = ref(false)
const clientName = ref('')
const nameTouched = ref(false)
const submitError = ref('')

const availableMinutes = computed(() =>
  pendingSlot.value ? Math.floor(pendingSlot.value.availableMs / 60000) : 0,
)
const totalSelectedDuration = computed(() =>
  chosenServices.value.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
)
const totalSelectedPrice = computed(() =>
  chosenServices.value.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
)
const canConfirm = computed(() =>
  chosenServices.value.length > 0 && totalSelectedDuration.value <= availableMinutes.value,
)
const nameValid = computed(() => clientName.value.trim().length > 0)
const canSubmit = computed(() => nameValid.value && chosenServices.value.length > 0 && !!pendingSlot.value)

function onSelectDay(c: CalCell) {
  if (!c.selectable || !c.dateStr) return
  selectedDate.value = c.dateStr
  pendingSlot.value = null
  chosenServices.value = []
  advanceTo(stepTime.value)
}

function onSelectTime(s: FreeSlot) {
  pendingSlot.value = s
  if (totalSelectedDuration.value > Math.floor(s.availableMs / 60000)) {
    chosenServices.value = []
  }
  advanceTo(stepServices.value)
}

function isServiceSelected(svc: PublicService) {
  return chosenServices.value.some(x => x.id === svc.id)
}

function toggleService(svc: PublicService) {
  if (isServiceSelected(svc)) {
    chosenServices.value = chosenServices.value.filter(x => x.id !== svc.id)
    return
  }
  chosenServices.value = [...chosenServices.value, svc]
}

function goToConfirm() {
  if (!canConfirm.value) return
  advanceTo(stepConfirm.value)
}

function formatSlotTime(s: FreeSlot | null) {
  if (!s) return ''
  return new Date(s.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatSlotRange(s: FreeSlot | null) {
  if (!s) return ''
  const d = new Date(s.start)
  return `${d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}`
}
function formatDuration(m: number) {
  const mins = Math.floor(m || 0)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const r = mins % 60
  return r > 0 ? `${h}h ${r}min` : `${h}h`
}
function formatDateLabel(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
}
function getInitials(n: string) {
  return n.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

async function submitRequest() {
  if (!chosenServices.value.length || !pendingSlot.value) return
  if (!effectiveEmployeeId.value) {
    submitError.value = 'Falta elegir un empleado.'
    return
  }
  if (!nameValid.value) {
    nameTouched.value = true
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    await submitBookingRequest(slug.value, {
      employee_id: effectiveEmployeeId.value,
      service_ids: chosenServices.value.map(s => s.id),
      start_time: pendingSlot.value.start,
      client_name: clientName.value.trim(),
    })
    advanceTo(stepSuccess.value)
  } catch (e: unknown) {
    const err = e as { message?: string; data?: { message?: string } }
    const msg = String(err?.message || err?.data?.message || '')
    submitError.value =
      msg.toLowerCase().includes('disponible') || msg.includes('409')
        ? 'Este horario ya fue tomado. Elige otro.'
        : (err?.data?.message || 'Error al reservar. Intenta de nuevo.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.booking-root {
  min-height: 100dvh;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: stretch;
  justify-content: center;
}
.booking-page {
  width: 100%;
  max-width: 28rem;
  min-height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: calc(env(safe-area-inset-top, 0px) + 0.625rem) 0.875rem calc(env(safe-area-inset-bottom, 0px) + 0.625rem);
  gap: 0.375rem;
}
@media (min-width: 640px) {
  .booking-page {
    max-width: 36rem;
    padding: 1.25rem 1.5rem;
    gap: 0.5rem;
  }
}
@media (min-width: 1024px) {
  .booking-page {
    max-width: 42rem;
    padding: 1.5rem 2rem;
  }
}

.header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-shrink: 0; }
.emp-line { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.emp-avatar {
  display: flex; height: 1.75rem; width: 1.75rem; align-items: center; justify-content: center;
  border-radius: 9999px; font-size: 0.5625rem; font-weight: 700; color: #fff; flex-shrink: 0;
}

.steps-nav { display: flex; align-items: center; justify-content: center; gap: 0.125rem; flex-shrink: 0; }
.step-btn { display: flex; align-items: center; gap: 0.25rem; padding: 0.125rem; border: none; background: none; cursor: pointer; }
.step-num {
  display: flex; height: 1.25rem; width: 1.25rem; align-items: center; justify-content: center;
  border-radius: 9999px; font-size: 0.5625rem; font-weight: 700;
  background: var(--color-surface-muted); color: var(--color-text-muted);
}
.step-txt { font-size: 0.5625rem; font-weight: 500; color: var(--color-text-muted); white-space: nowrap; }
@media (min-width: 400px) {
  .step-num { height: 1.375rem; width: 1.375rem; font-size: 0.625rem; }
  .step-txt { font-size: 0.625rem; }
}
.step-divider { width: 0.75rem; height: 1px; background: var(--color-border); flex-shrink: 0; }
@media (min-width: 640px) { .step-divider { width: 1.25rem; } }

.content-area {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.step-view {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  border-radius: 0.875rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
@media (min-width: 640px) {
  .step-view { padding: 0.75rem; border-radius: 1rem; gap: 0.5rem; }
}

.spinner {
  height: 1.75rem; width: 1.75rem; border-radius: 9999px;
  border: 2.5px solid var(--color-border); border-top-color: var(--color-primary);
  animation: spin 0.7s linear infinite;
}
.spinner-sm {
  display: inline-block; height: 0.875rem; width: 0.875rem; border-radius: 9999px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.cta-btn {
  width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.75rem; border: none;
  color: #fff; font-size: 0.8125rem; font-weight: 700; cursor: pointer;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 0.375rem;
}
.cta-btn:disabled { cursor: not-allowed; }
.cta-btn:active:not(:disabled) { opacity: 0.85; }

.back-link {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.6875rem; color: var(--color-text-muted);
  border: none; background: none; cursor: pointer; padding: 0; flex-shrink: 0;
  text-align: left; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.back-link:hover { color: var(--color-text); }
.step-hint {
  font-size: 0.625rem; font-weight: 600; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
}

/* Calendar */
.cal-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.cal-nav-btn {
  display: flex; height: 1.75rem; width: 1.75rem; align-items: center; justify-content: center;
  border-radius: 0.5rem; border: 1px solid var(--color-border); color: var(--color-text-muted);
  background: transparent; cursor: pointer;
}
.cal-nav-btn svg { width: 0.875rem; height: 0.875rem; }
.cal-nav-btn:disabled { cursor: not-allowed; }
.cal-month-title { font-size: 0.8125rem; font-weight: 700; color: var(--color-text); text-transform: capitalize; }
.cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); flex-shrink: 0; }
.cal-dow span {
  text-align: center; font-size: 0.5rem; font-weight: 700; color: var(--color-text-muted);
  opacity: 0.5; text-transform: uppercase; padding: 0.125rem 0;
}
.cal-grid {
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(1.75rem, 1fr);
  gap: 2px;
}
.cal-day {
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 0.375rem;
  cursor: pointer; font-size: 0.6875rem; font-weight: 600; color: var(--color-text);
  padding: 0; min-height: 0;
}
.cal-day:active:not(:disabled) { transform: scale(0.92); }
.cal-day-ghost { opacity: 0.2; cursor: default; }
.cal-day-sel { color: #fff; }
.cal-day-today { font-weight: 800; }

/* Slots */
.slots-wrap {
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
  align-content: start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 400px) {
  .slots-wrap { grid-template-columns: repeat(4, 1fr); }
}
.slot {
  padding: 0.5rem 0.25rem; border-radius: 0.5rem; border: 1px solid var(--color-border);
  background: transparent; cursor: pointer; font-size: 0.75rem; font-weight: 600;
  color: var(--color-text); text-align: center; min-height: 2.5rem;
}
.slot:active { transform: scale(0.96); }
.slot-sel { font-weight: 700; }

/* Services */
.svc-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-shrink: 0; }
.svc-list {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.svc-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.625rem; border-radius: 0.625rem;
  border: 1px solid var(--color-border); background: transparent;
  cursor: pointer; text-align: left; flex-shrink: 0; min-height: 2.75rem;
}
.svc-item:active { transform: scale(0.98); }
.svc-check {
  flex-shrink: 0; height: 1.125rem; width: 1.125rem; border-radius: 0.25rem;
  border: 2px solid var(--color-border-strong);
  display: flex; align-items: center; justify-content: center;
}
.svc-check svg { width: 0.625rem; height: 0.625rem; }
.svc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.svc-name {
  font-size: 0.75rem; font-weight: 600; color: var(--color-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.svc-meta { font-size: 0.5625rem; color: var(--color-text-muted); }
.svc-price { font-size: 0.8125rem; font-weight: 800; color: var(--color-text); flex-shrink: 0; }
.svc-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 0.25rem; border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
}

/* Summary */
.summary {
  border-radius: 0.625rem; border: 1px solid var(--color-border);
  overflow: hidden; flex-shrink: 0; max-height: 40%; overflow-y: auto;
}
.sum-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 0.375rem 0.625rem; border-bottom: 1px solid var(--color-border-subtle); gap: 0.5rem;
}
.sum-row:last-child { border-bottom: none; }
.sum-lbl { font-size: 0.625rem; color: var(--color-text-muted); flex-shrink: 0; }
.sum-val { font-size: 0.6875rem; font-weight: 600; color: var(--color-text); text-align: right; word-break: break-word; }

.name-label {
  display: block; font-size: 0.625rem; font-weight: 600; color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
}
.name-inp {
  width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.625rem;
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: 1rem; color: var(--color-text); outline: none; flex-shrink: 0;
}
.name-inp::placeholder { color: var(--color-text-muted); opacity: 0.5; }
.name-inp:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent); }
.name-err { border-color: var(--color-danger) !important; }
.err-msg { font-size: 0.6875rem; color: var(--color-danger); flex-shrink: 0; margin: 0; }

.success-view { align-items: center; justify-content: center; text-align: center; }
.success-circle {
  display: flex; height: 3.5rem; width: 3.5rem; align-items: center; justify-content: center; border-radius: 9999px;
}
.success-path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: draw 0.45s 0.15s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }

.footer { flex-shrink: 0; text-align: center; padding-top: 0.125rem; }
</style>
