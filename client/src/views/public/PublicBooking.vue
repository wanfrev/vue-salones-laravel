<template>
  <div class="booking-root" :style="cssVars">
    <!-- Full-bleed background image with mask -->
    <div
      class="booking-image"
      :style="{ '--booking-image': `url('${leafBackground}')` }"
      aria-hidden="true"
    />

    <!-- Content area -->
    <div class="booking-content">
      <!-- Header: Logo + theme toggle -->
      <div class="booking-header">
        <div class="flex items-center gap-3 min-w-0">
          <img :src="logo" alt="Luma" class="h-7 sm:h-10 w-auto object-contain" />
          <span v-if="business?.name" class="text-[11px] sm:text-xs font-semibold text-text-muted truncate">{{ business.name }}</span>
        </div>
        <button @click="toggleTheme" class="theme-btn" :aria-label="isDarkEffective ? 'Modo claro' : 'Modo oscuro'">
          <svg v-if="!isDarkEffective" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>
        </button>
      </div>

      <!-- Employee line -->
      <div v-if="employeeName" class="booking-employee">
        <div class="avatar-circle" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">
          {{ getInitials(employeeName) }}
        </div>
        <p class="text-sm sm:text-base font-semibold text-text truncate">Agenda con {{ employeeName }}</p>
      </div>

      <!-- Step indicators -->
      <div class="steps-bar">
        <template v-for="(step, i) in steps" :key="i">
          <button @click="goToStep(i)" :disabled="i > maxReachableStep" class="step-item" :class="i > maxReachableStep ? 'opacity-30' : ''">
            <span class="step-dot" :class="stepDotClass(i)" :style="stepDotStyle(i)">
              <span v-if="i < currentStep">&#10003;</span>
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="step-label" :class="currentStep === i ? 'text-text' : i < currentStep ? 'text-text-secondary' : 'text-text-muted'">
              {{ step.label }}
            </span>
          </button>
          <div v-if="i < steps.length - 1" class="step-line" :class="i < currentStep ? 'bg-primary/50' : 'bg-border'" />
        </template>
      </div>

      <!-- LOADING / ERROR / DISABLED -->
      <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center py-16">
        <div class="flex flex-col items-center gap-3">
          <div class="h-9 w-9 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          <p class="text-sm text-text-muted">Cargando...</p>
        </div>
      </div>
      <div v-else-if="businessError" class="flex-1 flex items-center justify-center text-center py-16 px-6">
        <div>
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-light">
            <svg class="h-7 w-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          </div>
          <p class="text-base font-semibold text-text mb-1">Negocio no encontrado</p>
          <p class="text-sm text-text-muted">Verifica el enlace o contacta a quien te lo envió.</p>
        </div>
      </div>
      <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center text-center py-16 px-6">
        <div>
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-light">
            <svg class="h-7 w-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          </div>
          <p class="text-base font-semibold text-text mb-1">Reservas no disponibles</p>
          <p class="text-sm text-text-muted">Este negocio no acepta reservas públicas.</p>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="booking-card-outer">
        <div class="booking-card">
          <!-- ============ STEP 0: CALENDARIO ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 0" key="s0" class="step-panel">
              <p class="step-title">Selecciona un día</p>

              <div class="cal-nav">
                <button @click="prevMonth" :disabled="!canGoPrevMonth" class="cal-arrow" :class="!canGoPrevMonth ? 'opacity-20' : ''">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span class="cal-month">{{ calendarMonthLabel }}</span>
                <button @click="nextMonth" :disabled="!canGoNextMonth" class="cal-arrow" :class="!canGoNextMonth ? 'opacity-20' : ''">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>

              <div class="cal-dow">
                <span v-for="dow in dayOfWeekHeaders" :key="dow">{{ dow }}</span>
              </div>

              <div class="cal-grid">
                <button
                  v-for="(cell, ci) in calendarCells" :key="ci"
                  @click="cell.selectable ? selectDay(cell.dateStr) : undefined"
                  :disabled="!cell.selectable"
                  class="cal-cell"
                  :class="calCellClass(cell)"
                  :style="calCellStyle(cell)"
                >
                  <span :class="calCellTextClass(cell)">{{ cell.dayNumber }}</span>
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 1: HORARIOS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 1" key="s1" class="step-panel">
              <button @click="currentStep = 0" class="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                {{ formatDateLabel(selectedDate) }}
              </button>

              <p class="step-title">Elige un horario</p>

              <div v-if="loadingCalendar" class="py-16 flex items-center justify-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-7 w-7 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
                  <p class="text-sm text-text-muted">Cargando...</p>
                </div>
              </div>

              <div v-else-if="!hasSchedule" class="py-16 text-center">
                <p class="font-semibold text-text mb-1">Sin horario</p>
                <p class="text-sm text-text-muted mb-3">{{ employeeName }} no atiende este día.</p>
                <button @click="currentStep = 0" class="text-primary font-semibold text-sm hover:underline">Elige otro día</button>
              </div>

              <div v-else class="slots-area">
                <p class="slots-count">{{ freeSlots.length }} horario{{ freeSlots.length !== 1 ? 's' : '' }}</p>
                <div class="slots-grid">
                  <button
                    v-for="slot in freeSlots" :key="slot.label"
                    @click="selectTimeSlot(slot)"
                    class="slot-chip"
                    :class="pendingSlot === slot ? 'slot-selected' : ''"
                    :style="pendingSlot === slot ? { background: `${colored('--color-primary')}14`, borderColor: `${colored('--color-primary')}66`, boxShadow: `0 2px 12px ${colored('--color-primary')}1A` } : {}"
                  >
                    <span class="slot-time" :class="pendingSlot === slot ? 'text-primary' : 'text-text'">{{ slot.label }}</span>
                    <span class="slot-free">~{{ formatDuration(slot.availableMs / 60000) }}</span>
                  </button>
                </div>
                <p v-if="freeSlots.length === 0" class="text-sm text-text-muted text-center py-10">No hay horarios libres este día.</p>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 2: SERVICIOS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 2" key="s2" class="step-panel">
              <button @click="currentStep = 1" class="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                {{ formatDateLabel(selectedDate) }} · {{ pendingSlot ? formatSlotTime(pendingSlot) : '' }}
              </button>

              <div class="flex items-center justify-between mb-1">
                <p class="step-title !mb-0">Elige tus servicios</p>
                <span class="text-xs font-medium" :class="durationExceedsAvailable ? 'text-danger' : 'text-text-muted'">
                  <svg class="h-3.5 w-3.5 inline mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {{ formatDuration(availableMinutes) }}
                </span>
              </div>

              <div v-if="(services ?? []).length === 0" class="py-16 text-center">
                <p class="text-sm text-text-muted">No hay servicios disponibles.</p>
              </div>

              <div v-else class="services-list">
                <button
                  v-for="svc in (services ?? [])" :key="svc.id"
                  @click="toggleService(svc)"
                  class="svc-row"
                  :class="isServiceSelected(svc) ? 'svc-selected' : ''"
                  :style="isServiceSelected(svc) ? { borderColor: `${colored('--color-primary')}66`, background: `${colored('--color-primary')}08` } : {}"
                >
                  <div class="svc-check" :class="isServiceSelected(svc) ? 'svc-check-on' : ''">
                    <svg v-if="isServiceSelected(svc)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="svc-name">{{ svc.name }}</p>
                      <p class="svc-dur">{{ svc.duration_minutes }} min</p>
                    </div>
                    <p class="svc-price">${{ svc.price.toFixed(0) }}</p>
                  </div>
                </button>
              </div>

              <div v-if="chosenServices.length > 0" class="svc-footer">
                <span class="text-xs text-text-muted">{{ chosenServices.length }} sel. · {{ formatDuration(totalSelectedDuration) }}</span>
                <span class="text-base font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 3: CONFIRMAR ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 3" key="s3" class="step-panel">
              <button @click="currentStep = 2" class="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Cambiar servicios
              </button>

              <p class="step-title">Confirma tu reserva</p>
              <p class="text-xs sm:text-sm text-text-muted mb-4">Revisa los detalles antes de enviar</p>

              <div class="summary-card">
                <div class="summary-header" :style="{ background: `${colored('--color-primary')}0A` }">
                  <p class="text-xs font-semibold uppercase tracking-wider" :style="{ color: `${colored('--color-primary')}99` }">Detalle de la cita</p>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Servicios</span>
                  <div class="text-right">
                    <p v-for="svc in chosenServices" :key="svc.id" class="text-sm font-semibold text-text">{{ svc.name }} <span class="text-text-muted font-normal text-xs">({{ svc.duration_minutes }} min)</span></p>
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Duración</span>
                  <span class="text-sm font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Día y hora</span>
                  <span class="text-sm font-semibold text-text">{{ formatSlotRange(pendingSlot) }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Profesional</span>
                  <span class="text-sm font-semibold text-text flex items-center gap-1.5">
                    <span class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">{{ getInitials(employeeName) }}</span>
                    {{ employeeName }}
                  </span>
                </div>
                <div class="summary-row" :style="{ background: `${colored('--color-primary')}06` }">
                  <span class="text-sm font-semibold text-text">Total</span>
                  <span class="text-lg font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
                </div>
              </div>

              <div class="mt-4">
                <label class="input-label">¿Cómo te llamas? <span class="text-danger">*</span></label>
                <input
                  v-model="clientName" type="text" placeholder="Escribe tu nombre completo"
                  maxlength="200"
                  @input="nameTouched = true"
                  class="name-input"
                  :class="nameTouched && !nameValid ? '!border-danger/60 focus:!border-danger focus:!ring-danger/10' : ''"
                />
                <p v-if="nameTouched && !nameValid" class="text-xs text-danger mt-1.5 flex items-center gap-1">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                  El nombre es obligatorio.
                </p>
                <p v-else class="text-xs text-text-muted/50 mt-1.5">Solo para identificar tu solicitud.</p>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 4: ÉXITO ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 4" key="s4" class="flex-1 flex items-center justify-center py-10 px-6">
              <div class="text-center max-w-xs">
                <div class="success-circle" :style="{ background: `${colored('--color-primary')}0D` }">
                  <svg class="h-8 w-8 sm:h-10 sm:w-10 success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: colored('--color-primary') }">
                    <path class="check-path" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div class="success-ring-outer" :style="{ borderColor: `${colored('--color-primary')}40` }" />
                </div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-text mt-5 mb-2">¡Reserva enviada!</h2>
                <p class="text-sm text-text-muted mb-1 leading-relaxed">
                  {{ employeeName }} recibirá tu solicitud para
                  <span class="font-semibold text-text">{{ chosenServices.map(s => s.name).join(', ') }}</span>
                  el {{ formatSlotRange(pendingSlot) }}.
                </p>
                <p class="text-sm text-text-muted mb-4">Duración: <span class="font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span></p>
                <p class="text-xs text-text-muted/40">Gracias por tu reserva.</p>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Floating continue button -->
        <button
          v-if="showFloatingButton"
          @click="handleFloatingAction"
          class="float-btn"
          :class="{ 'float-btn-submitting': submitting }"
        >
          <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <span>{{ floatingButtonLabel }}</span>
          <svg v-if="!submitting" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- Footer -->
      <div class="booking-footer" v-if="business && publicBookingEnabled && currentStep !== 4">
        <p class="text-[10px] sm:text-xs text-text-muted/50">{{ business.name || 'Nuestro equipo' }} recibirá tu solicitud.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useThemeStore } from '../../store/theme'
