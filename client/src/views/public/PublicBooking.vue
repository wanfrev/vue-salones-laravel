<template>
  <div class="relative flex min-h-dvh items-start sm:items-center justify-center overflow-x-hidden sm:overflow-hidden px-0 sm:px-4 py-0 sm:py-6 bg-bg-secondary" :style="cssVars">
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

    <div class="relative z-10 w-full sm:max-w-2xl sm:rounded-3xl border-0 sm:border border-white/20 dark:border-white/10 bg-white/85 dark:bg-zinc-950/85 sm:backdrop-blur-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 overflow-hidden transition-shadow duration-500 min-h-dvh sm:min-h-0 flex flex-col">
      <!-- Header -->
      <div class="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-5 pb-2 sm:pb-3 flex items-center justify-between border-b border-black/5 dark:border-white/5">
        <div class="flex items-center gap-2 sm:gap-3">
          <img :src="logo" alt="Luma" class="h-6 sm:h-7 w-auto object-contain" />
          <span v-if="business?.name" class="text-[10px] sm:text-xs font-semibold text-text/60 tracking-wide truncate max-w-[140px] sm:max-w-none">{{ business.name }}</span>
        </div>
        <button
          @click="toggleTheme"
          class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-black/10 dark:border-white/10 text-text-muted hover:text-text hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 active:scale-95 bg-transparent"
          :aria-label="isDarkEffective ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <svg v-if="!isDarkEffective" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
          </svg>
          <svg v-else class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
          </svg>
        </button>
      </div>

      <!-- Employee info -->
      <div v-if="employeeName" class="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-1 flex items-center gap-2.5 sm:gap-3">
        <div class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold text-white shadow-sm flex-shrink-0" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">
          {{ getInitials(employeeName) }}
        </div>
        <div class="min-w-0">
          <p class="text-xs sm:text-sm font-bold text-text leading-tight truncate">Agenda con {{ employeeName }}</p>
        </div>
      </div>

      <!-- Step indicators -->
      <div class="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-0">
        <div class="flex items-center justify-center gap-0">
          <template v-for="(step, i) in steps" :key="i">
            <button
              @click="goToStep(i)"
              :disabled="i > maxReachableStep"
              class="flex items-center gap-1.5 transition-all duration-300 group"
              :class="i <= maxReachableStep ? 'cursor-pointer' : 'cursor-default opacity-30'"
            >
              <span
                class="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold transition-all duration-300 relative"
                :class="currentStep === i
                  ? 'text-white shadow-md scale-110'
                  : i < currentStep
                    ? 'text-white'
                    : 'text-text-muted bg-black/5 dark:bg-white/5'"
                :style="currentStep === i
                  ? { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 14px ${colored('--color-primary')}44` }
                  : i < currentStep
                    ? { background: `${colored('--color-primary')}99` }
                    : {}"
              >
                <span v-if="i < currentStep">&#10003;</span>
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="text-[10px] sm:text-[11px] font-semibold transition-colors duration-300" :class="currentStep === i ? 'text-text' : i < currentStep ? 'text-text/60' : 'text-text-muted'">
                {{ step.label }}
              </span>
            </button>
            <div v-if="i < steps.length - 1" class="w-5 sm:w-8 h-px mx-1 sm:mx-2 transition-colors duration-500" :class="i < currentStep ? 'bg-primary/50' : 'bg-black/8 dark:bg-white/8'" />
          </template>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="flex-shrink-0 h-[2px] bg-black/5 dark:bg-white/5 mt-2 sm:mt-3 mx-4 sm:mx-6 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500 ease-out" :style="{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: `linear-gradient(90deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -8)})` }" />
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
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
          <!-- ============ STEP 0: DAY SELECTION ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 0" key="step-0" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-4 sm:px-6 pt-3 sm:pt-5 pb-2 overflow-hidden">
                <div class="text-center mb-3 sm:mb-4 flex-shrink-0">
                  <p class="text-lg sm:text-xl font-extrabold text-text">Selecciona un día</p>
                  <p class="text-[11px] sm:text-xs text-text-muted mt-0.5">Elige la fecha para tu cita</p>
                </div>

                <!-- Month navigation -->
                <div class="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
                  <span class="text-xs sm:text-sm font-bold text-text">{{ currentMonthLabel }}</span>
                  <div class="flex items-center gap-1">
                    <button @click="goToday" class="rounded-lg border border-black/8 dark:border-white/8 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold text-text-muted hover:text-text hover:bg-black/3 dark:hover:bg-white/3 transition-all active:scale-[0.97]">
                      Hoy
                    </button>
                  </div>
                </div>

                <!-- Day cards: horizontal scroll on mobile, grid on desktop -->
                <div class="flex-1 overflow-y-auto -mx-1 px-1">
                  <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5 sm:gap-2">
                    <button
                      v-for="card in dayCards" :key="card.dateStr"
                      @click="selectDay(card.dateStr)"
                      :disabled="card.isPast"
                      class="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border py-2.5 sm:py-3 px-1 transition-all duration-200 text-center"
                      :class="card.isSelected
                        ? 'border-primary/60 shadow-md scale-[1.02]'
                        : card.isPast
                          ? 'border-transparent cursor-default opacity-25'
                          : 'border-black/6 dark:border-white/6 hover:border-primary/30 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] hover:shadow-sm active:scale-[0.97]'"
                      :style="card.isSelected ? { background: `${colored('--color-primary')}14`, boxShadow: `0 4px 18px ${colored('--color-primary')}22` } : {}"
                    >
                      <span
                        class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5"
                        :class="card.isSelected ? 'text-primary' : 'text-text-muted'"
                      >{{ card.dayName }}</span>
                      <span
                        class="text-base sm:text-lg font-extrabold leading-tight"
                        :class="card.isSelected ? 'text-primary' : card.isPast ? 'text-text-muted/40' : 'text-text'"
                      >{{ card.dayNumber }}</span>
                      <span
                        class="text-[8px] sm:text-[9px] font-medium mt-0.5"
                        :class="card.isSelected ? 'text-primary/70' : 'text-text-muted/50'"
                      >{{ card.monthName }}</span>
                      <div v-if="card.isToday && !card.isSelected" class="mt-1 h-1 w-1 rounded-full" :style="{ background: colored('--color-primary') }" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Continue button (only if date selected) -->
              <div class="flex-shrink-0 px-4 sm:px-6 pb-3 sm:pb-5 pt-1">
                <button
                  @click="currentStep = 1"
                  :disabled="!selectedDate"
                  class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }"
                >
                  <span>{{ formatDateLabel(selectedDate) }}</span>
                  <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 1: TIME SLOTS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 1" key="step-1" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-4 sm:px-6 pt-3 sm:pt-5 pb-2 overflow-y-auto">
                <!-- Back + date -->
                <button @click="currentStep = 0" class="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-text-muted hover:text-text transition-colors mb-2 sm:mb-3 flex-shrink-0">
                  <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  Cambiar día
                </button>

                <div class="text-center mb-3 flex-shrink-0">
                  <p class="text-lg sm:text-xl font-extrabold text-text">Horarios disponibles</p>
                  <p class="text-[11px] sm:text-xs text-text-muted mt-0.5">{{ formatDateLabel(selectedDate) }}</p>
                </div>

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
                    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                      <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <p class="text-sm font-semibold text-text mb-0.5">Sin horario disponible</p>
                    <p class="text-xs text-text-muted">{{ employeeName }} no atiende este día.</p>
                    <button @click="currentStep = 0" class="text-primary font-semibold text-xs hover:underline mt-2 inline-block">Elige otro día</button>
                  </div>
                </div>

                <!-- Time slots grid -->
                <div v-else class="flex-1">
                  <p class="text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">{{ freeSlots.length }} horario{{ freeSlots.length !== 1 ? 's' : '' }} disponible{{ freeSlots.length !== 1 ? 's' : '' }}</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    <button
                      v-for="slot in freeSlots" :key="slot.label"
                      @click="selectTimeSlot(slot)"
                      class="rounded-xl sm:rounded-2xl border py-3 sm:py-4 px-2 text-center transition-all duration-200 active:scale-[0.97]"
                      :class="pendingSlot === slot
                        ? 'border-primary/50 shadow-md'
                        : 'border-black/6 dark:border-white/6 hover:border-primary/30 hover:shadow-sm'"
                      :style="pendingSlot === slot
                        ? { background: `${colored('--color-primary')}16`, boxShadow: `0 4px 16px ${colored('--color-primary')}22` }
                        : {}"
                    >
                      <span
                        class="text-base sm:text-lg font-extrabold"
                        :class="pendingSlot === slot ? 'text-primary' : 'text-text'"
                      >{{ slot.label }}</span>
                      <p class="text-[9px] sm:text-[10px] text-text-muted mt-0.5">~{{ formatDuration(slot.availableMs / 60000) }} libres</p>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Continue button -->
              <div v-if="hasSchedule && freeSlots.length > 0" class="flex-shrink-0 px-4 sm:px-6 pb-3 sm:pb-5 pt-1">
                <button
                  @click="currentStep = 2"
                  :disabled="!pendingSlot"
                  class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }"
                >
                  <span v-if="pendingSlot">{{ formatSlotTime(pendingSlot) }} · Continuar</span>
                  <span v-else>Elige un horario</span>
                  <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 2: SERVICES ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 2" key="step-2" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-4 sm:px-6 pt-3 sm:pt-5 pb-2 overflow-y-auto">
                <!-- Back + info -->
                <button @click="currentStep = 1" class="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-text-muted hover:text-text transition-colors mb-2 sm:mb-3 flex-shrink-0">
                  <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  Cambiar horario
                </button>

                <div class="mb-2 sm:mb-3 flex-shrink-0">
                  <p class="text-lg sm:text-xl font-extrabold text-text text-center">Elige tus servicios</p>
                  <div class="flex items-center justify-center gap-2 mt-1 text-[10px] sm:text-[11px] text-text-muted">
                    <span>{{ formatDateLabel(selectedDate) }} · {{ pendingSlot ? formatSlotTime(pendingSlot) : '' }}</span>
                  </div>
                  <div class="flex items-center justify-center gap-1.5 mt-1.5">
                    <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="text-[10px] sm:text-[11px] font-medium" :class="durationExceedsAvailable ? 'text-danger' : 'text-text-muted'">
                      {{ formatDuration(availableMinutes) }} disponibles
                      <template v-if="chosenServices.length > 0">
                        · <span :class="durationExceedsAvailable ? 'text-danger font-bold' : ''">{{ formatDuration(totalSelectedDuration) }} seleccionados</span>
                        <span v-if="durationExceedsAvailable" class="text-danger font-bold"> (excede)</span>
                      </template>
                    </span>
                  </div>
                </div>

                <!-- No services that fit -->
                <div v-if="filterableServices.length === 0 && services?.length" class="flex-1 flex items-center justify-center text-center">
                  <div>
                    <p class="text-xs text-text-muted">Ningún servicio cabe en este espacio.</p>
                    <button @click="currentStep = 1" class="text-primary font-medium hover:underline mt-1.5 text-xs inline-block">Elige otro horario</button>
                  </div>
                </div>

                <!-- Service cards -->
                <div v-else class="flex-1 space-y-1.5 sm:space-y-2">
                  <button
                    v-for="svc in filterableServices" :key="svc.id"
                    @click="toggleService(svc)"
                    class="w-full rounded-lg sm:rounded-xl border p-2.5 sm:p-3 text-left transition-all duration-200 active:scale-[0.98] group flex items-center gap-2.5 sm:gap-3"
                    :class="isServiceSelected(svc)
                      ? 'border-primary/50 shadow-sm'
                      : 'border-black/6 dark:border-white/6 hover:border-primary/25 hover:shadow-sm'"
                    :style="isServiceSelected(svc) ? { background: `${colored('--color-primary')}0C`, boxShadow: `0 2px 12px ${colored('--color-primary')}15` } : {}"
                  >
                    <!-- Checkbox -->
                    <div
                      class="flex-shrink-0 h-5 w-5 sm:h-5 sm:w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
                      :class="isServiceSelected(svc) ? 'border-primary bg-primary' : 'border-black/15 dark:border-white/15 group-hover:border-primary/40'"
                    >
                      <svg v-if="isServiceSelected(svc)" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
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

              <!-- Bottom bar with total + continue -->
              <div v-if="chosenServices.length > 0" class="flex-shrink-0 px-4 sm:px-6 pb-3 sm:pb-5 pt-1">
                <div class="flex items-center justify-between mb-2 px-1">
                  <span class="text-[10px] sm:text-[11px] text-text-muted">{{ chosenServices.length }} servicio{{ chosenServices.length !== 1 ? 's' : '' }}</span>
                  <span class="text-sm sm:text-base font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
                </div>
                <button
                  @click="goToConfirmation"
                  :disabled="!canConfirm"
                  class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }"
                >
                  <span>Confirmar selección</span>
                  <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 3: CONFIRMATION ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 3" key="step-3" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 px-4 sm:px-6 pt-3 sm:pt-5 pb-2 overflow-y-auto">
                <div class="w-full max-w-md mx-auto space-y-3 sm:space-y-4">
                  <button @click="currentStep = 2" class="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-text-muted hover:text-text transition-colors">
                    <svg class="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    Cambiar servicios
                  </button>

                  <div>
                    <p class="text-base sm:text-lg font-bold text-text">Confirma tu reserva</p>
                    <p class="text-[10px] sm:text-xs text-text-muted">Revisa los detalles antes de enviar</p>
                  </div>

                  <!-- Summary card -->
                  <div class="rounded-xl sm:rounded-2xl border border-black/6 dark:border-white/6 overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
                    <div class="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-black/3 dark:border-white/3" :style="{ background: `${colored('--color-primary')}0D` }">
                      <p class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider" :style="{ color: `${colored('--color-primary')}cc` }">Detalle de la cita</p>
                    </div>
                    <div class="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                      <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                        <span class="text-[11px] sm:text-xs text-text-muted">Servicios</span>
                        <div class="text-right">
                          <p v-for="svc in chosenServices" :key="svc.id" class="text-[11px] sm:text-xs font-semibold text-text">{{ svc.name }} <span class="text-text-muted font-normal">({{ svc.duration_minutes }} min)</span></p>
                        </div>
                      </div>
                      <div class="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3">
                        <span class="text-[11px] sm:text-xs text-text-muted">Duración total</span>
                        <span class="text-[11px] sm:text-xs font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span>
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
                        <span class="text-base sm:text-lg font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Name input -->
                  <div>
                    <label class="block text-[10px] sm:text-[11px] font-semibold text-text mb-1 sm:mb-1.5 uppercase tracking-wider">
                      ¿Cómo te llamas? <span class="text-danger">*</span>
                    </label>
                    <input
                      v-model="clientName"
                      type="text"
                      placeholder="Escribe tu nombre completo"
                      maxlength="200"
                      @input="nameTouched = true"
                      class="w-full rounded-lg sm:rounded-xl border bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-text placeholder:text-text-muted/40 outline-none transition-all"
                      :class="nameTouched && !nameValid ? 'border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/10' : 'border-black/8 dark:border-white/8 focus:border-primary focus:ring-2 focus:ring-primary/10'"
                    />
                    <p v-if="nameTouched && !nameValid" class="text-[9px] sm:text-[10px] text-danger mt-1 flex items-center gap-1">
                      <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                      El nombre es obligatorio para continuar.
                    </p>
                    <p v-else class="text-[9px] sm:text-[10px] text-text-muted/60 mt-1 flex items-center gap-1">
                      <svg class="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Solo para identificar tu solicitud.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Submit button -->
              <div class="flex-shrink-0 px-4 sm:px-6 pb-3 sm:pb-5 pt-1">
                <div class="w-full max-w-md mx-auto">
                  <button
                    @click="submitRequest"
                    :disabled="submitting || !canSubmit"
                    class="w-full rounded-xl sm:rounded-2xl py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -12)})`, boxShadow: `0 8px 25px ${colored('--color-primary')}40` }"
                  >
                    <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {{ submitting ? 'Reservando...' : 'Confirmar reserva' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 4: SUCCESS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 4" key="step-4" class="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
              <div class="text-center max-w-xs">
                <div class="mx-auto mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full relative" :style="{ background: `${colored('--color-primary')}0F` }">
                  <svg class="h-7 w-7 sm:h-9 sm:w-9 success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: colored('--color-primary') }">
                    <path class="check-path" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div class="absolute inset-0 rounded-full border-2 success-ring" :style="{ borderColor: `${colored('--color-primary')}40` }" />
                </div>

                <h2 class="text-lg sm:text-xl font-extrabold text-text mb-1 sm:mb-1.5">¡Reserva enviada!</h2>
                <p class="text-[10px] sm:text-xs text-text-muted mb-1 leading-relaxed">
                  {{ employeeName }} recibirá tu solicitud para
                  <span class="font-semibold text-text">{{ chosenServices.map(s => s.name).join(', ') }}</span>
                  el {{ formatSlotRange(pendingSlot) }}.
                </p>
                <p class="text-[10px] sm:text-xs text-text-muted mb-3 sm:mb-4">
                  Duración total: <span class="font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span>
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

function toggleTheme() {
  themeStore.toggle()
}

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 30)
const maxDateStr = maxDate.toISOString().slice(0, 10)

const selectedDate = ref(todayStr)
const currentStep = ref(0)
const steps = [
  { label: 'Día' },
  { label: 'Horario' },
  { label: 'Servicios' },
  { label: 'Confirmar' },
  { label: 'Listo' },
]

function goToStep(step: number) {
  if (step <= maxReachableStep.value) {
    currentStep.value = step
  }
}

const maxReachableStep = computed(() => {
  if (currentStep.value === 4) return 4
  if (chosenServices.value.length > 0 && pendingSlot.value && clientName.value.trim()) return 3
  if (chosenServices.value.length > 0 && pendingSlot.value) return 2
  if (pendingSlot.value) return 1
  return 0
})

const currentMonthLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T12:00:00')
  return d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
})

