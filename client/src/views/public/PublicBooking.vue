<template>
  <div class="min-h-screen bg-bg-secondary flex flex-col" :style="{ '--color-primary': primaryColor }">
    <!-- Top bar: Logo + employee + date -->
    <header class="bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <span class="text-lg font-extrabold tracking-tight text-text">Luma</span>
        <span class="hidden sm:inline h-4 w-px bg-border"></span>
        <span v-if="employeeName" class="text-sm font-medium text-text sm:inline">{{ employeeName }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="goPrevDay" class="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-bg-secondary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <input type="date" :value="selectedDate" @change="onDateChange" :min="todayStr" :max="maxDateStr"
          class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-text text-center outline-none focus:border-primary" />
        <button @click="goNextDay" class="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-bg-secondary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <button @click="goToday" class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary">Hoy</button>
      </div>
    </header>

    <!-- Disabled by business -->
    <div v-if="!loadingBusiness && business && !publicBookingEnabled" class="flex-1 flex items-center justify-center px-4 text-center">
      <div>
        <p class="text-lg font-bold text-text mb-2">Reservas no disponibles</p>
        <p class="text-sm text-text-muted">Las reservas públicas no están habilitadas para este negocio en este momento.</p>
      </div>
    </div>

    <!-- Error / Loading -->
    <div v-else-if="loadingCalendar" class="flex-1 flex items-center justify-center text-text-muted text-sm">
      <svg class="h-5 w-5 animate-spin text-primary mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Cargando agenda...
    </div>
    <div v-else-if="businessError" class="flex-1 flex items-center justify-center px-4 text-center">
      <div>
        <p class="text-lg font-bold text-text mb-2">Negocio no encontrado</p>
        <p class="text-sm text-text-muted">Verifica el enlace o contacta a quien te lo envió.</p>
      </div>
    </div>

    <!-- Calendar Timeline -->
    <div v-else class="flex-1 overflow-auto">
      <div class="max-w-lg mx-auto px-3 py-4">
        <!-- Empty day -->
        <div v-if="!hasSchedule" class="text-center py-12 text-text-muted text-sm">
          El empleado no tiene horario laboral este día.
        </div>

        <!-- Timeline -->
        <div v-else class="relative" :style="{ height: `${totalHeight}px` }">
          <!-- Hour labels -->
          <div v-for="h in hours" :key="'l'+h.hour"
            class="absolute left-0 w-10 text-right pr-2 text-[10px] text-text-muted"
            :style="{ top: `${(h.hour - startHour) * slotHeight}px`, lineHeight: `${slotHeight}px` }">
            {{ h.label }}
          </div>

          <!-- Grid lines -->
          <div v-for="h in hours" :key="'g'+h.hour"
            class="absolute left-12 right-0 border-t border-border-subtle/30"
            :style="{ top: `${(h.hour - startHour) * slotHeight}px` }" />

          <!-- Occupied blocks (anonymized) -->
          <div v-for="(block, i) in occupiedBlocks" :key="'o'+i"
            class="absolute left-12 right-2 rounded-md flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-text-muted/60 border cursor-default"
            :class="block.confirmed ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30' : 'bg-gray-100 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700'"
            :style="{ top: `${block.top}px`, height: `${block.height}px` }">
            OCUPADO
          </div>

          <!-- Absences -->
          <div v-for="(abs, i) in absenceBlocks" :key="'a'+i"
            class="absolute left-12 right-2 rounded-md flex items-center justify-center text-[10px] font-semibold text-text-muted/50 bg-red-50/60 border border-red-100 dark:bg-red-950/15 dark:border-red-900/20"
            :style="{ top: `${abs.top}px`, height: `${abs.height}px` }">
            NO DISPONIBLE
          </div>

          <!-- Free slots -->
          <div v-for="(slot, i) in freeSlots" :key="'s'+i"
            class="absolute left-12 right-2 rounded-md border border-dashed border-primary/30 bg-primary-light/20 hover:bg-primary-light/50 hover:border-primary/60 cursor-pointer transition-colors flex items-center justify-center group"
            :style="{ top: `${slot.top}px`, height: `${slot.height}px` }"
            @click="openServicePicker(slot)">
            <span class="text-[10px] font-medium text-primary/60 group-hover:text-primary transition-colors">
              {{ slot.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Service picker modal -->
    <Teleport to="body">
      <div v-if="showServiceModal" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showServiceModal = false"></div>
        <div class="relative w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
          <h3 class="text-base font-bold text-text mb-1">Selecciona un servicio</h3>
          <p class="text-xs text-text-muted mb-1">{{ formatSlotRange(pendingSlot) }}</p>
          <p class="text-xs text-primary font-medium mb-4">Espacio disponible: {{ availableMinutes }} min</p>

          <div class="space-y-2 max-h-64 overflow-y-auto">
            <button v-for="svc in filterableServices" :key="svc.id"
              @click="selectService(svc)"
              class="w-full rounded-lg border border-border p-3 text-left hover:border-primary/40 hover:bg-primary-light/20 transition-colors">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-text">{{ svc.name }}</p>
                <p class="text-sm font-bold text-primary">${{ svc.price.toFixed(2) }}</p>
              </div>
              <p class="text-xs text-text-muted mt-0.5">{{ svc.duration_minutes }} min</p>
            </button>
            <p v-if="filterableServices.length === 0" class="text-xs text-text-muted text-center py-4">
              Ningún servicio cabe en {{ availableMinutes }} minutos.<br/>Selecciona un horario con más espacio.
            </p>
          </div>
          <button @click="showServiceModal = false" class="mt-3 w-full rounded-lg border border-border py-2 text-sm text-text-secondary hover:bg-bg-secondary">Cancelar</button>
        </div>
      </div>
    </Teleport>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showConfirmModal = false"></div>
        <div class="relative w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
          <h3 class="text-base font-bold text-text mb-4">Confirmar reserva</h3>
          <div class="space-y-2 text-sm mb-4">
            <div class="flex justify-between"><span class="text-text-muted">Servicio</span><span class="font-medium text-text">{{ chosenService?.name }}</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Duración</span><span class="font-medium text-text">{{ chosenService?.duration_minutes }} min</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Precio</span><span class="font-medium text-text">${{ chosenService?.price.toFixed(2) }}</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Día y hora</span><span class="font-medium text-text">{{ formatSlotRange(pendingSlot) }}</span></div>
            <div class="flex justify-between"><span class="text-text-muted">Empleado</span><span class="font-medium text-text">{{ employeeName }}</span></div>
          </div>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-text mb-1.5">Tu nombre</label>
            <input
              v-model="clientName"
              type="text"
              placeholder="¿Cómo te llamas?"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <p class="text-[10px] text-text-muted mt-1">Solo para identificar tu solicitud. El empleado registrará tus datos después.</p>
          </div>
          <div class="flex gap-2">
            <button @click="showConfirmModal = false" class="flex-1 rounded-lg border border-border py-2.5 text-sm text-text hover:bg-bg-secondary">Cancelar</button>
            <button @click="submitRequest" :disabled="submitting" class="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{{ submitting ? 'Reservando...' : 'Reservar' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Success -->
    <Teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg class="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 class="text-lg font-bold text-text mb-2">¡Listo!</h2>
          <p class="text-sm text-text-muted">{{ employeeName }} recibirá tu solicitud y confirmará la cita pronto.</p>
          <button @click="resetAll" class="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Agendar otra cita</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { getBusinessPublic, getEmployeePublic, listPublicServices, submitBookingRequest, getCalendarData } from '../../services/publicBookingService'
import type { PublicService } from '../../services/publicBookingService'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const presetEmployeeId = ref((route.query.empleado as string) || '')

const todayStr = new Date().toISOString().slice(0, 10)
const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
const maxDateStr = maxDate.toISOString().slice(0, 10)

const selectedDate = ref(todayStr)

// Calendar constants
const startHour = 7
const endHour = 21
const slotHeight = 52
const totalHeight = (endHour - startHour) * slotHeight

const hours = computed(() =>
  Array.from({ length: endHour - startHour }, (_, i) => {
    const h24 = startHour + i; const ampm = h24 >= 12 ? 'PM' : 'AM'
    const h12 = h24 % 12 || 12; return { hour: h24, label: `${h12}:00 ${ampm}` }
  })
)

// Business
const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({
  queryKey: computed(() => ['public-business', slug.value] as const),
  queryFn: () => getBusinessPublic(slug.value),
  staleTime: 5 * 60 * 1000,
})

const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')
const publicBookingEnabled = computed(() => {
  const features = business.value?.features
  if (!features || typeof features !== 'object') return true
  return features.enable_public_booking !== false
})

// Employee
const { data: employeeData } = useQuery({
  queryKey: computed(() => ['public-employee', slug.value, presetEmployeeId.value] as const),
  queryFn: () => getEmployeePublic(slug.value, presetEmployeeId.value),
  enabled: computed(() => !!presetEmployeeId.value && !!business.value),
  staleTime: 5 * 60 * 1000,
})
const employeeName = computed(() => employeeData.value?.full_name || '')

// Services
const { data: services } = useQuery({
  queryKey: computed(() => ['public-services', slug.value] as const),
  queryFn: () => listPublicServices(slug.value),
  enabled: computed(() => !!business.value),
  staleTime: 5 * 60 * 1000,
})

// Calendar data (occupied + schedule)
const dateRange = computed(() => ({ from: `${selectedDate.value}T00:00:00`, to: `${selectedDate.value}T23:59:59` }))

const { data: calendarData, isLoading: loadingCalendar } = useQuery({
  queryKey: computed(() => ['public-calendar', slug.value, presetEmployeeId.value, selectedDate.value] as const),
  queryFn: () => getCalendarData(slug.value, presetEmployeeId.value, dateRange.value.from, dateRange.value.to),
  enabled: computed(() => !!presetEmployeeId.value && !!business.value),
  staleTime: 0,
})

const schedules = computed(() => calendarData.value?.schedules ?? [])
const occupied = computed(() => calendarData.value?.occupied ?? [])
const absences = computed(() => calendarData.value?.absences ?? [])

const selectedDayOfWeek = computed(() => new Date(selectedDate.value + 'T12:00:00').getDay())

const hasSchedule = computed(() => {
  return (schedules.value as any[]).some((s: any) => s.weekday == selectedDayOfWeek.value)
})

// Helper: minutes from start of timeline
function topForTime(isoStr: string): number {
  const d = new Date(isoStr)
  const mins = d.getHours() * 60 + d.getMinutes() - startHour * 60
  return Math.max(0, (mins / 60) * slotHeight)
}

function heightForRange(startIso: string, endIso: string): number {
  const top = topForTime(startIso)
  const bottom = topForTime(endIso)
  return Math.max(bottom - top, 18)
}

// Occupied blocks (anonymized)
const occupiedBlocks = computed(() =>
  occupied.value.map((o: any) => ({
    top: topForTime(o.start),
    height: heightForRange(o.start, o.end),
    confirmed: o.status === 'confirmed',
  }))
)

const absenceBlocks = computed(() =>
  absences.value.map((a: any) => ({
    top: topForTime(a.start),
    height: heightForRange(a.start, a.end),
  }))
)

// Compute free slots from schedule and occupied blocks
// Each slot also stores gapEndMs and durationMs for smart filtering
interface FreeSlot {
  date: string
  start: string; end: string
  top: number; height: number
  label: string
  gapEndMs: number
  availableMs: number
}

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

    let cursor = schedStart
    const STEP = 30 * 60 * 1000

    while (cursor < schedEnd) {
      const slotEnd = cursor + STEP
      if (slotEnd > schedEnd) break

      const overlaps = allOccupied.some(o => cursor < o.end && slotEnd > o.start)
      if (!overlaps) {
        // Find the end of this contiguous gap
        let gapEnd = slotEnd
        while (gapEnd + STEP <= schedEnd) {
          const probeEnd = gapEnd + STEP
          const probeOverlaps = allOccupied.some(o => gapEnd < o.end && probeEnd > o.start)
          if (probeOverlaps) break
          gapEnd = probeEnd
        }
        // Also extend to next occupied block if partially overlapping
        for (const o of allOccupied) {
          if (o.start > cursor && o.start < gapEnd) {
            gapEnd = o.start
            // Round down to nearest 30min
            gapEnd = Math.floor(gapEnd / STEP) * STEP
          }
        }

        const startStr = new Date(cursor).toISOString()
        const endStr = new Date(slotEnd).toISOString()
        const startDate = new Date(cursor)
        const hh = startDate.getHours(); const mm = startDate.getMinutes()
        const ampm = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12
        const label = `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`

        results.push({
          date, start: startStr, end: endStr,
          top: topForTime(startStr), height: heightForRange(startStr, endStr),
          label,
          gapEndMs: gapEnd,
          availableMs: gapEnd - cursor,
        })
      }
      cursor += STEP
    }
  }
  return results
})

