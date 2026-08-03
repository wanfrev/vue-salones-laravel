<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden px-0 sm:px-4 py-0 sm:py-6 bg-bg-secondary" :style="cssVars">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url('${leafBackground}')` }"
      aria-hidden="true"
    />
    <div class="absolute inset-0 bg-black/35 dark:bg-black/55" aria-hidden="true" />
    <div
      class="absolute inset-0 opacity-25 dark:opacity-20"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 20% 30%, rgba(134,156,132,0.2), transparent 40%), radial-gradient(circle at 80% 70%, rgba(15,23,42,0.1), transparent 35%)"
    />

    <div class="relative z-10 w-full sm:max-w-6xl sm:rounded-3xl border-0 sm:border border-white/20 dark:border-white/10 bg-white/85 dark:bg-zinc-950/85 sm:backdrop-blur-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 overflow-hidden transition-shadow duration-500 max-h-dvh sm:max-h-[96dvh] flex flex-col">
      <!-- Header -->
      <div class="flex-shrink-0 px-4 sm:px-8 pt-3 sm:pt-5 pb-2 sm:pb-3 flex items-center justify-between border-b border-black/5 dark:border-white/5">
        <div class="flex items-center gap-2 sm:gap-3">
          <img :src="logo" alt="Luma" class="h-6 sm:h-7 w-auto object-contain" />
          <span v-if="business?.name" class="text-[10px] sm:text-xs font-semibold text-text/60 tracking-wide truncate max-w-[140px] sm:max-w-none">{{ business.name }}</span>
        </div>
        <button
          @click="toggleTheme"
          class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-black/10 dark:border-white/10 text-text-muted hover:text-text hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 active:scale-95 bg-transparent flex-shrink-0"
          :aria-label="isDarkEffective ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          :title="isDarkEffective ? 'Modo claro' : 'Modo oscuro'"
        >
          <svg v-if="!isDarkEffective" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
          </svg>
          <svg v-else class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
          </svg>
        </button>
      </div>

      <!-- Employee -->
      <div v-if="employeeName" class="flex-shrink-0 px-4 sm:px-8 pt-2 pb-1 flex items-center gap-2 sm:gap-2.5">
        <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold text-white shadow-sm flex-shrink-0" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">
          {{ getInitials(employeeName) }}
        </div>
        <div class="min-w-0">
          <p class="text-[10px] sm:text-xs font-semibold text-text leading-tight truncate">Agenda con {{ employeeName }}</p>
          <p class="text-[9px] sm:text-[10px] text-text-muted truncate">Reserva tu cita</p>
        </div>
      </div>

      <!-- Steps -->
      <div class="flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 px-4 sm:px-8 pb-1 sm:pb-2">
        <button
          v-for="(step, i) in steps" :key="i"
          @click="currentStep >= i ? goToStep(i) : undefined"
          :disabled="currentStep < i || loadingCalendar"
          class="flex items-center gap-1 sm:gap-1.5 transition-all duration-300 group"
          :class="currentStep >= i ? 'opacity-100' : 'opacity-30 pointer-events-none'"
        >
          <span
            class="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold transition-all duration-300"
            :class="currentStep === i
              ? 'text-white shadow-md scale-100'
              : currentStep > i
                ? 'text-primary/80'
                : 'text-text-muted bg-black/5 dark:bg-white/5'"
            :style="currentStep === i ? { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 12px ${colored('--color-primary')}33` } : currentStep > i ? { background: `${colored('--color-primary')}18` } : {}"
          >
            {{ currentStep > i ? '✓' : i + 1 }}
          </span>
          <span class="text-[9px] sm:text-[10px] font-semibold hidden sm:inline transition-colors duration-300" :class="currentStep >= i ? 'text-text' : 'text-text-muted'">
            {{ step.label }}
          </span>
          <span v-if="i < steps.length - 1" class="w-3 sm:w-5 h-px mx-0 sm:mx-0.5 transition-colors duration-300" :class="currentStep > i ? 'bg-primary/40' : 'bg-black/10 dark:bg-white/8'" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- LOADING / ERROR / DISABLED -->
        <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p class="text-xs text-text-muted">Cargando...</p>
          </div>
        </div>
        <div v-else-if="businessError" class="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
              <svg class="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            </div>
            <p class="text-sm font-semibold text-text mb-1">Negocio no encontrado</p>
            <p class="text-xs text-text-muted">Verifica el enlace o contacta a quien te lo envió.</p>
          </div>
        </div>
        <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
              <svg class="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            </div>
            <p class="text-sm font-semibold text-text mb-1">Reservas no disponibles</p>
            <p class="text-xs text-text-muted">Este negocio no acepta reservas públicas en este momento.</p>
          </div>
        </div>

        <template v-else>
          <!-- ============ STEPS 0-1: TWO-COLUMN SELECTION ============ -->
          <div v-if="currentStep <= 1" class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1.65fr] gap-0 lg:gap-0 px-2 sm:px-6 pb-3 sm:pb-5 lg:pb-5 lg:pr-5">
            <!-- LEFT COLUMN: Date picker & Service list -->
            <Transition name="step-fade" mode="out-in">
              <!-- STEP 0: Date + Slot info -->
              <div v-if="currentStep === 0" key="step-0" class="flex flex-col gap-2 sm:gap-3 pt-1 lg:pt-2 lg:pl-2 min-h-0">
                <div class="flex-shrink-0">
                  <p class="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2">Selecciona un día</p>
                  <div class="flex items-center gap-1.5 sm:gap-2">
                    <button @click="goPrevDay" class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-black/8 dark:border-white/8 text-text-secondary hover:bg-black/3 dark:hover:bg-white/5 hover:border-black/15 dark:hover:border-white/15 transition-all active:scale-95 flex-shrink-0">
                      <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <input type="date" :value="selectedDate" @change="onDateChange" :min="todayStr" :max="maxDateStr"
                      class="flex-1 rounded-lg sm:rounded-xl border border-black/8 dark:border-white/8 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-text text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer [color-scheme:light_dark] min-w-0" />
                    <button @click="goNextDay" class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-black/8 dark:border-white/8 text-text-secondary hover:bg-black/3 dark:hover:bg-white/5 hover:border-black/15 dark:hover:border-white/15 transition-all active:scale-95 flex-shrink-0">
                      <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                  <button @click="goToday"
                    class="w-full mt-1.5 sm:mt-2 rounded-lg sm:rounded-xl border border-black/5 dark:border-white/5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium text-text-muted hover:text-text hover:bg-black/3 dark:hover:bg-white/3 transition-all active:scale-[0.98]">
                    Ir a hoy — {{ formatDateLabel(todayStr) }}
                  </button>
                </div>

                <!-- Slot info card -->
                <div v-if="pendingSlot" class="rounded-xl sm:rounded-2xl border border-primary/20 dark:border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.06] p-3 sm:p-4 mt-auto">
                  <p class="text-[9px] sm:text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2">Horario seleccionado</p>
                  <p class="text-sm sm:text-sm font-bold" :style="{ color: colored('--color-primary') }">{{ formatSlotTime(pendingSlot) }}</p>
                  <p class="text-[9px] sm:text-[10px] text-text-muted mt-0.5">{{ formatDateLabel(selectedDate) }}</p>
                  <p class="text-[9px] sm:text-[10px] text-text-muted mt-0.5">Hasta {{ formatDuration(availableMinutes) }} disponibles</p>
                </div>

                <div v-if="!pendingSlot" class="flex-1 flex items-center justify-center text-text-muted/30 py-4">
                  <p class="text-[10px] sm:text-xs text-center">Elige un horario a la derecha<br/>para ver los servicios</p>
                </div>

                <button v-if="pendingSlot" @click="currentStep = 1"
                  class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 mt-auto"
                  :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }">
                  <span>Ver servicios</span>
                  <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
              </div>

              <!-- STEP 1: Services -->
              <div v-else key="step-1" class="flex flex-col gap-2 sm:gap-3 pt-1 lg:pt-2 lg:pl-2 min-h-0 lg:overflow-y-auto">
                <button @click="currentStep = 0"
                  class="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-text-muted hover:text-text transition-colors flex-shrink-0">
                  <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  <span class="truncate">{{ formatDateLabel(selectedDate) }} · {{ formatSlotTime(pendingSlot) }}</span>
                </button>

                <div class="flex-shrink-0">
                  <p class="text-sm sm:text-sm font-bold text-text mb-0.5">Elige tu servicio</p>
                  <p class="text-[10px] sm:text-xs text-text-muted flex items-center gap-1 sm:gap-1.5">
                    <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Hasta {{ formatDuration(availableMinutes) }}
                  </p>
                </div>

                <div v-if="filterableServices.length === 0" class="flex-1 flex items-center justify-center py-6 text-center">
                  <div>
                    <p class="text-xs text-text-muted">Ningún servicio cabe en este espacio.</p>
                    <button @click="currentStep = 0" class="text-primary font-medium hover:underline mt-1.5 text-xs inline-block">Elige otro horario</button>
                  </div>
                </div>

                <div v-else class="space-y-1.5 sm:space-y-2">
                  <button v-for="svc in filterableServices" :key="svc.id"
                    @click="selectService(svc)"
                    class="w-full rounded-lg sm:rounded-xl border p-2.5 sm:p-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group"
                    :class="chosenService?.id === svc.id
                      ? 'border-primary/40 dark:border-primary/30 bg-primary/[0.06] dark:bg-primary/[0.08] shadow-sm shadow-primary/5'
                      : 'border-black/6 dark:border-white/6 hover:border-primary/30 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] hover:shadow-md'">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" :style="{ background: svc.color || colored('--color-primary') }" />
                        <div class="min-w-0">
                          <p class="text-xs sm:text-sm font-bold text-text truncate">{{ svc.name }}</p>
                          <p class="text-[9px] sm:text-[10px] text-text-muted">{{ svc.duration_minutes }} min</p>
                        </div>
                      </div>
                      <p class="text-sm sm:text-base font-extrabold text-text flex-shrink-0">${{ svc.price.toFixed(0) }}</p>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>

            <!-- RIGHT COLUMN: Timeline -->
            <div class="flex flex-col min-h-0 pt-1 lg:pt-2 lg:pr-2">
              <!-- Loading -->
              <div v-if="loadingCalendar" class="flex-1 flex items-center justify-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p class="text-xs text-text-muted">Cargando disponibilidad...</p>
                </div>
              </div>

              <!-- No schedule -->
              <div v-else-if="!hasSchedule" class="flex-1 flex items-center justify-center">
                <div class="text-center px-4">
                  <div class="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                    <svg class="h-4 w-4 sm:h-5 sm:w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <p class="text-xs sm:text-sm font-semibold text-text mb-0.5">Sin horario disponible</p>
                  <p class="text-[10px] sm:text-xs text-text-muted">{{ employeeName }} no atiende este día.</p>
                </div>
              </div>

              <!-- Timeline -->
              <div v-else class="flex-1 flex flex-col min-h-0">
                <p class="text-[9px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2 flex-shrink-0 hidden lg:block">Horarios</p>
                <p class="text-[9px] font-semibold text-text-muted mb-1 flex-shrink-0 lg:hidden">{{ formatDateLabel(selectedDate) }}</p>
                <div class="flex-1 relative rounded-xl sm:rounded-2xl border border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015] p-2 sm:p-2.5" :style="{ minHeight: `${totalHeight + 4}px` }">
                  <!-- Hour labels -->
                  <div v-for="h in hours" :key="'l'+h.hour"
                    class="absolute left-1.5 sm:left-2 w-9 sm:w-10 text-right pr-1.5 sm:pr-2 text-[8px] sm:text-[9px] font-medium text-text-muted/50"
                    :style="{ top: `${(h.hour - startHour) * slotHeight + 4}px` }">
                    {{ h.label }}
                  </div>
                  <!-- Grid lines -->
                  <div v-for="h in hours" :key="'g'+h.hour"
                    class="absolute left-11 sm:left-12 right-0.5 sm:right-1 border-t border-dashed border-black/[0.03] dark:border-white/[0.03]"
                    :style="{ top: `${(h.hour - startHour) * slotHeight + 4}px` }" />
                  <!-- Occupied -->
                  <div v-for="(block, i) in occupiedBlocks" :key="'o'+i"
                    class="absolute left-11 sm:left-12 right-0.5 sm:right-1 rounded-md flex items-center justify-center text-[9px] font-semibold tracking-wide overflow-hidden border"
                    :style="{ top: `${block.top + 4}px`, height: `${block.height}px` }">
                    <div class="absolute inset-0 opacity-20" :style="{ background: block.confirmed ? '#f59e0b' : '#94a3b8' }" />
                    <span class="relative text-[7px] sm:text-[8px] uppercase tracking-widest" :style="{ color: block.confirmed ? '#b45309' : '#64748b' }">OCUPADO</span>
                  </div>
                  <!-- Absences -->
                  <div v-for="(abs, i) in absenceBlocks" :key="'a'+i"
                    class="absolute left-11 sm:left-12 right-0.5 sm:right-1 rounded-md flex items-center justify-center text-[7px] sm:text-[8px] uppercase tracking-widest font-semibold"
                    :style="{ top: `${abs.top + 4}px`, height: `${abs.height}px`, background: 'rgba(239,68,68,0.04)', border: '1px dashed rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.45)' }">
                    NO DISPONIBLE
                  </div>
                  <!-- Free slots -->
                  <div v-for="(slot, i) in freeSlots" :key="'s'+i"
                    class="absolute left-11 sm:left-12 right-0.5 sm:right-1 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 group active:scale-[0.98]"
                    :style="{ top: `${slot.top + 4}px`, height: `${slot.height}px`, animationDelay: `${i * 30}ms` }"
                    :class="pendingSlot === slot
                      ? 'bg-primary/25 dark:bg-primary/30 border-2 border-primary/50 shadow-sm shadow-primary/10'
                      : 'border border-dashed border-primary/20 dark:border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.06] hover:bg-primary/10 dark:hover:bg-primary/15 hover:border-primary/40 dark:hover:border-primary/40'"
                    @click="selectTimeSlot(slot)">
                    <span
                      class="text-[9px] sm:text-[10px] font-semibold transition-colors"
                      :class="pendingSlot === slot ? 'text-primary dark:text-primary' : 'text-primary/50 dark:text-primary/50 group-hover:text-primary/80 dark:group-hover:text-primary/80'">
                      {{ slot.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============ STEP 2: CONFIRMATION ============ -->
          <Transition name="step-fade" mode="out-in">
            <div v-if="currentStep === 2" key="step-2" class="flex-1 flex items-start justify-center px-4 sm:px-6 pb-4 sm:pb-6 pt-1 sm:pt-2 lg:pt-4 overflow-y-auto">
              <div class="w-full max-w-md space-y-3 sm:space-y-4">
                <button @click="currentStep = 1"
                  class="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-text-muted hover:text-text transition-colors">
                  <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  Cambiar servicio
                </button>

                <div>
                  <p class="text-base sm:text-lg font-bold text-text mb-0.5">Confirma tu reserva</p>
                  <p class="text-[10px] sm:text-xs text-text-muted">Revisa los detalles antes de enviar</p>
                </div>

                <div class="rounded-xl sm:rounded-2xl border border-black/6 dark:border-white/6 overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
                  <div class="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-black/3 dark:border-white/3" :style="{ background: `${colored('--color-primary')}0D` }">
                    <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider" :style="{ color: `${colored('--color-primary')}cc` }">Detalle de la cita</p>
                  </div>
                  <div class="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                    <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                      <span class="text-[11px] sm:text-xs text-text-muted">Servicio</span>
                      <span class="text-[11px] sm:text-xs font-semibold text-text">{{ chosenService?.name }}</span>
                    </div>
                    <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                      <span class="text-[11px] sm:text-xs text-text-muted">Duración</span>
                      <span class="text-[11px] sm:text-xs font-semibold text-text">{{ chosenService?.duration_minutes }} min</span>
                    </div>
                    <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                      <span class="text-[11px] sm:text-xs text-text-muted">Día y hora</span>
                      <span class="text-[11px] sm:text-xs font-semibold text-text">{{ formatSlotRange(pendingSlot) }}</span>
                    </div>
                    <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                      <span class="text-[11px] sm:text-xs text-text-muted">Profesional</span>
                      <span class="text-[11px] sm:text-xs font-semibold text-text flex items-center gap-1.5">
                        <span class="inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[7px] sm:text-[8px] font-bold text-white" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">{{ getInitials(employeeName) }}</span>
                        {{ employeeName }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 bg-black/[0.02] dark:bg-white/[0.02]">
                      <span class="text-[11px] sm:text-xs font-semibold text-text">Total</span>
                      <span class="text-base sm:text-lg font-extrabold" :style="{ color: colored('--color-primary') }">${{ chosenService?.price.toFixed(0) }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] sm:text-[11px] font-semibold text-text mb-1 sm:mb-1.5 uppercase tracking-wider">¿Cómo te llamas?</label>
                  <input
                    v-model="clientName"
                    type="text"
                    placeholder="Tu nombre"
                    maxlength="200"
                    class="w-full rounded-lg sm:rounded-xl border border-black/8 dark:border-white/8 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-text placeholder:text-text-muted/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                  <p class="text-[9px] sm:text-[10px] text-text-muted/60 mt-1 sm:mt-1.5 flex items-center gap-1">
                    <svg class="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Solo para identificar tu solicitud.
                  </p>
                </div>

                <button @click="submitRequest" :disabled="submitting"
                  class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }">
                  <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {{ submitting ? 'Reservando...' : 'Confirmar reserva' }}
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 3: SUCCESS ============ -->
          <Transition name="step-fade" mode="out-in">
            <div v-if="currentStep === 3" key="step-3" class="flex-1 flex items-center justify-center px-4 sm:px-6 pb-4 sm:pb-6 pt-1 sm:pt-2">
              <div class="text-center max-w-xs px-2">
                <div class="mx-auto mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full relative" :style="{ background: `${colored('--color-primary')}0F` }">
                  <svg class="h-7 w-7 sm:h-9 sm:w-9 success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: colored('--color-primary') }">
                    <path class="check-path" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div class="absolute inset-0 rounded-full border-2 success-ring" :style="{ borderColor: `${colored('--color-primary')}40` }" />
                </div>

                <h2 class="text-lg sm:text-xl font-extrabold text-text mb-1 sm:mb-1.5">¡Reserva enviada!</h2>
                <p class="text-[10px] sm:text-xs text-text-muted mb-4 sm:mb-5 leading-relaxed">
                  {{ employeeName }} recibirá tu solicitud para
                  <span class="font-semibold text-text">{{ chosenService?.name }}</span>
                  el {{ formatSlotRange(pendingSlot) }}.
                </p>
                <p class="text-[9px] sm:text-[10px] text-text-muted/40">Gracias por tu reserva.</p>
              </div>
            </div>
          </Transition>
        </template>
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
import leafBackground from '../../assets/Fondo.jpg'

const route = useRoute()
const themeStore = useThemeStore()
const slug = computed(() => route.params.slug as string)
const presetEmployeeId = ref((route.query.empleado as string) || '')

const logo = computed(() => (themeStore.isDark ? logoDark : logoLight))
const isDarkEffective = computed(() => themeStore.isDark)

function toggleTheme() {
  themeStore.toggle()
}

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

const startHour = 7
const endHour = 21
const slotHeight = 44
const totalHeight = (endHour - startHour) * slotHeight

const hours = computed(() =>
  Array.from({ length: endHour - startHour }, (_, i) => {
    const h24 = startHour + i
    const h12 = h24 % 12 || 12; return { hour: h24, label: `${h12}:00` }
  })
)

const { data: business, error: businessError, isLoading: loadingBusiness } = useQuery({
  queryKey: computed(() => ['public-business', slug.value] as const),
  queryFn: () => getBusinessPublic(slug.value),
  staleTime: 5 * 60 * 1000,
})

const primaryColor = computed(() => business.value?.theme_config?.primary_color || '#869C84')

const cssVars = computed(() => ({
  '--color-primary': primaryColor.value,
  '--color-primary-hover': adjustHex(primaryColor.value, -8),
}))

function colored(_token: string): string {
  return primaryColor.value
}

function adjustHex(hex: string, amount: number): string {
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
  enabled: computed(() => !!presetEmployeeId.value && !!business.value),
  staleTime: 0,
})

const schedules = computed(() => calendarData.value?.schedules ?? [])
const occupied = computed(() => calendarData.value?.occupied ?? [])
const absences = computed(() => calendarData.value?.absences ?? [])
const selectedDayOfWeek = computed(() => new Date(selectedDate.value + 'T12:00:00').getDay())
const hasSchedule = computed(() => (schedules.value as any[]).some((s: any) => s.weekday == selectedDayOfWeek.value))

function topForTime(isoStr: string): number {
  const d = new Date(isoStr)
  const mins = d.getHours() * 60 + d.getMinutes() - startHour * 60
  return Math.max(0, (mins / 60) * slotHeight)
}
function heightForRange(startIso: string, endIso: string): number {
  return Math.max(topForTime(endIso) - topForTime(startIso), 10)
}

const occupiedBlocks = computed(() =>
  occupied.value.map((o: any) => ({ top: topForTime(o.start), height: heightForRange(o.start, o.end), confirmed: o.status === 'confirmed' }))
)
const absenceBlocks = computed(() =>
  absences.value.map((a: any) => ({ top: topForTime(a.start), height: heightForRange(a.start, a.end) }))
)

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

function goToStep(step: number) { currentStep.value = step }
function onDateChange(e: Event) { selectedDate.value = (e.target as HTMLInputElement).value; pendingSlot.value = null }
function goPrevDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() - 1); selectedDate.value = d.toISOString().slice(0, 10); pendingSlot.value = null }
function goNextDay() { const d = new Date(selectedDate.value + 'T12:00:00'); d.setDate(d.getDate() + 1); selectedDate.value = d.toISOString().slice(0, 10); pendingSlot.value = null }
function goToday() { selectedDate.value = todayStr; pendingSlot.value = null }
</script>

<style scoped>
.step-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
}
.step-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

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