import { getBusinessPublic, getEmployeePublic, listPublicServices, submitBookingRequest, getCalendarData } from '../../services/publicBookingService'
import type { PublicService } from '../../services/publicBookingService'
import logoLight from '../../assets/Luma.svg'
import logoDark from '../../assets/Luma blanco.svg'
import leafBackground from '../../assets/Fondo.jpg'

const route = useRoute()
const themeStore = useThemeStore()
const slug = computed(() => route.params.slug as string)
const presetEmployeeId = ref((route.query.empleado as string) || '')

const logo = computed(() => (themeStore.isDark ? logoDark : logoLight))
const isDarkEffective = computed(() => themeStore.isDark)

function toggleTheme() { themeStore.toggle() }

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const maxCalendarDate = new Date(today.getFullYear(), today.getMonth() + 4, 0)
const maxCalendarDateStr = maxCalendarDate.toISOString().slice(0, 10)

const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(todayStr)

const canGoPrevMonth = computed(() => {
  const cm = calendarMonth.value
  return cm.getFullYear() > today.getFullYear() || (cm.getFullYear() === today.getFullYear() && cm.getMonth() > today.getMonth())
})
const canGoNextMonth = computed(() => {
  const cm = calendarMonth.value
  return cm.getFullYear() < maxCalendarDate.getFullYear() || (cm.getFullYear() === maxCalendarDate.getFullYear() && cm.getMonth() < maxCalendarDate.getMonth())
})
const calendarMonthLabel = computed(() => calendarMonth.value.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }))
const dayOfWeekHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalendarCell { dateStr: string; dayNumber: number; isToday: boolean; isSelected: boolean; isOtherMonth: boolean; selectable: boolean }

