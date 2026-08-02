<template>
  <div class="min-h-dvh flex flex-col" :style="cssVars">
    <!-- HEADER -->
    <header class="sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300"
      :style="{ background: 'rgba(255,255,255,0.82)', borderColor: 'rgba(0,0,0,0.06)' }">
      <div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-sm font-extrabold shadow-sm shadow-primary/20">
            L
          </div>
          <span class="text-sm font-semibold text-text">{{ business?.name || 'Luma' }}</span>
        </div>
        <div v-if="employeeName" class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {{ getInitials(employeeName) }}
          </div>
          <span class="text-xs font-medium text-text-secondary hidden sm:inline">{{ employeeName }}</span>
        </div>
      </div>
    </header>

    <!-- LOADING / ERROR / DISABLED STATES -->
    <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p class="text-sm text-text-muted">Cargando...</p>
      </div>
    </div>
    <div v-else-if="businessError" class="flex-1 flex items-center justify-center px-6 text-center">
      <div class="max-w-xs">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg class="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        </div>
        <p class="text-lg font-semibold text-text mb-1">Negocio no encontrado</p>
        <p class="text-sm text-text-muted">Verifica el enlace o contacta a quien te lo envió.</p>
      </div>
    </div>
    <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center px-6 text-center">
      <div class="max-w-xs">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <svg class="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
        </div>
        <p class="text-lg font-semibold text-text mb-1">Reservas no disponibles</p>
        <p class="text-sm text-text-muted">Este negocio no acepta reservas públicas en este momento.</p>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <template v-else>
      <!-- STEP INDICATOR -->
      <div class="border-b border-border-subtle bg-white/60 backdrop-blur-sm">
        <div class="max-w-lg mx-auto px-4 py-3">
          <div class="flex items-center justify-center gap-1">
            <button v-for="(step, i) in steps" :key="i"
              @click="currentStep >= i ? goToStep(i) : undefined"
              :disabled="currentStep < i || loadingCalendar"
              class="flex items-center gap-1.5 transition-all duration-300"
              :class="currentStep >= i ? 'opacity-100' : 'opacity-40'">
              <span class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
                :class="currentStep === i
                  ? 'bg-primary text-white shadow-sm shadow-primary/20 scale-110'
                  : currentStep > i
                    ? 'bg-primary/15 text-primary'
                    : 'bg-bg-secondary text-text-muted'">
                {{ currentStep > i ? '✓' : i + 1 }}
              </span>
              <span class="text-[10px] font-semibold hidden sm:inline transition-colors duration-300"
                :class="currentStep >= i ? 'text-text' : 'text-text-muted'">{{ step.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="max-w-lg mx-auto px-4 py-5">

          <!-- ============ STEP 0: DATE PICKER + TIMELINE ============ -->
          <Transition name="step-fade-slide" mode="out-in">
            <div v-if="currentStep === 0" key="step-0" class="space-y-4">
              <!-- Date picker -->
              <div>
                <p class="text-sm font-semibold text-text mb-3">Selecciona un día</p>
                <div class="flex items-center gap-2 mb-3">
                  <button @click="goPrevDay"
                    class="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-bg-secondary hover:border-border-strong transition-all active:scale-95">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <input type="date" :value="selectedDate" @change="onDateChange"
                    :min="todayStr" :max="maxDateStr"
                    class="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                  <button @click="goNextDay"
                    class="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary hover:bg-bg-secondary hover:border-border-strong transition-all active:scale-95">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                <button @click="goToday"
                  class="w-full rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-secondary transition-all active:scale-[0.98]">
                  Ir a hoy — {{ formatDateLabel(todayStr) }}
                </button>
              </div>

              <!-- Timeline loading -->
              <div v-if="loadingCalendar" class="flex flex-col items-center py-12 gap-3">
                <div class="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <p class="text-sm text-text-muted">Cargando disponibilidad...</p>
              </div>

              <!-- No schedule -->
              <div v-else-if="!hasSchedule" class="rounded-2xl border border-border bg-surface p-8 text-center">
                <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
                  <svg class="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p class="text-sm font-semibold text-text mb-1">Sin horario disponible</p>
                <p class="text-xs text-text-muted">{{ employeeName }} no atiende este día.</p>
              </div>

              <!-- Timeline -->
              <div v-else>
                <p class="text-sm font-semibold text-text mb-3">Horarios disponibles</p>
                <div class="relative rounded-2xl border border-border bg-surface/60 p-3" :style="{ minHeight: `${totalHeight + 20}px` }">
                  <!-- Hour labels -->
                  <div v-for="h in hours" :key="'l'+h.hour"
                    class="absolute left-2 w-9 text-right pr-2 text-[10px] font-medium text-text-muted/60"
                    :style="{ top: `${(h.hour - startHour) * slotHeight + 12}px` }">
                    {{ h.label }}
                  </div>
                  <!-- Grid lines -->
                  <div v-for="h in hours" :key="'g'+h.hour"
                    class="absolute left-11 right-1 border-t border-dashed border-border-subtle/30"
                    :style="{ top: `${(h.hour - startHour) * slotHeight + 12}px` }" />
                  <!-- Occupied (anonimizado) -->
                  <div v-for="(block, i) in occupiedBlocks" :key="'o'+i"
                    class="absolute left-11 right-1 rounded-lg flex items-center justify-center text-[10px] font-semibold tracking-wide border overflow-hidden"
                    :style="{ top: `${block.top + 12}px`, height: `${block.height}px` }">
                    <div class="absolute inset-0 opacity-30"
                      :class="block.confirmed ? 'bg-amber-200' : 'bg-gray-200'" />
                    <span class="relative text-[9px] uppercase tracking-widest"
                      :class="block.confirmed ? 'text-amber-700/80' : 'text-gray-500/80'">OCUPADO</span>
                  </div>
                  <!-- Absences -->
                  <div v-for="(abs, i) in absenceBlocks" :key="'a'+i"
                    class="absolute left-11 right-1 rounded-lg flex items-center justify-center text-[9px] uppercase tracking-widest font-semibold"
                    :style="{ top: `${abs.top + 12}px`, height: `${abs.height}px`, background: 'rgba(239,68,68,0.06)', border: '1px dashed rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)' }">
                    NO DISPONIBLE
                  </div>
                  <!-- Free slots -->
                  <div v-for="(slot, i) in freeSlots" :key="'s'+i"
                    class="absolute left-11 right-1 rounded-lg border border-dashed border-primary/25 bg-primary/5 hover:bg-primary/12 hover:border-primary/50 cursor-pointer transition-all duration-200 flex items-center justify-center group active:scale-[0.98] hover:shadow-sm hover:shadow-primary/10"
                    :style="{ top: `${slot.top + 12}px`, height: `${slot.height}px`, animationDelay: `${i * 40}ms` }"
                    @click="selectTimeSlot(slot)">
                    <span class="text-[10px] font-semibold text-primary/50 group-hover:text-primary/80 transition-colors">
                      {{ slot.label }}
                    </span>
                  </div>
                </div>
                <p class="text-[10px] text-text-muted/70 text-center mt-2">
                  Los horarios en {{ employeeName ? 'el calendario de ' + employeeName.split(' ')[0] : 'la agenda' }} se actualizan en tiempo real
                </p>
              </div>

              <!-- CTA to next step -->
              <div v-if="pendingSlot" class="sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-4 pb-2 -mx-4 px-4">
                <button @click="currentStep = 1"
                  class="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <span>Continuar</span>
                  <span class="text-xs bg-white/20 rounded-full px-2 py-0.5">
                    {{ formatSlotTime(pendingSlot) }}
                  </span>
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 1: SERVICE PICKER ============ -->
          <Transition name="step-fade-slide" mode="out-in">
            <div v-if="currentStep === 1" key="step-1" class="space-y-4">
              <button @click="currentStep = 0"
                class="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                {{ formatSlotTime(pendingSlot) }}
              </button>

              <div>
                <p class="text-lg font-bold text-text mb-1">Elige tu servicio</p>
                <p class="text-xs text-text-muted flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Espacio disponible: hasta {{ formatDuration(availableMinutes) }}
                </p>
              </div>

              <div class="space-y-2.5">
                <TransitionGroup name="service-list">
                  <button v-for="(svc, idx) in filterableServices" :key="svc.id"
                    @click="selectService(svc)"
                    :style="{ animationDelay: `${idx * 60}ms` }"
                    class="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] group border-border hover:border-primary/40 bg-surface hover:bg-primary/3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ background: svc.color || 'var(--color-primary)' }"></div>
                          <p class="text-sm font-bold text-text group-hover:text-primary transition-colors">{{ svc.name }}</p>
                        </div>
                        <p class="text-xs text-text-muted flex items-center gap-2">
                          <span class="inline-flex items-center gap-1">
                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            {{ svc.duration_minutes }} min
                          </span>
                        </p>
                      </div>
                      <div class="text-right flex-shrink-0">
                        <p class="text-lg font-extrabold text-text group-hover:text-primary transition-colors">${{ svc.price.toFixed(0) }}</p>
                        <p class="text-[10px] text-text-muted">{{ svc.currency || 'USD' }}</p>
                      </div>
                    </div>
                  </button>
                </TransitionGroup>
              </div>

              <p v-if="filterableServices.length === 0" class="text-sm text-text-muted text-center py-8">
                Ningún servicio cabe en este espacio.<br/>
                <button @click="currentStep = 0" class="text-primary font-medium hover:underline mt-1 inline-block">Elige un horario con más tiempo</button>
              </p>
            </div>
          </Transition>

          <!-- ============ STEP 2: CONFIRMATION ============ -->
          <Transition name="step-fade-slide" mode="out-in">
            <div v-if="currentStep === 2" key="step-2" class="space-y-4">
              <button @click="currentStep = 1"
                class="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Cambiar servicio
              </button>

              <div>
                <p class="text-lg font-bold text-text mb-1">Confirma tu reserva</p>
                <p class="text-xs text-text-muted">Revisa los detalles antes de enviar</p>
              </div>

              <!-- Receipt card -->
              <div class="rounded-2xl border border-border bg-surface overflow-hidden">
                <div class="bg-primary/5 px-5 py-4 border-b border-border-subtle">
                  <p class="text-xs font-semibold text-primary uppercase tracking-wider">Detalle de la cita</p>
                </div>
                <div class="divide-y divide-border-subtle">
                  <div class="flex items-center justify-between px-5 py-3">
                    <span class="text-sm text-text-muted">Servicio</span>
                    <span class="text-sm font-semibold text-text">{{ chosenService?.name }}</span>
                  </div>
                  <div class="flex items-center justify-between px-5 py-3">
                    <span class="text-sm text-text-muted">Duración</span>
                    <span class="text-sm font-semibold text-text">{{ chosenService?.duration_minutes }} min</span>
                  </div>
                  <div class="flex items-center justify-between px-5 py-3">
                    <span class="text-sm text-text-muted">Día y hora</span>
                    <span class="text-sm font-semibold text-text">{{ formatSlotRange(pendingSlot) }}</span>
                  </div>
                  <div class="flex items-center justify-between px-5 py-3">
                    <span class="text-sm text-text-muted">Profesional</span>
                    <span class="text-sm font-semibold text-text flex items-center gap-1.5">
                      <span class="inline-block h-5 w-5 rounded-full bg-primary/10 text-[9px] font-bold text-primary flex items-center justify-center">{{ getInitials(employeeName) }}</span>
                      {{ employeeName }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between px-5 py-3 bg-bg-secondary/30">
                    <span class="text-sm font-semibold text-text">Total</span>
                    <span class="text-lg font-extrabold text-primary">${{ chosenService?.price.toFixed(0) }}</span>
                  </div>
                </div>
              </div>

              <!-- Client name -->
              <div>
                <label class="block text-xs font-semibold text-text mb-1.5">¿Cómo te llamas?</label>
                <input
                  v-model="clientName"
                  type="text"
                  placeholder="Tu nombre (ej. María García)"
                  maxlength="200"
                  class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                <p class="text-[10px] text-text-muted/70 mt-1.5 flex items-center gap-1">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Solo para identificar tu solicitud. El profesional registrará tus datos completos después.
                </p>
              </div>

              <!-- Submit -->
              <div class="sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-4 pb-2 -mx-4 px-4">
                <button @click="submitRequest" :disabled="submitting"
                  class="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {{ submitting ? 'Reservando...' : 'Confirmar reserva' }}
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 3: SUCCESS ============ -->
          <Transition name="step-fade-slide" mode="out-in">
            <div v-if="currentStep === 3" key="step-3" class="text-center py-6">
              <!-- Animated checkmark -->
              <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 relative">
                <svg class="h-9 w-9 text-green-500 success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path class="check-path" d="M5 13l4 4L19 7"/>
                </svg>
                <div class="absolute inset-0 rounded-full border-2 border-green-200 success-ring"></div>
              </div>

              <h2 class="text-xl font-extrabold text-text mb-2">¡Reserva enviada!</h2>
              <p class="text-sm text-text-muted mb-6 max-w-xs mx-auto">
                {{ employeeName }} recibirá tu solicitud para
                <span class="font-semibold text-text">{{ chosenService?.name }}</span>
                el {{ formatSlotRange(pendingSlot) }}. Te confirmará pronto.
              </p>

              <!-- Summary mini card -->
              <div class="rounded-xl border border-border bg-surface p-4 mb-6 max-w-xs mx-auto text-left">
                <div class="flex items-center gap-2 mb-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                    {{ getInitials(employeeName) }}
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-text">{{ chosenService?.name }}</p>
                    <p class="text-[10px] text-text-muted">{{ employeeName }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {{ formatSlotRange(pendingSlot) }}
                </div>
              </div>

              <button @click="resetAll"
                class="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all">
                Agendar otra cita
              </button>
            </div>
          </Transition>

        </div>
      </div>
    </template>
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
const currentStep = ref(0)
const steps = [
  { label: 'Día y hora' },
  { label: 'Servicio' },
  { label: 'Confirmar' },
  { label: '¡Listo!' },
]

// Calendar constants
const startHour = 7
const endHour = 21
const slotHeight = 52
const totalHeight = (endHour - startHour) * slotHeight

const hours = computed(() =>
  Array.from({ length: endHour - startHour }, (_, i) => {
    const h24 = startHour + i; const ampm = h24 >= 12 ? 'PM' : 'AM'
    const h12 = h24 % 12 || 12; return { hour: h24, label: `${h12}:00` }
  })
)

// Business
const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({
  queryKey: computed(() => ['public-business', slug.value] as const),
  queryFn: () => getBusinessPublic(slug.value),
  staleTime: 5 * 60 * 1000,
})

const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')

const cssVars = computed(() => ({
  '--color-primary': primaryColor.value,
  '--color-primary-hover': adjustColor(primaryColor.value, -8),
}))

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

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

// Calendar
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
const hasSchedule = computed(() => (schedules.value as any[]).some((s: any) => s.weekday == selectedDayOfWeek.value))

// Timeline helpers
function topForTime(isoStr: string): number {
  const d = new Date(isoStr)
  const mins = d.getHours() * 60 + d.getMinutes() - startHour * 60
  return Math.max(0, (mins / 60) * slotHeight)
}
function heightForRange(startIso: string, endIso: string): number {
  return Math.max(topForTime(endIso) - topForTime(startIso), 18)
}

const occupiedBlocks = computed(() =>
  occupied.value.map((o: any) => ({ top: topForTime(o.start), height: heightForRange(o.start, o.end), confirmed: o.status === 'confirmed' }))
)
const absenceBlocks = computed(() =>
  absences.value.map((a: any) => ({ top: topForTime(a.start), height: heightForRange(a.start, a.end) }))
)
// Free slots
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

    let cursor = schedStart
    const STEP = 30 * 60 * 1000
    while (cursor < schedEnd) {
      const slotEnd = cursor + STEP
      if (slotEnd > schedEnd) break
      const overlaps = allOccupied.some(o => cursor < o.end && slotEnd > o.start)
      if (!overlaps) {
        let gapEnd = slotEnd
        while (gapEnd + STEP <= schedEnd) {
          const probeEnd = gapEnd + STEP
          if (allOccupied.some(o => gapEnd < o.end && probeEnd > o.start)) break
          gapEnd = probeEnd
        }
        for (const o of allOccupied) {
          if (o.start > cursor && o.start < gapEnd) { gapEnd = Math.floor(o.start / STEP) * STEP }
        }
        const startDate = new Date(cursor); const hh = startDate.getHours(); const mm = startDate.getMinutes()
        const ampm = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12
        results.push({
          date, start: new Date(cursor).toISOString(), end: new Date(slotEnd).toISOString(),
          top: topForTime(new Date(cursor).toISOString()), height: heightForRange(new Date(cursor).toISOString(), new Date(slotEnd).toISOString()),
          label: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`,
          gapEndMs: gapEnd, availableMs: gapEnd - cursor,
        })
      }
      cursor += STEP
    }
  }
  return results
})

// Modal state
const pendingSlot = ref<FreeSlot | null>(null)
const chosenService = ref<PublicService | null>(null)
const submitting = ref(false)
const clientName = ref('')
const availableMinutes = ref(0)

function selectTimeSlot(slot: FreeSlot) {
  pendingSlot.value = slot
  availableMinutes.value = Math.floor(slot.availableMs / 60000)
}

const filterableServices = computed(() => {
  return ((services.value ?? []) as PublicService[]).filter(svc => svc.duration_minutes <= availableMinutes.value)
})

function selectService(svc: PublicService) {
  chosenService.value = svc
  currentStep.value = 2
}

function formatSlotTime(slot: FreeSlot | null): string {
  if (!slot) return ''
  const s = new Date(slot.start)
  return s.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatSlotRange(slot: FreeSlot | null): string {
  if (!slot) return ''
  const s = new Date(slot.start)
  const day = s.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
  const time = s.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${day} · ${time}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
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
    currentStep.value = 3
  } catch {
    alert('Este horario ya no está disponible. Por favor elige otro.')
    currentStep.value = 0
  } finally {
    submitting.value = false
  }
}

function resetAll() {
  currentStep.value = 0
  chosenService.value = null
  pendingSlot.value = null
  clientName.value = ''
  selectedDate.value = todayStr
}

function goToStep(step: number) { currentStep.value = step }
function onDateChange(e: Event) { selectedDate.value = (e.target as HTMLInputElement).value; pendingSlot.value = null }
function goPrevDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() - 1); selectedDate.value = d.toISOString().slice(0, 10); pendingSlot.value = null }
function goNextDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() + 1); selectedDate.value = d.toISOString().slice(0, 10); pendingSlot.value = null }
function goToday() { selectedDate.value = todayStr; pendingSlot.value = null }
</script>

<style scoped>
.step-fade-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
}
.step-fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.step-fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.service-list-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.service-list-leave-active {
  transition: all 0.2s ease-in;
}
.service-list-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.service-list-leave-to {
  opacity: 0;
}

/* Animated success checkmark */
.success-check .check-path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: draw-check 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
}
.success-ring {
  animation: ring-pulse 1.5s ease-out 0.7s forwards;
  opacity: 0;
}
@keyframes draw-check {
  to { stroke-dashoffset: 0; }
}
@keyframes ring-pulse {
  0% { opacity: 0; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 0; transform: scale(1.4); }
}
</style>
