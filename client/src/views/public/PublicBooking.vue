<template>
  <div class="booking-root" :style="cssVars">
    <div class="booking-page">
      <!-- Header -->
      <div class="header">
        <div class="flex items-center gap-3 min-w-0">
          <img :src="logo" alt="Luma" class="h-7 sm:h-8 w-auto object-contain" />
          <span v-if="business?.name" class="text-[11px] sm:text-xs font-semibold text-text-muted truncate">{{ business.name }}</span>
        </div>
        <button @click="toggleTheme" class="h-9 w-9 flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text active:scale-90 transition-all bg-transparent">
          <svg v-if="!isDarkEffective" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>
        </button>
      </div>

      <!-- Employee -->
      <div v-if="employeeName" class="emp-line">
        <div class="emp-avatar" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})` }">{{ getInitials(employeeName) }}</div>
        <span class="text-sm font-semibold text-text truncate">Agenda con {{ employeeName }}</span>
      </div>

      <!-- Steps -->
      <nav class="steps-nav" aria-label="Progreso">
        <template v-for="(_, i) in steps" :key="i">
          <button @click="goToStep(i)" :disabled="i > maxReachableStep" class="step-btn" :class="i > maxReachableStep ? 'pointer-events-none opacity-25' : ''">
            <span class="step-num" :style="i === currentStep ? { background: `${colored('--color-primary')}`, color: '#fff' } : i < currentStep ? { background: `${colored('--color-primary')}88`, color: '#fff' } : {}">
              <template v-if="i < currentStep">&#10003;</template>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="step-txt" :style="i === currentStep ? { color: colored('--color-primary'), fontWeight: 700 } : {}">{{ steps[i].label }}</span>
          </button>
          <span v-if="i < 4" class="step-divider" :style="i < currentStep ? { background: `${colored('--color-primary')}44` } : {}" />
        </template>
      </nav>

      <!-- Loading / Errors -->
      <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center"><div class="spinner" /></div>
      <div v-else-if="businessError" class="flex-1 flex items-center justify-center text-center px-4"><p class="text-sm text-text-muted">Negocio no encontrado.</p></div>
      <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center text-center px-4"><p class="text-sm text-text-muted">Reservas no disponibles.</p></div>

      <!-- Content -->
      <div v-else class="content-area">
        <Transition name="fade" mode="out-in">
          <!-- 0: CALENDARIO -->
          <div v-if="currentStep === 0" key="s0" class="step-view">
            <div class="cal-head">
              <button @click="prevMonth" :disabled="!canGoPrevMonth" class="cal-nav-btn" :style="!canGoPrevMonth ? { opacity: 0.15 } : {}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
              <span class="cal-month-title">{{ calendarMonthLabel }}</span>
              <button @click="nextMonth" :disabled="!canGoNextMonth" class="cal-nav-btn" :style="!canGoNextMonth ? { opacity: 0.15 } : {}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
            </div>
            <div class="cal-dow"><span v-for="d in dayOfWeekHeaders" :key="d">{{ d }}</span></div>
            <div class="cal-grid">
              <button v-for="(c, ci) in calendarCells" :key="ci" @click="c.selectable && selectDay(c.dateStr)" :disabled="!c.selectable" class="cal-day"
                :style="c.isSelected ? { background: colored('--color-primary'), color: '#fff', boxShadow: `0 3px 12px ${colored('--color-primary')}55` } : c.isToday ? { boxShadow: `inset 0 0 0 2px ${colored('--color-primary')}` } : !c.selectable ? { opacity: 0.15, pointerEvents: 'none' } : {}"
              >{{ c.dayNumber }}</button>
            </div>
            <p v-if="selectedDate !== todayStr" class="text-center text-[11px] text-text-muted">{{ formatDateLabel(selectedDate) }}</p>
          </div>

          <!-- 1: HORARIOS -->
          <div v-else-if="currentStep === 1" key="s1" class="step-view">
            <button @click="goToStep(0)" class="back-link">&larr; {{ formatDateLabel(selectedDate) }}</button>
            <p class="step-label-text">{{ freeSlots.length }} horario{{ freeSlots.length !== 1 ? 's' : '' }} disponible{{ freeSlots.length !== 1 ? 's' : '' }}</p>
            <div v-if="loadingCalendar" class="flex-1 flex items-center justify-center"><div class="spinner" /></div>
            <div v-else-if="!hasSchedule" class="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <p class="font-semibold text-text">Sin horario</p>
              <p class="text-xs text-text-muted">{{ employeeName }} no atiende.</p>
              <button @click="goToStep(0)" class="text-xs text-primary font-semibold">Elegir otro día</button>
            </div>
            <div v-else class="slots-wrap">
              <button v-for="s in freeSlots" :key="s.label" @click="selectTimeSlot(s)" class="slot"
                :style="pendingSlot === s ? { borderColor: colored('--color-primary'), background: `${colored('--color-primary')}12` } : {}"
              >{{ s.label }}</button>
            </div>
          </div>

          <!-- 2: SERVICIOS -->
          <div v-else-if="currentStep === 2" key="s2" class="step-view">
            <div class="svc-top">
              <button @click="goToStep(1)" class="back-link">&larr; {{ formatDateLabel(selectedDate) }} · {{ pendingSlot ? formatSlotTime(pendingSlot) : '' }}</button>
              <span class="text-[10px] sm:text-xs text-text-muted font-medium">{{ formatDuration(availableMinutes) }} disp.</span>
            </div>
            <div v-if="(services ?? []).length === 0" class="flex-1 flex items-center justify-center"><p class="text-xs text-text-muted">Sin servicios.</p></div>
            <div v-else class="svc-list">
              <button v-for="svc in (services ?? [])" :key="svc.id" @click="toggleService(svc)" class="svc-item"
                :style="isServiceSelected(svc) ? { borderColor: colored('--color-primary'), background: `${colored('--color-primary')}09` } : {}"
              >
                <span class="svc-checkbox" :style="isServiceSelected(svc) ? { background: colored('--color-primary'), borderColor: colored('--color-primary') } : {}">
                  <svg v-if="isServiceSelected(svc)" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </span>
                <span class="svc-info">
                  <span class="svc-name">{{ svc.name }}</span>
                  <span class="svc-meta">{{ svc.duration_minutes }} min</span>
                </span>
                <span class="svc-price">${{ svc.price.toFixed(0) }}</span>
              </button>
            </div>
            <div v-if="chosenServices.length > 0" class="svc-footer-bar">
              <span class="text-[11px] text-text-muted">{{ chosenServices.length }} · {{ formatDuration(totalSelectedDuration) }}</span>
              <span class="text-sm font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
            </div>
            <button @click="advanceStep" :disabled="!canConfirm" class="cta-btn" :style="{ background: colored('--color-primary'), opacity: canConfirm ? 1 : 0.35 }">
            {{ chosenServices.length ? `Confirmar ${chosenServices.length} servicio${chosenServices.length !== 1 ? 's' : ''}` : 'Selecciona al menos un servicio' }}
          </button>
          </div>

          <!-- 3: CONFIRMAR -->
          <div v-else-if="currentStep === 3" key="s3" class="step-view">
            <button @click="goToStep(2)" class="back-link">&larr; Cambiar servicios</button>
            <p class="text-sm sm:text-base font-bold text-text">Confirma tu reserva</p>
            <div class="summary">
              <div class="sum-row"><span class="sum-lbl">Servicios</span><span class="sum-val">{{ chosenServices.map(s => s.name).join(', ') }}</span></div>
              <div class="sum-row"><span class="sum-lbl">Duración</span><span class="sum-val">{{ formatDuration(totalSelectedDuration) }}</span></div>
              <div class="sum-row"><span class="sum-lbl">Día y hora</span><span class="sum-val">{{ formatSlotRange(pendingSlot) }}</span></div>
              <div class="sum-row"><span class="sum-lbl">Profesional</span><span class="sum-val flex items-center gap-1"><span class="inline-flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white" :style="{ background: colored('--color-primary') }">{{ getInitials(employeeName) }}</span>{{ employeeName }}</span></div>
              <div class="sum-row !border-b-0" :style="{ background: `${colored('--color-primary')}08` }"><span class="text-xs font-bold text-text">Total</span><span class="text-base font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span></div>
            </div>
            <input v-model="clientName" type="text" placeholder="Escribe tu nombre completo *" maxlength="200" @input="nameTouched = true"
              class="name-inp" :style="nameTouched && !nameValid ? { borderColor: 'var(--color-danger)' } : {}" />
            <p v-if="nameTouched && !nameValid" class="text-[11px] text-danger mt-1">El nombre es obligatorio.</p>
          <p v-if="submitError" class="text-[11px] text-danger mt-1 flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {{ submitError }}</p>
            <button @click="submitRequest" :disabled="submitting || !canSubmit" class="cta-btn" :style="{ background: colored('--color-primary'), opacity: (submitting || !canSubmit) ? 0.4 : 1 }">
              <span v-if="submitting" class="spinner-sm" /> {{ submitting ? 'Reservando...' : 'Confirmar reserva' }}
            </button>
          </div>

          <!-- 4: SUCCESS -->
          <div v-else-if="currentStep === 4" key="s4" class="step-view items-center justify-center text-center">
            <div class="success-circle" :style="{ background: `${colored('--color-primary')}15` }">
              <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: colored('--color-primary') }"><path d="M5 13l4 4L19 7" class="success-path"/></svg>
            </div>
            <h2 class="text-lg sm:text-xl font-extrabold text-text mt-4 mb-2">¡Reserva enviada!</h2>
            <p class="text-sm text-text-muted">{{ employeeName }} recibirá tu solicitud para <b class="text-text">{{ chosenServices.map(s => s.name).join(', ') }}</b> el {{ formatSlotRange(pendingSlot) }}.</p>
            <p class="text-xs text-text-muted mt-3 opacity-50">Gracias por tu reserva.</p>
          </div>
        </Transition>
      </div>

      <!-- Footer -->
      <div v-if="business && publicBookingEnabled && currentStep !== 4" class="footer">
        <p class="text-[10px] text-text-muted/40">{{ business.name }} recibirá tu solicitud.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useThemeStore } from '../../store/theme'
import { getBusinessPublic, getEmployeePublic, listPublicServices, submitBookingRequest, getCalendarData } from '../../services/publicBookingService'
import type { PublicService } from '../../services/publicBookingService'
import logoLight from '../../assets/Luma.svg'
import logoDark from '../../assets/Luma blanco.svg'

const route = useRoute()
const themeStore = useThemeStore()
const slug = computed(() => route.params.slug as string)
const presetEmployeeId = ref((route.query.empleado as string) || '')
const logo = computed(() => themeStore.isDark ? logoDark : logoLight)
const isDarkEffective = computed(() => themeStore.isDark)
function toggleTheme() { themeStore.toggle() }

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const maxCal = new Date(today.getFullYear(), today.getMonth() + 4, 0)
const maxCalStr = maxCal.toISOString().slice(0, 10)

const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(todayStr)
const steps = ['Día', 'Horario', 'Servicios', 'Confirmar', 'Listo']

const canGoPrevMonth = computed(() => calendarMonth.value > new Date(today.getFullYear(), today.getMonth(), 1))
const canGoNextMonth = computed(() => {
  const cm = calendarMonth.value; return cm.getFullYear() < maxCal.getFullYear() || (cm.getFullYear() === maxCal.getFullYear() && cm.getMonth() < maxCal.getMonth())
})
const calendarMonthLabel = computed(() => calendarMonth.value.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }))
const dayOfWeekHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalCell { dateStr: string; dayNumber: number; isToday: boolean; isSelected: boolean; selectable: boolean }
const calendarCells = computed<CalCell[]>(() => {
  const y = calendarMonth.value.getFullYear(), m = calendarMonth.value.getMonth()
  const first = new Date(y, m, 1); let sd = first.getDay(); if (sd === 0) sd = 7
  const dim = new Date(y, m + 1, 0).getDate()
  const prevEnd = new Date(y, m, 0).getDate()
  const cells: CalCell[] = []
  for (let i = sd - 1; i > 0; i--) { const d = prevEnd - i + 1; cells.push({ dateStr: '', dayNumber: d, isToday: false, isSelected: false, selectable: false }) }
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateStr: ds, dayNumber: d, isToday: ds === todayStr, isSelected: ds === selectedDate.value, selectable: ds >= todayStr && ds <= maxCalStr })
  }
  const rem = 7 - (cells.length % 7); if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ dateStr: '', dayNumber: d, isToday: false, isSelected: false, selectable: false })
  return cells
})
function prevMonth() { if (canGoPrevMonth.value) calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1) }
function nextMonth() { if (canGoNextMonth.value) calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1) }

const currentStep = ref(0)
const maxReachedStep = ref(0)
function goToStep(s: number) { if (s <= maxReachedStep.value) currentStep.value = s }
function advanceStep() { currentStep.value++; maxReachedStep.value = Math.max(maxReachedStep.value, currentStep.value) }
const maxReachableStep = computed(() => maxReachedStep.value)

const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({ queryKey: computed(() => ['pb-biz', slug.value] as const), queryFn: () => getBusinessPublic(slug.value), staleTime: 5 * 60 * 1000 })
const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')
const cssVars = computed(() => ({ '--color-primary': primaryColor.value }))
function colored(_t: string) { return primaryColor.value }
function adjustHex(h: string, a: number): string { const n = parseInt(h.replace('#', ''), 16); const r = Math.min(255, Math.max(0, ((n>>16)&0xFF)+a)); const g = Math.min(255, Math.max(0, ((n>>8)&0xFF)+a)); const b = Math.min(255, Math.max(0, (n&0xFF)+a)); return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}` }
const publicBookingEnabled = computed(() => { const f = business.value?.features; return !f || typeof f !== 'object' || f.enable_public_booking !== false })