const dayCards = computed(() => {
  const cards: Array<{ dateStr: string; dayName: string; dayNumber: number; monthName: string; isToday: boolean; isSelected: boolean; isPast: boolean }> = []
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    cards.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNumber: d.getDate(),
      monthName: monthNames[d.getMonth()],
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate.value,
      isPast: dateStr < todayStr,
    })
  }
  return cards
})

const startHour = 7
const endHour = 21
const slotHeight = ref(52)
const totalHeight = computed(() => (endHour - startHour) * slotHeight.value)

function updateSlotHeight() {
  slotHeight.value = window.innerWidth >= 768 ? 40 : 54
}

onMounted(() => {
  updateSlotHeight()
  window.addEventListener('resize', updateSlotHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSlotHeight)
})

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
  enabled: computed(() => !!presetEmployeeId.value && !!business.value && currentStep.value >= 1),
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
  return Math.max(0, (mins / 60) * slotHeight.value)
}
function heightForRange(startIso: string, endIso: string): number {
  return Math.max(topForTime(endIso) - topForTime(startIso), 12)
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
const chosenServices = ref<PublicService[]>([])
const submitting = ref(false)
const clientName = ref('')
const nameTouched = ref(false)

const availableMinutes = computed(() => {
  if (!pendingSlot.value) return 0
  return Math.floor(pendingSlot.value.availableMs / 60000)
})

const totalSelectedDuration = computed(() =>
  chosenServices.value.reduce((sum, s) => sum + s.duration_minutes, 0)
)
const totalSelectedPrice = computed(() =>
  chosenServices.value.reduce((sum, s) => sum + s.price, 0)
)
const durationExceedsAvailable = computed(() =>
  chosenServices.value.length > 0 && totalSelectedDuration.value > availableMinutes.value
)
const canConfirm = computed(() =>
  chosenServices.value.length > 0 && !durationExceedsAvailable.value
)
const nameValid = computed(() => clientName.value.trim().length > 0)
const canSubmit = computed(() => nameValid.value)

function selectDay(dateStr: string) {
  selectedDate.value = dateStr
  pendingSlot.value = null
  chosenServices.value = []
  currentStep.value = 1
}

function selectTimeSlot(slot: FreeSlot) {
  pendingSlot.value = slot
  const slotMins = Math.floor(slot.availableMs / 60000)
  if (totalSelectedDuration.value > slotMins) {
    chosenServices.value = []
  }
}

function isServiceSelected(svc: PublicService): boolean {
  return chosenServices.value.some(s => s.id === svc.id)
}

function toggleService(svc: PublicService) {
  if (isServiceSelected(svc)) {
    chosenServices.value = chosenServices.value.filter(s => s.id !== svc.id)
  } else {
    const prospective = [...chosenServices.value, svc]
    const total = prospective.reduce((sum, s) => sum + s.duration_minutes, 0)
    const maxMins = pendingSlot.value ? Math.floor(pendingSlot.value.availableMs / 60000) : 0
    if (total <= maxMins) {
      chosenServices.value = [...chosenServices.value, svc]
    }
  }
}

function goToConfirmation() {
  if (canConfirm.value) {
    nameTouched.value = false
    currentStep.value = 3
  }
}

const filterableServices = computed(() => {
  return ((services.value ?? []) as PublicService[])
})

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
  if (minutes < 60) return `${Math.floor(minutes)} min`
  const h = Math.floor(minutes / 60); const m = Math.floor(minutes % 60)
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
  if (chosenServices.value.length === 0 || !pendingSlot.value || !presetEmployeeId.value) return
  if (!nameValid.value) {
    nameTouched.value = true
    return
  }
  submitting.value = true
  try {
    await submitBookingRequest(slug.value, {
      employee_id: presetEmployeeId.value,
      service_ids: chosenServices.value.map(s => s.id),
      start_time: pendingSlot.value.start,
      client_name: clientName.value.trim(),
    })
    currentStep.value = 4
  } catch {
    alert('Este horario ya no está disponible. Por favor elige otro.')
    currentStep.value = 0
  } finally {
    submitting.value = false
  }
}

function goToday() {
  selectedDate.value = todayStr
  pendingSlot.value = null
  chosenServices.value = []
}
</script>

<style scoped>
.step-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
}
.step-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
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