const calendarCells = computed<CalendarCell[]>(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let startDow = firstDay.getDay(); if (startDow === 0) startDow = 7

  const cells: CalendarCell[] = []
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i > 0; i--) {
    const d = prevMonthLastDay - i + 1
    const dateStr = `${year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateStr, dayNumber: d, isToday: false, isSelected: false, isOtherMonth: true, selectable: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateStr, dayNumber: d, isToday: dateStr === todayStr, isSelected: dateStr === selectedDate.value, isOtherMonth: false, selectable: dateStr >= todayStr && dateStr <= maxCalendarDateStr })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) cells.push({ dateStr: '', dayNumber: d, isToday: false, isSelected: false, isOtherMonth: true, selectable: false })
  }
  return cells
})

function calCellClass(c: CalendarCell) {
  if (c.isSelected) return 'cal-cell-sel'
  if (c.isToday) return 'cal-cell-today'
  if (!c.selectable) return 'cal-cell-ghost'
  return ''
}
function calCellStyle(c: CalendarCell) {
  if (c.isSelected) return { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 14px ${colored('--color-primary')}44` }
  if (c.isToday) return { boxShadow: `inset 0 0 0 2px ${colored('--color-primary')}` }
  return {}
}
function calCellTextClass(c: CalendarCell) {
  if (c.isSelected) return 'text-white'
  if (!c.selectable) return 'text-text-muted/20'
  if (c.isToday) return 'text-primary'
  return 'text-text'
}