const { data: employeeData } = useQuery({ queryKey: computed(() => ['pb-emp', slug.value, presetEmployeeId.value] as const), queryFn: () => getEmployeePublic(slug.value, presetEmployeeId.value), enabled: computed(() => !!presetEmployeeId.value && !!business.value), staleTime: 5 * 60 * 1000 })
const employeeName = computed(() => employeeData.value?.full_name || '')

const { data: services } = useQuery({ queryKey: computed(() => ['pb-svcs', slug.value] as const), queryFn: () => listPublicServices(slug.value), enabled: computed(() => !!business.value), staleTime: 5 * 60 * 1000 })

const dr = computed(() => ({ from: `${selectedDate.value}T00:00:00`, to: `${selectedDate.value}T23:59:59` }))
const { data: calendarData, isLoading: loadingCalendar } = useQuery({ queryKey: computed(() => ['pb-cal', slug.value, presetEmployeeId.value, selectedDate.value] as const), queryFn: () => getCalendarData(slug.value, presetEmployeeId.value, dr.value.from, dr.value.to), enabled: computed(() => !!presetEmployeeId.value && !!business.value && currentStep.value >= 1), staleTime: 0 })

const schedules = computed(() => (calendarData.value?.schedules ?? []) as any[])
const occupied = computed(() => (calendarData.value?.occupied ?? []) as any[])
const absences = computed(() => (calendarData.value?.absences ?? []) as any[])
const selDow = computed(() => new Date(selectedDate.value + 'T12:00:00').getDay())
const hasSchedule = computed(() => schedules.value.some((s: any) => s.weekday == selDow.value))