// Modal state
const showServiceModal = ref(false)
const showConfirmModal = ref(false)
const showSuccess = ref(false)
const pendingSlot = ref<FreeSlot | null>(null)
const chosenService = ref<PublicService | null>(null)
const submitting = ref(false)
const clientName = ref('')

const availableMinutes = ref(0)

function openServicePicker(slot: FreeSlot) {
  pendingSlot.value = slot
  availableMinutes.value = Math.floor(slot.availableMs / 60000)
  showServiceModal.value = true
}

// Services filtered by those that fit in the available time
const filterableServices = computed(() => {
  const all = (services.value ?? []) as PublicService[]
  return all.filter(svc => svc.duration_minutes <= availableMinutes.value)
})

function selectService(svc: PublicService) {
  chosenService.value = svc
  showServiceModal.value = false
  showConfirmModal.value = true
}

function formatSlotRange(slot: { start: string; end: string } | null): string {
  if (!slot) return ''
  const s = new Date(slot.start); const e = new Date(slot.end)
  const fmt = (d: Date) => d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
  const day = s.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
  return `${day} · ${fmt(s)} – ${fmt(e)}`
}

async function submitRequest() {
  if (!chosenService.value || !pendingSlot.value || !presetEmployeeId.value) return
  submitting.value = true
  try {
    await submitBookingRequest(slug.value, {
      employee_id: presetEmployeeId.value,
      service_id: chosenService.value.id,
      start_time: pendingSlot.value.start,
      client_name: clientName.value.trim() || undefined,
    })
    showConfirmModal.value = false
    showSuccess.value = true
  } catch {
    alert('No se pudo completar la reserva. El horario puede haber sido tomado.')
  } finally {
    submitting.value = false
  }
}

function resetAll() {
  showSuccess.value = false
  chosenService.value = null
  pendingSlot.value = null
  clientName.value = ''
}

// Navigation
function onDateChange(e: Event) { selectedDate.value = (e.target as HTMLInputElement).value }
function goPrevDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() - 1); selectedDate.value = d.toISOString().slice(0, 10) }
function goNextDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() + 1); selectedDate.value = d.toISOString().slice(0, 10) }
function goToday() { selectedDate.value = todayStr }
</script>
