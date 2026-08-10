<template>
  <div class="relative flex min-h-dvh w-full items-center overflow-hidden bg-bg-secondary" :style="cssVars">
    <!-- Full-bleed background image, faded out toward the form side -->
    <div
      class="booking-image pointer-events-none absolute inset-0"
      :style="{ '--booking-image': `url('${leafBackground}')` }"
      aria-hidden="true"
    />

    <!-- Content area -->
    <div class="booking-content relative z-10 flex w-full flex-col px-4 py-6 sm:px-8 sm:py-8 lg:w-[480px] lg:px-0 lg:py-6 lg:ml-[6vw] xl:w-[560px] xl:ml-[8vw] 2xl:w-[600px] 2xl:ml-[10vw]">
      <!-- Header: Logo + business name + theme toggle + employee -->
      <div class="flex items-center justify-between gap-3 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <img :src="logo" alt="Luma" class="h-8 w-auto object-contain sm:h-10" />
          <span v-if="business?.name" class="text-[11px] sm:text-xs font-semibold text-text-muted truncate">{{ business.name }}</span>
        </div>
        <button
          @click="toggleTheme"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted hover:text-text hover:border-border-strong transition-all active:scale-95 bg-transparent flex-shrink-0"
          :aria-label="isDarkEffective ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <svg v-if="!isDarkEffective" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>
        </button>
      </div>

      <!-- Employee line -->
      <div v-if="employeeName" class="flex items-center gap-2.5 mt-4 mb-1 flex-shrink-0">
        <div class="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">
          {{ getInitials(employeeName) }}
        </div>
        <p class="text-sm font-semibold text-text truncate">Agenda con {{ employeeName }}</p>
      </div>

      <!-- Step indicators -->
      <div class="flex items-center justify-center gap-0 mt-4 sm:mt-5 mb-2 flex-shrink-0">
        <template v-for="(step, i) in steps" :key="i">
          <button
            @click="goToStep(i)"
            :disabled="i > maxReachableStep"
            class="flex items-center gap-1.5 transition-all duration-300"
            :class="i <= maxReachableStep ? 'cursor-pointer' : 'cursor-default opacity-30'"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300"
              :class="currentStep === i
                ? 'text-white shadow-md scale-110'
                : i < currentStep
                  ? 'text-white'
                  : 'text-text-muted bg-surface-muted'"
              :style="currentStep === i
                ? { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 14px ${colored('--color-primary')}44` }
                : i < currentStep
                  ? { background: `${colored('--color-primary')}99` }
                  : {}"
            >
              <span v-if="i < currentStep">&#10003;</span>
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="text-[10px] sm:text-[11px] font-semibold transition-colors hidden sm:inline" :class="currentStep === i ? 'text-text' : i < currentStep ? 'text-text-secondary' : 'text-text-muted'">
              {{ step.label }}
            </span>
          </button>
          <div v-if="i < steps.length - 1" class="w-5 sm:w-6 h-px mx-0.5 sm:mx-1 transition-colors duration-500" :class="i < currentStep ? 'bg-primary/50' : 'bg-border'" />
        </template>
      </div>

      <!-- LOADING / ERROR / DISABLED -->
      <div v-if="loadingBusiness" class="flex-1 flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <div class="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p class="text-xs text-text-muted">Cargando...</p>
        </div>
      </div>
      <div v-else-if="businessError" class="flex-1 flex items-center justify-center text-center py-12">
        <div>
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-light">
            <svg class="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          </div>
          <p class="text-sm font-semibold text-text mb-1">Negocio no encontrado</p>
          <p class="text-xs text-text-muted">Verifica el enlace o contacta a quien te lo envió.</p>
        </div>
      </div>
      <div v-else-if="!publicBookingEnabled" class="flex-1 flex items-center justify-center text-center py-12">
        <div>
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-light">
            <svg class="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          </div>
          <p class="text-sm font-semibold text-text mb-1">Reservas no disponibles</p>
          <p class="text-xs text-text-muted">Este negocio no acepta reservas públicas en este momento.</p>
        </div>
      </div>

      <!-- Content card + floating button -->
      <div v-else class="flex-1 flex flex-col min-h-0 relative mt-2">
        <!-- Card -->
        <div class="flex-1 flex flex-col min-h-0 rounded-2xl border border-border bg-surface/80 backdrop-blur-sm shadow-sm overflow-hidden relative">
          <!-- ============ STEP 0: DAY SELECTION ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 0" key="step-0" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-1 overflow-hidden">
                <p class="text-sm font-semibold text-text-secondary text-center mb-2">Selecciona un día para tu cita</p>

                <!-- Month navigation -->
                <div class="flex items-center justify-between mb-1.5 flex-shrink-0">
                  <button @click="prevMonth" :disabled="!canGoPrevMonth" class="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted hover:text-text hover:border-border-strong transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span class="text-sm font-bold text-text capitalize">{{ calendarMonthLabel }}</span>
                  <button @click="nextMonth" :disabled="!canGoNextMonth" class="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted hover:text-text hover:border-border-strong transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>

                <!-- Day-of-week headers -->
                <div class="grid grid-cols-7 mb-0.5 flex-shrink-0">
                  <span v-for="dow in dayOfWeekHeaders" :key="dow" class="text-center text-[9px] font-bold text-text-muted/50 uppercase tracking-wider py-0.5">{{ dow }}</span>
                </div>

                <!-- Calendar grid -->
                <div class="flex-1 grid grid-cols-7 auto-rows-fr gap-0.5">
                  <button
                    v-for="(cell, ci) in calendarCells" :key="ci"
                    @click="cell.selectable ? selectDay(cell.dateStr) : undefined"
                    :disabled="!cell.selectable"
                    class="relative flex items-center justify-center rounded-lg transition-all duration-200"
                    :class="cell.isSelected
                      ? 'text-white shadow-md scale-105 z-10'
                      : cell.isToday
                        ? 'font-extrabold'
                        : cell.isOtherMonth || !cell.selectable
                          ? 'cursor-default'
                          : 'hover:bg-surface-muted active:scale-95'"
                    :style="cell.isSelected
                      ? { background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -10)})`, boxShadow: `0 4px 14px ${colored('--color-primary')}44` }
                      : cell.isToday
                        ? { boxShadow: `inset 0 0 0 2px ${colored('--color-primary')}` }
                        : {}"
                  >
                    <span
                      class="text-xs font-semibold"
                      :class="cell.isSelected
                        ? 'text-white'
                        : cell.isOtherMonth || !cell.selectable
                          ? 'text-text-muted/20'
                          : cell.isToday
                            ? 'text-primary'
                            : 'text-text'"
                    >{{ cell.dayNumber }}</span>
                  </button>
                </div>
              </div>

              <!-- Selected date preview -->
              <div v-if="selectedDate !== todayStr" class="flex-shrink-0 px-4 py-2 border-t border-border-subtle text-center">
                <span class="text-[11px] text-text-muted">{{ formatDateLabel(selectedDate) }}</span>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 1: TIME SLOTS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 1" key="step-1" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-1 overflow-y-auto">
                <button @click="currentStep = 0" class="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text transition-colors mb-1.5 flex-shrink-0">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  {{ formatDateLabel(selectedDate) }}
                </button>

                <p class="text-sm font-semibold text-text-secondary mb-2 flex-shrink-0">Elige un horario</p>

                <!-- Loading -->
                <div v-if="loadingCalendar" class="flex-1 flex items-center justify-center">
                  <div class="flex flex-col items-center gap-3">
                    <div class="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p class="text-xs text-text-muted">Cargando disponibilidad...</p>
                  </div>
                </div>

                <!-- No schedule -->
                <div v-else-if="!hasSchedule" class="flex-1 flex items-center justify-center">
                  <div class="text-center">
                    <p class="text-sm font-semibold text-text mb-1">Sin horario disponible</p>
                    <p class="text-xs text-text-muted">{{ employeeName }} no atiende este día.</p>
                    <button @click="currentStep = 0" class="text-primary font-semibold text-xs hover:underline mt-2 inline-block">Elige otro día</button>
                  </div>
                </div>

                <!-- Time slots as compact chips -->
                <div v-else class="flex-1 overflow-y-auto">
                  <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{{ freeSlots.length }} disponible{{ freeSlots.length !== 1 ? 's' : '' }}</p>
                  <div class="flex flex-wrap gap-1.5 content-start">
                    <button
                      v-for="slot in freeSlots" :key="slot.label"
                      @click="selectTimeSlot(slot)"
                      class="rounded-lg border px-3 py-2 text-center transition-all duration-200 active:scale-95"
                      :class="pendingSlot === slot
                        ? 'border-primary/60 shadow-sm'
                        : 'border-border hover:border-primary/30 hover:bg-surface-muted'"
                      :style="pendingSlot === slot
                        ? { background: `${colored('--color-primary')}14`, boxShadow: `0 2px 10px ${colored('--color-primary')}18` }
                        : {}"
                    >
                      <span
                        class="text-sm font-bold"
                        :class="pendingSlot === slot ? 'text-primary' : 'text-text'"
                      >{{ slot.label }}</span>
                      <p class="text-[9px] text-text-muted mt-0.5">~{{ formatDuration(slot.availableMs / 60000) }}</p>
                    </button>
                  </div>
                  <p v-if="freeSlots.length === 0" class="text-xs text-text-muted text-center py-6">No hay horarios libres este día.</p>
                </div>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 2: SERVICES ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 2" key="step-2" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-1 overflow-y-auto">
                <button @click="currentStep = 1" class="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text transition-colors mb-1.5 flex-shrink-0">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  {{ formatDateLabel(selectedDate) }} · {{ pendingSlot ? formatSlotTime(pendingSlot) : '' }}
                </button>

                <div class="flex items-center justify-between mb-2 flex-shrink-0">
                  <p class="text-sm font-semibold text-text-secondary">Elige tus servicios</p>
                  <span class="text-[10px] font-medium" :class="durationExceedsAvailable ? 'text-danger' : 'text-text-muted'">
                    <svg class="h-3 w-3 inline mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ formatDuration(availableMinutes) }}
                  </span>
                </div>

                <div v-if="(services ?? []).length === 0" class="flex-1 flex items-center justify-center">
                  <p class="text-xs text-text-muted">No hay servicios disponibles.</p>
                </div>

                <!-- Service cards with checkboxes -->
                <div v-else class="flex-1 overflow-y-auto space-y-1">
                  <button
                    v-for="svc in (services ?? [])" :key="svc.id"
                    @click="toggleService(svc)"
                    class="w-full rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-[0.98] flex items-center gap-2.5"
                    :class="isServiceSelected(svc)
                      ? 'border-primary/50 shadow-sm'
                      : 'border-border hover:border-primary/25 hover:bg-surface-muted'"
                    :style="isServiceSelected(svc) ? { background: `${colored('--color-primary')}0A`, boxShadow: `0 2px 10px ${colored('--color-primary')}12` } : {}"
                  >
                    <div
                      class="flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-200"
                      :class="isServiceSelected(svc) ? 'border-primary bg-primary' : 'border-border-strong'"
                    >
                      <svg v-if="isServiceSelected(svc)" class="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-semibold text-text truncate">{{ svc.name }}</p>
                        <p class="text-[10px] text-text-muted">{{ svc.duration_minutes }} min</p>
                      </div>
                      <p class="text-sm font-extrabold text-text flex-shrink-0">${{ svc.price.toFixed(0) }}</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Selection summary bar -->
              <div v-if="chosenServices.length > 0" class="flex-shrink-0 px-4 py-2 border-t border-border-subtle flex items-center justify-between">
                <span class="text-[11px] text-text-muted">{{ chosenServices.length }} seleccionado{{ chosenServices.length !== 1 ? 's' : '' }} · {{ formatDuration(totalSelectedDuration) }}</span>
                <span class="text-sm font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 3: CONFIRMATION ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 3" key="step-3" class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div class="flex-1 overflow-y-auto px-4 pt-3 pb-1">
                <button @click="currentStep = 2" class="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text transition-colors mb-2">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  Cambiar servicios
                </button>

                <p class="text-base font-bold text-text mb-0.5">Confirma tu reserva</p>
                <p class="text-xs text-text-muted mb-3">Revisa los detalles antes de enviar</p>

                <!-- Summary -->
                <div class="rounded-xl border border-border overflow-hidden bg-surface-muted/50 mb-3">
                  <div class="px-4 py-2.5 border-b border-border-subtle" :style="{ background: `${colored('--color-primary')}0A` }">
                    <p class="text-[10px] font-semibold uppercase tracking-wider" :style="{ color: `${colored('--color-primary')}99` }">Detalle de la cita</p>
                  </div>
                  <div class="divide-y divide-border-subtle">
                    <div class="flex items-center justify-between px-4 py-2">
                      <span class="text-[11px] text-text-muted">Servicios</span>
                      <div class="text-right">
                        <p v-for="svc in chosenServices" :key="svc.id" class="text-[11px] font-semibold text-text">{{ svc.name }} <span class="text-text-muted font-normal">({{ svc.duration_minutes }} min)</span></p>
                      </div>
                    </div>
                    <div class="flex items-center justify-between px-4 py-2">
                      <span class="text-[11px] text-text-muted">Duración</span>
                      <span class="text-[11px] font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span>
                    </div>
                    <div class="flex items-center justify-between px-4 py-2">
                      <span class="text-[11px] text-text-muted">Día y hora</span>
                      <span class="text-[11px] font-semibold text-text">{{ formatSlotRange(pendingSlot) }}</span>
                    </div>
                    <div class="flex items-center justify-between px-4 py-2">
                      <span class="text-[11px] text-text-muted">Profesional</span>
                      <span class="text-[11px] font-semibold text-text flex items-center gap-1">
                        <span class="inline-flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white" :style="{ background: `linear-gradient(135deg, ${colored('--color-primary')}, ${adjustHex(colored('--color-primary'), -15)})` }">{{ getInitials(employeeName) }}</span>
                        {{ employeeName }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between px-4 py-2" :style="{ background: `${colored('--color-primary')}06` }">
                      <span class="text-[11px] font-semibold text-text">Total</span>
                      <span class="text-base font-extrabold" :style="{ color: colored('--color-primary') }">${{ totalSelectedPrice.toFixed(0) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Name input -->
                <div>
                  <label class="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    ¿Cómo te llamas? <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="clientName"
                    type="text"
                    placeholder="Escribe tu nombre completo"
                    maxlength="200"
                    @input="nameTouched = true"
                    class="w-full rounded-2xl border bg-surface/80 py-2.5 px-4 text-sm text-text outline-none backdrop-blur-sm transition-theme placeholder:text-text-muted/60"
                    :class="nameTouched && !nameValid ? 'border-danger/50 focus:border-danger focus:ring-4 focus:ring-danger/10' : 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'"
                  />
                  <p v-if="nameTouched && !nameValid" class="text-[10px] text-danger mt-1 flex items-center gap-1">
                    <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                    El nombre es obligatorio.
                  </p>
                  <p v-else class="text-[10px] text-text-muted/50 mt-1">Solo para identificar tu solicitud.</p>
                </div>
              </div>
            </div>
          </Transition>

          <!-- ============ STEP 4: SUCCESS ============ -->
          <Transition name="step-slide" mode="out-in">
            <div v-if="currentStep === 4" key="step-4" class="flex-1 flex items-center justify-center px-4 py-6 overflow-y-auto">
              <div class="text-center max-w-xs">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full relative" :style="{ background: `${colored('--color-primary')}0D` }">
                  <svg class="h-7 w-7 success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: colored('--color-primary') }">
                    <path class="check-path" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div class="absolute inset-0 rounded-full border-2 success-ring" :style="{ borderColor: `${colored('--color-primary')}40` }" />
                </div>
                <h2 class="text-lg font-extrabold text-text mb-1">¡Reserva enviada!</h2>
                <p class="text-xs text-text-muted mb-1 leading-relaxed">
                  {{ employeeName }} recibirá tu solicitud para
                  <span class="font-semibold text-text">{{ chosenServices.map(s => s.name).join(', ') }}</span>
                  el {{ formatSlotRange(pendingSlot) }}.
                </p>
                <p class="text-xs text-text-muted mb-3">Duración: <span class="font-semibold text-text">{{ formatDuration(totalSelectedDuration) }}</span></p>
                <p class="text-[10px] text-text-muted/40">Gracias por tu reserva.</p>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Floating continue button -->
        <button
          v-if="showFloatingButton"
          @click="handleFloatingAction"
          class="floating-btn absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full bg-text px-4 py-2.5 text-xs sm:text-sm font-semibold text-text-inverse shadow-lg shadow-text/10 transition-all hover:opacity-90 active:scale-95"
        >
          <span>{{ floatingButtonLabel }}</span>
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- Footer -->
      <div class="border-t border-border-subtle pt-3 mt-auto flex-shrink-0" v-if="business && publicBookingEnabled && currentStep !== 4">
        <p class="text-[10px] text-text-muted/60">Tus datos serán enviados a {{ business.name || 'nuestro equipo' }}.</p>
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
const calendarMonthLabel = computed(() => {
  return calendarMonth.value.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
})

const dayOfWeekHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalendarCell {
  dateStr: string
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  isOtherMonth: boolean
  selectable: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7

  const cells: CalendarCell[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i > 0; i--) {
    const d = prevMonthLastDay - i + 1
    const dateStr = `${year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateStr, dayNumber: d, isToday: false, isSelected: false, isOtherMonth: true, selectable: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isPast = dateStr < todayStr
    const isBeyondMax = dateStr > maxCalendarDateStr
    cells.push({
      dateStr,
      dayNumber: d,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate.value,
      isOtherMonth: false,
      selectable: !isPast && !isBeyondMax,
    })
  }

  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ dateStr: '', dayNumber: d, isToday: false, isSelected: false, isOtherMonth: true, selectable: false })
    }
  }

  return cells
})

function prevMonth() {
  if (canGoPrevMonth.value) {
    calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1)
  }
}
function nextMonth() {
  if (canGoNextMonth.value) {
    calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
  }
}

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

const showFloatingButton = computed(() => {
  if (currentStep.value === 4) return false
  if (currentStep.value === 0) return !!selectedDate.value && selectedDate.value !== todayStr
  if (currentStep.value === 1) return !!pendingSlot.value
  if (currentStep.value === 2) return canConfirm.value
  if (currentStep.value === 3) return canSubmit.value
  return false
})

const floatingButtonLabel = computed(() => {
  if (currentStep.value === 0) return 'Continuar'
  if (currentStep.value === 1) return 'Continuar'
  if (currentStep.value === 2) return 'Confirmar servicios'
  if (currentStep.value === 3) return submitting.value ? 'Reservando...' : 'Confirmar reserva'
  return 'Continuar'
})

function handleFloatingAction() {
  if (currentStep.value === 3) {
    submitRequest()
  } else {
    currentStep.value = Math.min(currentStep.value + 1, 3)
  }
}

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
  calendarMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = todayStr
  pendingSlot.value = null
  chosenServices.value = []
}
</script>

<style scoped>
.booking-image {
  background-image: var(--booking-image);
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 12%,
    rgba(0, 0, 0, 0.4) 28%,
    rgba(0, 0, 0, 0.85) 42%,
    #000 50%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    transparent 12%,
    rgba(0, 0, 0, 0.4) 28%,
    rgba(0, 0, 0, 0.85) 42%,
    #000 50%
  );
}

@media (max-width: 1023px) {
  .booking-image {
    -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.65) 55%, #000 100%);
    mask-image: linear-gradient(to right, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.65) 55%, #000 100%);
    opacity: 0.75;
  }
  .booking-content {
    max-width: 100%;
  }
}

@media (max-width: 639px) {
  .booking-image {
    opacity: 0.6;
  }
}

.dark .booking-image {
  filter: brightness(0.55) saturate(0.85);
}

.step-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-slide-leave-active {
  transition: all 0.18s cubic-bezier(0.4, 0, 1, 1);
  position: absolute;
}
.step-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.step-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.floating-btn {
  animation: float-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes float-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