interface FreeSlot { start: string; label: string; availableMs: number }
const freeSlots = computed<FreeSlot[]>(() => {
  const date = selectedDate.value
  const ds = schedules.value.filter((s: any) => s.weekday == selDow.value)
  if (!ds.length) return []
  const occ = [...occupied.value.map((o: any) => ({ s: new Date(o.start).getTime(), e: new Date(o.end).getTime() })), ...absences.value.map((a: any) => ({ s: new Date(a.start).getTime(), e: new Date(a.end).getTime() }))].sort((a, b) => a.s - b.s)
  const R: FreeSlot[] = []
  for (const sch of ds) {
    const [sh, sm] = (sch.start_time as string).split(':').map(Number); const [eh, em] = (sch.end_time as string).split(':').map(Number)
    const ss = new Date(`${date}T${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}:00`).getTime()
    const se = new Date(`${date}T${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:00`).getTime()
    let cur = ss; const ST = 30*60*1000
    while (cur < se) {
      const slotEnd = cur + ST; if (slotEnd > se) break
      if (!occ.some(o => cur < o.e && slotEnd > o.s)) {
        let gapEnd = slotEnd; while (gapEnd + ST <= se && !occ.some(o => gapEnd < o.e && gapEnd + ST > o.s)) gapEnd += ST
        for (const o of occ) { if (o.s > cur && o.s < gapEnd) gapEnd = Math.floor(o.s / ST) * ST }
        const sd = new Date(cur); const h12 = sd.getHours()%12||12; const mm = sd.getMinutes(); const ap = sd.getHours()>=12?'PM':'AM'
        R.push({ start: new Date(cur).toISOString(), label: `${String(h12).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${ap}`, availableMs: gapEnd - cur })
      }
      cur += ST
    }
  }
  return R
})