function prevMonth() { if (canGoPrevMonth.value) calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1) }
function nextMonth() { if (canGoNextMonth.value) calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1) }

const currentStep = ref(0)
const steps = [{ label: 'Día' }, { label: 'Horario' }, { label: 'Servicios' }, { label: 'Confirmar' }, { label: 'Listo' }]

function goToStep(step: number) { if (step <= maxReachableStep.value) currentStep.value = step }

const maxReachableStep = computed(() => {
  if (currentStep.value === 4) return 4
  if (chosenServices.value.length > 0 && pendingSlot.value && clientName.value.trim()) return 3
  if (chosenServices.value.length > 0 && pendingSlot.value) return 2
  if (pendingSlot.value) return 1
  return 0
})

function stepDotClass(i: number) {
  if (currentStep.value === i) return 'dot-active'
  if (i < currentStep) return 'dot-done'
  return ''
}
function stepDotStyle(i: number) {
  if (currentStep.value === i) return { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 14px ${colored('--color-primary')}44` }
  if (i < currentStep) return { background: `${colored('--color-primary')}99` }
  return {}
}

const showFloatingButton = computed(() => {
  if (currentStep.value === 4) return false
  if (currentStep.value === 0) return selectedDate.value !== todayStr
  if (currentStep.value === 1) return !!pendingSlot.value
  if (currentStep.value === 2) return canConfirm.value
  if (currentStep.value === 3) return canSubmit.value
  return false
})

const floatingButtonLabel = computed(() => {
  if (currentStep.value === 0 || currentStep.value === 1) return 'Continuar'
  if (currentStep.value === 2) return 'Confirmar servicios'
  if (currentStep.value === 3) return submitting.value ? 'Reservando...' : 'Confirmar reserva'
  return 'Continuar'
})

function handleFloatingAction() {
  if (currentStep.value === 3) { submitRequest() } else { goToStep(currentStep.value + 1) }
}

/* ---------- API ---------- */
const startHour = 7; const endHour = 21
const slotHeight = ref(52)
function updateSlotHeight() { slotHeight.value = window.innerWidth >= 768 ? 40 : 54 }
onMounted(() => { updateSlotHeight(); window.addEventListener('resize', updateSlotHeight) })
onUnmounted(() => window.removeEventListener('resize', updateSlotHeight))

const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({
  queryKey: computed(() => ['public-business', slug.value] as const),
  queryFn: () => getBusinessPublic(slug.value),
  staleTime: 5 * 60 * 1000,
})

const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')
const cssVars = computed(() => ({ '--color-primary': primaryColor.value }))
function colored(_t: string) { return primaryColor.value }
function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const publicBookingEnabled = computed(() => {
  const f = business.value?.features; if (!f || typeof f !== 'object') return true; return f.enable_public_booking !== false
})

const { data: employeeData } = useQuery({
  queryKey: computed(() => ['public-employee', slug.value, presetEmployeeId.value] as const),
  queryFn: () => getEmployeePublic(slug.value, presetEmployeeId.value),
  enabled: computed(() => !!presetEmployeeId.value && !!business.value),
  staleTime: 5 * 60 * 1000,
})
const employeeName = computed(() => employeeData.value?.full_name || '')

const { data: services } = useQuery({
  queryKey: computed(() => ['public-services', slug.value] as const),
  queryFn: () => listPublicServices(slug.value),
  enabled: computed(() => !!business.value),
  staleTime: 5 * 60 * 1000,
})

const dateRange = computed(() => ({ from: `${selectedDate.value}T00:00:00`, to: `${selectedDate.value}T23:59:59` }))
const { data: calendarData, isLoading: loadingCalendar } = useQuery({
  queryKey: computed(() => ['public-calendar', slug.value, presetEmployeeId.value, selectedDate.value] as const),
  queryFn: () => getCalendarData(slug.value, presetEmployeeId.value, dateRange.value.from, dateRange.value.to),
  enabled: computed(() => !!presetEmployeeId.value && !!business.value && currentStep.value >= 1),
  staleTime: 0,
})

const schedules = computed(() => calendarData.value?.schedules ?? [])
const occupied = computed(() => calendarData.value?.occupied ?? [])
const absences = computed(() => calendarData.value?.absences ?? [])
const selectedDayOfWeek = computed(() => new Date(selectedDate.value + 'T12:00:00').getDay())
const hasSchedule = computed(() => (schedules.value as any[]).some((s: any) => s.weekday == selectedDayOfWeek.value))

function topForTime(isoStr: string): number {
  const d = new Date(isoStr); const mins = d.getHours() * 60 + d.getMinutes() - startHour * 60
  return Math.max(0, (mins / 60) * slotHeight.value)
}
function heightForRange(s: string, e: string): number { return Math.max(topForTime(e) - topForTime(s), 12) }

interface FreeSlot { date: string; start: string; end: string; top: number; height: number; label: string; gapEndMs: number; availableMs: number }

const freeSlots = computed<FreeSlot[]>(() => {
  const date = selectedDate.value
  const daySchedule = (schedules.value as any[]).filter((s: any) => s.weekday == selectedDayOfWeek.value)
  if (!daySchedule.length) return []
  const allOccupied = [
    ...occupied.value.map((o: any) => ({ start: new Date(o.start).getTime(), end: new Date(o.end).getTime() })),
    ...absences.value.map((a: any) => ({ start: new Date(a.start).getTime(), end: new Date(a.end).getTime() })),
  ].sort((a, b) => a.start - b.start)
  const results: FreeSlot[] = []
  for (const sch of daySchedule) {
    const [sh, sm] = (sch.start_time as string).split(':').map(Number)
    const [eh, em] = (sch.end_time as string).split(':').map(Number)
    const schedStart = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`).getTime()
    const schedEnd = new Date(`${date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`).getTime()
    let cursor = schedStart; const STEP = 30 * 60 * 1000
    while (cursor < schedEnd) {
      const slotEnd = cursor + STEP; if (slotEnd > schedEnd) break
      if (!allOccupied.some(o => cursor < o.end && slotEnd > o.start)) {
        let gapEnd = slotEnd
        while (gapEnd + STEP <= schedEnd && !allOccupied.some(o => gapEnd < o.end && gapEnd + STEP > o.start)) gapEnd += STEP
        for (const o of allOccupied) { if (o.start > cursor && o.start < gapEnd) gapEnd = Math.floor(o.start / STEP) * STEP }
        const sd = new Date(cursor); const h12 = sd.getHours() % 12 || 12; const mm = sd.getMinutes(); const ampm = sd.getHours() >= 12 ? 'PM' : 'AM'
        results.push({ date, start: new Date(cursor).toISOString(), end: new Date(slotEnd).toISOString(), top: topForTime(new Date(cursor).toISOString()), height: heightForRange(new Date(cursor).toISOString(), new Date(slotEnd).toISOString()), label: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`, gapEndMs: gapEnd, availableMs: gapEnd - cursor })
      }
      cursor += STEP
    }
  }
  return results
})

const pendingSlot = ref<FreeSlot | null>(null)
const chosenServices = ref<PublicService[]>([])
const submitting = ref(false)
const clientName = ref('')
const nameTouched = ref(false)

const availableMinutes = computed(() => pendingSlot.value ? Math.floor(pendingSlot.value.availableMs / 60000) : 0)
const totalSelectedDuration = computed(() => chosenServices.value.reduce((s, sv) => s + sv.duration_minutes, 0))
const totalSelectedPrice = computed(() => chosenServices.value.reduce((s, sv) => s + sv.price, 0))
const durationExceedsAvailable = computed(() => chosenServices.value.length > 0 && totalSelectedDuration.value > availableMinutes.value)
const canConfirm = computed(() => chosenServices.value.length > 0 && !durationExceedsAvailable.value)
const nameValid = computed(() => clientName.value.trim().length > 0)
const canSubmit = computed(() => nameValid.value)

function selectDay(dateStr: string) { selectedDate.value = dateStr; pendingSlot.value = null; chosenServices.value = []; currentStep.value = 1 }
function selectTimeSlot(slot: FreeSlot) {
  pendingSlot.value = slot
  if (totalSelectedDuration.value > Math.floor(slot.availableMs / 60000)) chosenServices.value = []
}
function isServiceSelected(svc: PublicService) { return chosenServices.value.some(s => s.id === svc.id) }
function toggleService(svc: PublicService) {
  if (isServiceSelected(svc)) { chosenServices.value = chosenServices.value.filter(s => s.id !== svc.id) }
  else {
    const total = [...chosenServices.value, svc].reduce((s, sv) => s + sv.duration_minutes, 0)
    if (total <= availableMinutes.value) chosenServices.value = [...chosenServices.value, svc]
  }
}

function formatSlotTime(slot: FreeSlot | null) { if (!slot) return ''; return new Date(slot.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) }
function formatSlotRange(slot: FreeSlot | null) { if (!slot) return ''; const s = new Date(slot.start); return `${s.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} · ${s.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}` }
function formatDuration(minutes: number) { if (minutes < 60) return `${Math.floor(minutes)} min`; const h = Math.floor(minutes / 60); const m = Math.floor(minutes % 60); return m > 0 ? `${h}h ${m}min` : `${h}h` }
function formatDateLabel(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' }) }
function getInitials(name: string) { return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') }

async function submitRequest() {
  if (chosenServices.value.length === 0 || !pendingSlot.value || !presetEmployeeId.value) return
  if (!nameValid.value) { nameTouched.value = true; return }
  submitting.value = true
  try {
    await submitBookingRequest(slug.value, { employee_id: presetEmployeeId.value, service_ids: chosenServices.value.map(s => s.id), start_time: pendingSlot.value.start, client_name: clientName.value.trim() })
    currentStep.value = 4
  } catch { alert('Este horario ya no está disponible. Por favor elige otro.'); currentStep.value = 0 }
  finally { submitting.value = false }
}
</script>

<style scoped>
/* ========== ROOT ========== */
.booking-root {
  position: relative;
  display: flex;
  min-height: 100dvh;
  width: 100%;
  align-items: center;
  overflow: hidden;
  background-color: var(--color-bg-secondary);
}

/* ========== BACKGROUND IMAGE ========== */
.booking-image {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--booking-image);
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.4) 26%, transparent 38%, transparent 62%, rgba(0,0,0,0.4) 74%, rgba(0,0,0,0.95) 90%, #000 100%);
  mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.4) 26%, transparent 38%, transparent 62%, rgba(0,0,0,0.4) 74%, rgba(0,0,0,0.95) 90%, #000 100%);
}
@media (max-width: 1023px) {
  .booking-image {
    -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.65) 55%, #000 100%);
    mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.65) 55%, #000 100%);
    opacity: 0.75;
  }
}
@media (max-width: 639px) {
  .booking-image { opacity: 0.55; }
}
:global(.dark) .booking-image {
  filter: brightness(0.55) saturate(0.85);
}

/* ========== CONTENT ========== */
.booking-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100dvh;
  overflow-y: auto;
  padding: calc(1.25rem + env(safe-area-inset-top, 0px)) 1rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 640px) {
  .booking-content { padding: 2rem; }
}
@media (min-width: 1024px) {
  .booking-content {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 2rem 3rem;
    max-height: none;
    min-height: 100dvh;
    justify-content: flex-start;
  }
}
@media (min-width: 1280px) {
  .booking-content { max-width: 1000px; }
}
@media (min-width: 1536px) {
  .booking-content { max-width: 1100px; }
}

/* ========== HEADER ========== */
.booking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
}
.theme-btn {
  display: flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.theme-btn:active { transform: scale(0.92); }
@media (hover: hover) {
  .theme-btn:hover { color: var(--color-text); border-color: var(--color-border-strong); }
}

/* ========== EMPLOYEE ========== */
.booking-employee {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 1rem;
  flex-shrink: 0;
}
.avatar-circle {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

/* ========== STEPS BAR ========== */
.steps-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
}
.step-dot {
  display: flex;
  height: 1.625rem;
  width: 1.625rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  transition: all 0.3s;
}
.dot-active { color: #fff; transform: scale(1.1); }
.dot-done { color: #fff; background: var(--color-primary); opacity: 0.6; }
.step-dot:not(.dot-active):not(.dot-done) { color: var(--color-text-muted); background: var(--color-surface-muted); }
.step-label {
  font-size: 0.625rem;
  font-weight: 600;
  transition: color 0.3s;
}
@media (min-width: 400px) { .step-label { font-size: 0.6875rem; } }
@media (min-width: 640px) { .step-dot { height: 1.75rem; width: 1.75rem; font-size: 0.6875rem; } .step-label { font-size: 0.75rem; } }
.step-line { width: 1rem; height: 1px; margin: 0 0.125rem; transition: background-color 0.5s; }
@media (min-width: 640px) { .step-line { width: 1.5rem; margin: 0 0.25rem; } }

/* ========== BOOKING CARD ========== */
.booking-card-outer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  margin-top: 0.5rem;
}
.booking-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 1rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  position: relative;
}
@media (min-width: 640px) {
  .booking-card { border-radius: 1.25rem; }
}
@media (min-width: 1024px) {
  .booking-card-outer { margin-top: 1rem; }
  .booking-card {
    min-height: 520px;
    flex: none;
    border-radius: 1.5rem;
    box-shadow: var(--shadow-lg);
  }
}

/* ========== STEP PANELS ========== */
.step-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 0.875rem 0.5rem;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 640px) {
  .step-panel { padding: 1rem; }
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  text-align: center;
}
@media (min-width: 640px) {
  .step-title { font-size: 1.125rem; margin-bottom: 1rem; }
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  padding: 0.25rem 0;
  margin-bottom: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.2s;
  min-height: 2.25rem;
}
.back-link svg { width: 0.875rem; height: 0.875rem; }
.back-link:hover { color: var(--color-text); }
@media (min-width: 640px) { .back-link { font-size: 0.8125rem; } }

/* ========== CALENDAR ========== */
.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}
.cal-arrow {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.cal-arrow svg { width: 1rem; height: 1rem; }
.cal-arrow:active { transform: scale(0.92); }
@media (hover: hover) {
  .cal-arrow:hover:not(:disabled) { color: var(--color-text); border-color: var(--color-border-strong); }
}
.cal-month { font-size: 0.9375rem; font-weight: 700; color: var(--color-text); text-transform: capitalize; }
@media (min-width: 640px) { .cal-month { font-size: 1rem; } }

.cal-dow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}
.cal-dow span {
  text-align: center;
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-text-muted);
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0;
}
@media (min-width: 640px) { .cal-dow span { font-size: 0.6875rem; } }

.cal-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8125rem;
  font-weight: 600;
  aspect-ratio: 1;
  min-height: 0;
}
.cal-cell:active { transform: scale(0.92); }
.cal-cell-sel { color: #fff; z-index: 5; transform: scale(1.05); }
.cal-cell-today { font-weight: 800; }
.cal-cell-ghost { cursor: default; opacity: 0.25; pointer-events: none; }
.cal-cell:not(.cal-cell-sel):not(.cal-cell-ghost):hover { background: var(--color-surface-muted); }
@media (min-width: 640px) { .cal-cell { font-size: 0.875rem; border-radius: 0.75rem; } }

/* ========== SLOTS ========== */
.slots-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.slots-count { font-size: 0.6875rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
@media (min-width: 640px) { .slots-count { font-size: 0.75rem; } }

.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  align-content: start;
}
@media (min-width: 400px) { .slots-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 640px) { .slots-grid { grid-template-columns: repeat(3, 1fr); gap: 0.625rem; } }

.slot-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-height: 4rem;
}
.slot-chip:active { transform: scale(0.95); }
.slot-chip:hover:not(.slot-selected) { border-color: var(--color-primary); opacity: 0.6; background: var(--color-surface-muted); }
.slot-time { font-size: 0.9375rem; font-weight: 700; }
.slot-free { font-size: 0.625rem; color: var(--color-text-muted); margin-top: 0.125rem; }
@media (min-width: 640px) { .slot-chip { padding: 0.875rem 0.625rem; min-height: 4.5rem; } .slot-time { font-size: 1rem; } .slot-free { font-size: 0.6875rem; } }

/* ========== SERVICES ========== */
.services-list { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 0.375rem; }
.svc-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  min-height: 3.25rem;
}
.svc-row:active { transform: scale(0.98); }
.svc-row:hover:not(.svc-selected) { border-color: var(--color-primary); opacity: 0.5; background: var(--color-surface-muted); }
.svc-check {
  flex-shrink: 0;
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 0.375rem;
  border: 2px solid var(--color-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.svc-check svg { width: 0.75rem; height: 0.75rem; color: #fff; }
.svc-check-on { border-color: var(--color-primary); background: var(--color-primary); }
.svc-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-text); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svc-dur { font-size: 0.625rem; color: var(--color-text-muted); }
.svc-price { font-size: 0.9375rem; font-weight: 800; color: var(--color-text); flex-shrink: 0; }
.svc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.25rem 0;
  border-top: 1px solid var(--color-border-subtle);
  margin-top: 0.375rem;
  flex-shrink: 0;
}
@media (min-width: 640px) {
  .svc-row { padding: 0.875rem; border-radius: 0.875rem; min-height: 3.5rem; }
  .svc-check { height: 1.375rem; width: 1.375rem; }
  .svc-check svg { width: 0.8125rem; height: 0.8125rem; }
  .svc-name { font-size: 0.875rem; }
  .svc-dur { font-size: 0.6875rem; }
}

/* ========== CONFIRMATION ========== */
.summary-card { border-radius: 0.875rem; border: 1px solid var(--color-border); overflow: hidden; background: var(--color-surface-muted); opacity: 0.55; }
.summary-header { padding: 0.625rem 1rem; border-bottom: 1px solid var(--color-border-subtle); }
.summary-row { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 1rem; border-bottom: 1px solid var(--color-border-subtle); }
.summary-row:last-child { border-bottom: none; }
.summary-label { font-size: 0.75rem; color: var(--color-text-muted); }
@media (min-width: 640px) { .summary-card { border-radius: 1rem; } .summary-header { padding: 0.75rem 1.25rem; } .summary-row { padding: 0.75rem 1.25rem; } }

.input-label { display: block; font-size: 0.6875rem; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; }
@media (min-width: 640px) { .input-label { font-size: 0.75rem; } }

.name-input {
  width: 100%;
  border-radius: 0.875rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 85%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.name-input::placeholder { color: var(--color-text-muted); opacity: 0.5; }
.name-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, transparent); }
@media (min-width: 640px) { .name-input { border-radius: 1rem; padding: 0.875rem 1rem; } }

/* ========== FLOATING BUTTON ========== */
.float-btn {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 9999px;
  background: var(--color-text);
  color: var(--color-text-inverse);
  padding: 0.875rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(0,0,0,0.18);
  transition: all 0.2s;
  animation: float-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.float-btn:active { transform: scale(0.97); opacity: 0.85; }
@media (hover: hover) { .float-btn:hover { opacity: 0.9; } }
.float-btn-submitting { opacity: 0.7; pointer-events: none; }
@media (min-width: 640px) {
  .float-btn {
    left: auto;
    padding: 0.75rem 1.25rem;
    font-size: 0.8125rem;
  }
}

@keyframes float-in {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ========== SUCCESS ========== */
.success-circle {
  margin: 0 auto;
  display: flex;
  height: 5rem;
  width: 5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  position: relative;
}
.success-ring-outer {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid;
  animation: ring-pulse 1.5s ease-out 0.7s forwards;
  opacity: 0;
}
.success-check .check-path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: draw-check 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards; }
@keyframes draw-check { to { stroke-dashoffset: 0; } }
@keyframes ring-pulse {
  0% { opacity: 0; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 0; transform: scale(1.4); }
}

/* ========== FOOTER ========== */
.booking-footer {
  border-top: 1px solid var(--color-border-subtle);
  padding-top: 0.75rem;
  margin-top: auto;
  flex-shrink: 0;
}

/* ========== TRANSITIONS ========== */
.step-slide-enter-active { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.step-slide-leave-active { transition: all 0.15s cubic-bezier(0.4, 0, 1, 1); position: absolute; }
.step-slide-enter-from { opacity: 0; transform: translateX(12px); }
.step-slide-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