const pendingSlot = ref<FreeSlot | null>(null)
const chosenServices = ref<PublicService[]>([])
const submitting = ref(false)
const clientName = ref('')
const nameTouched = ref(false)
const submitError = ref('')

const availableMinutes = computed(() => pendingSlot.value ? Math.floor(pendingSlot.value.availableMs / 60000) : 0)
const totalDur = computed(() => chosenServices.value.reduce((a, b) => a + b.duration_minutes, 0))
const totalPrice = computed(() => chosenServices.value.reduce((a, b) => a + b.price, 0))
const canConfirm = computed(() => chosenServices.value.length > 0 && totalDur.value <= availableMinutes.value)
const nameValid = computed(() => clientName.value.trim().length > 0)
const canSubmit = computed(() => nameValid.value)

function selectDay(d: string) { selectedDate.value = d; pendingSlot.value = null; chosenServices.value = []; advanceStep() }
function selectTimeSlot(s: FreeSlot) {
  pendingSlot.value = s
  if (totalDur.value > Math.floor(s.availableMs / 60000)) chosenServices.value = []
  advanceStep()
}
function isServiceSelected(s: PublicService) { return chosenServices.value.some(x => x.id === s.id) }
function toggleService(s: PublicService) {
  if (isServiceSelected(s)) chosenServices.value = chosenServices.value.filter(x => x.id !== s.id)
  else { const t = [...chosenServices.value, s].reduce((a, b) => a + b.duration_minutes, 0); if (t <= availableMinutes.value) chosenServices.value = [...chosenServices.value, s] }
}

function formatSlotTime(s: FreeSlot | null) { if (!s) return ''; return new Date(s.start).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) }
function formatSlotRange(s: FreeSlot | null) { if (!s) return ''; const d = new Date(s.start); return `${d.toLocaleDateString('es-VE',{day:'2-digit',month:'short'})} · ${d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:true})}` }
function formatDuration(m: number) { if (m < 60) return `${Math.floor(m)} min`; const h = Math.floor(m/60); const r = Math.floor(m%60); return r>0 ? `${h}h ${r}min` : `${h}h` }
function formatDateLabel(d: string) { return new Date(d+'T12:00:00').toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'}) }
function getInitials(n: string) { return n.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('') }

async function submitRequest() {
  if (!chosenServices.value.length || !pendingSlot.value) return
  if (!presetEmployeeId.value) { submitError.value = 'Falta el empleado en el enlace.'; return }
  if (!nameValid.value) { nameTouched.value = true; return }
  submitting.value = true; submitError.value = ''
  try {
    await submitBookingRequest(slug.value, { employee_id: presetEmployeeId.value, service_ids: chosenServices.value.map(s => s.id), start_time: pendingSlot.value.start, client_name: clientName.value.trim() })
    advanceStep()
  } catch (e: any) {
    const msg = e?.message || e?.response?.data?.message || ''
    submitError.value = msg.includes('409') || msg.includes('disponible') ? 'Este horario ya fue tomado. Elige otro.' : 'Error al reservar. Intenta de nuevo.'
  } finally { submitting.value = false }
}
</script>

<style scoped>
/* ===== ROOT ===== */
.booking-root {
  min-height: 100dvh;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.booking-page {
  width: 100%;
  max-width: 28rem;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top, 0px) + 0.75rem) 1rem calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
  gap: 0.5rem;
}
@media (min-width: 640px) {
  .booking-page { max-width: 42rem; padding: 1.5rem 2rem; gap: 0.75rem; }
}
@media (min-width: 1024px) {
  .booking-page { max-width: 56rem; padding: 2rem 3rem; }
}

/* ===== HEADER ===== */
.header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-shrink: 0; }
.emp-line { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.emp-avatar { display: flex; height: 2rem; width: 2rem; align-items: center; justify-content: center; border-radius: 9999px; font-size: 0.625rem; font-weight: 700; color: #fff; flex-shrink: 0; }

/* ===== STEPS NAV ===== */
.steps-nav { display: flex; align-items: center; justify-content: center; gap: 0.25rem; flex-shrink: 0; }
.step-btn { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem; border: none; background: none; cursor: pointer; transition: opacity 0.2s; }
.step-num { display: flex; height: 1.375rem; width: 1.375rem; align-items: center; justify-content: center; border-radius: 9999px; font-size: 0.625rem; font-weight: 700; background: var(--color-surface-muted); color: var(--color-text-muted); transition: all 0.3s; }
.step-txt { font-size: 0.625rem; font-weight: 500; color: var(--color-text-muted); white-space: nowrap; transition: color 0.3s; }
@media (min-width: 400px) { .step-num { height: 1.5rem; width: 1.5rem; font-size: 0.6875rem; } .step-txt { font-size: 0.6875rem; } }
.step-divider { width: 1rem; height: 1px; background: var(--color-border); flex-shrink: 0; transition: background 0.5s; }

/* ===== CONTENT ===== */
.content-area { flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative; }
.step-view { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; padding: 0.5rem; border-radius: 1rem; border: 1px solid var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-sm); }
@media (min-width: 640px) { .step-view { padding: 1rem; border-radius: 1.25rem; gap: 0.75rem; } }

/* ===== SPINNER ===== */
.spinner { height: 2rem; width: 2rem; border-radius: 9999px; border: 2.5px solid var(--color-border); border-top-color: var(--color-primary); animation: spin 0.7s linear infinite; }
.spinner-sm { display: inline-block; height: 1rem; width: 1rem; border-radius: 9999px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== CTA BUTTON ===== */
.cta-btn {
  width: 100%; padding: 0.625rem; border-radius: 0.75rem; border: none; color: #fff; font-size: 0.8125rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 0.375rem;
}
.cta-btn:active { opacity: 0.8; }
@media (min-width: 640px) { .cta-btn { padding: 0.75rem; font-size: 0.875rem; border-radius: 0.875rem; } }

/* ===== BACK LINK ===== */
.back-link { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.6875rem; color: var(--color-text-muted); border: none; background: none; cursor: pointer; padding: 0; flex-shrink: 0; }
.back-link:hover { color: var(--color-text); }

/* ===== CALENDAR ===== */
.cal-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.cal-nav-btn { display: flex; height: 2rem; width: 2rem; align-items: center; justify-content: center; border-radius: 0.5rem; border: 1px solid var(--color-border); color: var(--color-text-muted); background: transparent; cursor: pointer; transition: all 0.15s; }
.cal-nav-btn svg { width: 1rem; height: 1rem; }
.cal-nav-btn:active { transform: scale(0.92); }
.cal-month-title { font-size: 0.8125rem; font-weight: 700; color: var(--color-text); text-transform: capitalize; }
@media (min-width: 640px) { .cal-month-title { font-size: 0.9375rem; } }
.cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); flex-shrink: 0; }
.cal-dow span { text-align: center; font-size: 0.5625rem; font-weight: 700; color: var(--color-text-muted); opacity: 0.45; text-transform: uppercase; padding: 0.125rem 0; }
@media (min-width: 640px) { .cal-dow span { font-size: 0.625rem; } }
.cal-grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.125rem; min-height: 0; overflow: hidden; }
.cal-day {
  display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: var(--color-text); transition: all 0.15s; aspect-ratio: 1; padding: 0; min-height: 0;
}
.cal-day:active { transform: scale(0.9); }
.cal-day:not([disabled]):hover { background: var(--color-surface-muted); }
@media (min-width: 640px) { .cal-grid { gap: 0.25rem; } .cal-day { font-size: 0.8125rem; border-radius: 0.5rem; } }

/* ===== SLOTS ===== */
.slots-wrap { flex: 1; display: flex; flex-wrap: wrap; gap: 0.375rem; align-content: flex-start; overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 0; }
.slot {
  padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid var(--color-border); background: transparent; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: var(--color-text); transition: all 0.15s; white-space: nowrap; text-align: center; min-width: 5rem; flex: 1;
}
.slot:active { transform: scale(0.95); }
@media (min-width: 640px) { .slots-wrap { gap: 0.5rem; } .slot { padding: 0.625rem 1rem; font-size: 0.875rem; } }
.step-label-text { font-size: 0.6875rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }

/* ===== SERVICES ===== */
.svc-top { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.svc-list { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; overflow-y: auto; -webkit-overflow-scrolling: touch; min-height: 0; }
.svc-item {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.625rem; border-radius: 0.625rem; border: 1px solid var(--color-border); background: transparent; cursor: pointer; transition: all 0.15s; text-align: left; flex-shrink: 0;
}
.svc-item:active { transform: scale(0.98); }
@media (min-width: 640px) { .svc-item { padding: 0.625rem 0.75rem; border-radius: 0.75rem; gap: 0.625rem; } }
.svc-checkbox { flex-shrink: 0; height: 1.125rem; width: 1.125rem; border-radius: 0.25rem; border: 2px solid var(--color-border-strong); display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.svc-checkbox svg { width: 0.625rem; height: 0.625rem; }
.svc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.svc-name { font-size: 0.75rem; font-weight: 600; color: var(--color-text); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svc-meta { font-size: 0.5625rem; color: var(--color-text-muted); }
.svc-price { font-size: 0.8125rem; font-weight: 800; color: var(--color-text); flex-shrink: 0; }
@media (min-width: 640px) { .svc-checkbox { height: 1.25rem; width: 1.25rem; } .svc-name { font-size: 0.8125rem; } .svc-meta { font-size: 0.625rem; } .svc-price { font-size: 0.875rem; } }
.svc-footer-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.375rem 0.125rem 0; border-top: 1px solid var(--color-border-subtle); flex-shrink: 0; }

/* ===== SUMMARY ===== */
.summary { border-radius: 0.625rem; border: 1px solid var(--color-border); overflow: hidden; flex-shrink: 0; }
.sum-row { display: flex; align-items: center; justify-content: space-between; padding: 0.375rem 0.625rem; border-bottom: 1px solid var(--color-border-subtle); gap: 0.5rem; }
.sum-lbl { font-size: 0.625rem; color: var(--color-text-muted); flex-shrink: 0; }
.sum-val { font-size: 0.6875rem; font-weight: 600; color: var(--color-text); text-align: right; word-break: break-word; }
@media (min-width: 640px) { .summary { border-radius: 0.75rem; } .sum-row { padding: 0.5rem 0.75rem; } .sum-lbl { font-size: 0.6875rem; } .sum-val { font-size: 0.75rem; } }

/* ===== NAME INPUT ===== */
.name-inp {
  width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.625rem; border: 1px solid var(--color-border); background: var(--color-surface); font-size: 0.875rem; color: var(--color-text); outline: none; transition: border 0.15s; flex-shrink: 0;
}
.name-inp::placeholder { color: var(--color-text-muted); opacity: 0.5; }
.name-inp:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent); }
@media (min-width: 640px) { .name-inp { padding: 0.625rem 0.875rem; font-size: 0.9375rem; border-radius: 0.75rem; } }

/* ===== SUCCESS ===== */
.success-circle { margin: 0 auto; display: flex; height: 4rem; width: 4rem; align-items: center; justify-content: center; border-radius: 9999px; }
@media (min-width: 640px) { .success-circle { height: 5rem; width: 5rem; } }
.success-path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: draw 0.5s 0.2s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }

/* ===== FOOTER ===== */
.footer { flex-shrink: 0; text-align: center; padding-top: 0.25rem; }

/* ===== TRANSITIONS ===== */
.fade-enter-active { transition: opacity 0.2s ease-out; }
.fade-leave-active { transition: opacity 0.15s ease-in; position: absolute; }
.fade-enter-from { opacity: 0; }
.fade-leave-to { opacity: 0; }
</style>
