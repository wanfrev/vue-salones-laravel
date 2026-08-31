<template>
  <div class="flex h-full flex-col gap-2 sm:gap-3">
    <!-- Panel de Filtros -->
    <div
      class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2 sm:rounded-xl sm:p-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
        <div v-if="isAdmin" class="flex items-center gap-2">
          <div class="relative flex-1 min-w-0 sm:flex-none">
            <button @click="empDropdownOpen = !empDropdownOpen"
              class="flex items-center gap-2 w-full rounded-lg border border-border bg-surface pl-2.5 pr-3 py-1.5 text-sm font-medium text-text outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-auto"
              :disabled="loadingEmployees">
              <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
                {{ selectedEmployeeName ? getInitials(selectedEmployeeName) : '✦' }}
              </div>
              <span class="truncate max-w-[120px] sm:max-w-[160px]">{{ selectedEmployeeName || 'Todos' }}</span>
              <svg class="h-3.5 w-3.5 flex-shrink-0 text-text-muted transition-transform" :class="{ 'rotate-180': empDropdownOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
              <div v-if="empDropdownOpen" class="absolute left-0 top-full z-50 mt-1.5 w-[min(16rem,92vw)] rounded-xl border border-border bg-surface p-1.5 shadow-xl" @click.stop>
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
            @focus="searchDropdownOpen = true" @blur="searchDropdownOpen = false"
            class="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div v-if="searchDropdownOpen && globalSearchEnabled"
            class="absolute left-0 top-full z-50 mt-1.5 w-[min(20rem,92vw)] max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl">
            <div v-if="globalSearchLoading" class="px-3 py-2 text-xs text-text-muted">Buscando...</div>
            <div v-else-if="!globalSearchRows.length" class="px-3 py-2 text-xs text-text-muted">Sin citas para "{{ debouncedSearch }}"</div>
            <button v-for="r in globalSearchRows" :key="r.id" type="button"
              @mousedown.prevent="selectGlobalResult(r.raw)"
              class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg-secondary">
              <div class="min-w-0">
                <p class="truncate font-medium text-text">{{ r.clientName }}</p>
                <p class="truncate text-xs text-text-muted">{{ r.serviceName }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-xs font-semibold text-text">{{ r.dateLabel }}</p>
                <p class="text-[11px] text-text-muted">{{ r.time }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <ShareLinkButton :employees="shareLinkEmployees" />
        <span v-for="l in legend" :key="l.label" class="flex items-center gap-1 rounded-md px-1.5 py-0.5">
          <span class="h-2 w-2 rounded-full" :style="{ background: l.color }"></span>
          <span class="text-[10px] font-medium text-text-muted sm:text-[11px]">{{ l.label }}</span>
        </span>
      </div>
    </div>

    <!-- Mobile: switch to list when too many columns in day/week -->
    <div
      v-if="(viewMode === 'day' || viewMode === 'week') && gridColumns.length > 3 && windowWidth < 640"
      class="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary-light p-2 text-xs text-primary"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="font-medium">Vista de columna comprimida. Usa “Mes” o gira el teléfono para ver más detalle.</span>
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
              v.shortLabel }}</button>
        </div>
        <div class="relative">
          <button @click="occupancyOpen = !occupancyOpen"
            class="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong"
            :class="{ 'border-primary/40 text-primary bg-primary-light/40': occupancyOpen }">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span class="hidden sm:inline">Disponibilidad</span>
          </button>
          <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
            <div v-if="occupancyOpen"
              class="absolute right-0 top-full z-50 mt-1.5 w-[min(20rem,92vw)] max-h-96 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-xl" @click.stop>
              <p class="px-2 py-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wide">{{ selectedDayLabel }}</p>
              <div v-if="!occupancyRows.length" class="px-2 py-3 text-xs text-text-muted">Sin empleados para mostrar.</div>
              <div v-for="row in occupancyRows" :key="row.id" class="px-2 py-2 border-b border-border-subtle last:border-b-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-sm font-semibold text-text truncate">{{ row.name }}</span>
                  <span class="shrink-0 text-xs font-bold"
                    :class="row.pctBooked >= 80 ? 'text-danger' : row.pctBooked >= 50 ? 'text-warning' : 'text-success'">{{ row.pctBooked }}% ocupado</span>
                </div>
                <div class="h-1.5 rounded-full bg-bg-secondary overflow-hidden mb-1.5">
                  <div class="h-full rounded-full transition-all"
                    :class="row.pctBooked >= 80 ? 'bg-danger' : row.pctBooked >= 50 ? 'bg-warning' : 'bg-success'"
                    :style="{ width: `${Math.min(100, row.pctBooked)}%` }" />
                </div>
                <div v-if="row.gaps.length" class="flex flex-wrap gap-1">
                  <span v-for="(g, i) in row.gaps" :key="i"
                    class="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">{{ g.label }}</span>
                </div>
                <p v-else class="text-[10px] text-text-muted italic">Sin huecos libres</p>
              </div>
            </div>
          </Transition>
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
    <div v-else class="flex-1 overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl" :style="gridMinWidth ? { overflowX: 'auto' } : {}">
  <div class="h-full overflow-auto" ref="gridContainer">
         <div class="relative" :style="{ minHeight: `${totalGridHeight}px`, minWidth: gridMinWidth ? `${gridMinWidth}px` : undefined }">
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
                  v-memo="[appt.id, appt.status, appt.top, appt.height, appt.left, appt.width, dragState?.apptId === appt.id ? dragState.previewTop : null]"
                  class="absolute rounded-lg overflow-hidden hover:z-10 group"
                  :class="[cardBgClass(appt.status), dragState?.apptId === appt.id && dragState.moved ? 'ring-2 ring-primary shadow-2xl z-30 cursor-grabbing' : 'transition-all duration-150 hover:scale-[1.02]', isDraggable(appt) ? (dragState?.apptId === appt.id ? '' : 'cursor-grab') : 'cursor-pointer']"
                  :style="{ top: `${dragState?.apptId === appt.id ? dragState.previewTop : appt.top}px`, height: `${Math.max(appt.height - 2, 80)}px`, left: `calc(${appt.left}% + 2px)`, width: `calc(${appt.width}% - 4px)` }"
                  :title="`${appt.clientName} · ${appt.service} · ${appt.employeeName}\n${appt.time} · ${getStatusLabel(appt.status)}`"
                  @pointerdown="onCardPointerDown(appt, col, $event)"
                  @click.stop="showDetailPopup(appt, $event)"
                  @contextmenu.prevent="toggleStatusMenu(appt, $event)">
                  <div class="absolute left-0 top-0 bottom-0 w-[3px] sm:w-[4px]"
                    :class="statusStripeClass(appt.status)" />
                  <div class="flex flex-col h-full px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs leading-tight">
                    <div class="flex items-center justify-between gap-1 min-w-0">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span
                          class="text-[11px] font-semibold text-text-muted tabular-nums whitespace-nowrap sm:text-xs">{{
                          dragState?.apptId === appt.id && dragState.moved ? dragPreviewLabel() : appt.time }}</span>
                        <span class="h-2 w-2 rounded-full flex-shrink-0"
                          :class="statusDotClass(appt.status)" />
                        <span v-if="appt.employeeInitials"
                          class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-black/5"
                          :style="{ background: appt.employeeColor }">{{ appt.employeeInitials }}</span>
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
                    <div v-if="appt.petName" class="text-[10px] text-primary/80 font-medium truncate sm:text-[11px] leading-tight mt-0.5">{{ appt.petName }}</div>
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
        class="fixed z-[100] rounded-xl border border-border bg-surface shadow-2xl p-4 w-[min(18rem,calc(100vw-2rem))] animate-in fade-in zoom-in-95 duration-100"
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
import { useQuery } from '@tanstack/vue-query'
import { useAgenda } from '../../composables/agenda/useAgenda'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole } from '../../constants/roles'
import { normalizeAppointmentStatus, getStatusLabel, dateToHHmm, dateToHHmm12, toISODate, getInitials, parseLocalDate } from '../../lib/formatters'
import { mapAppointmentToCita } from '../../mappers/agendaMapper'
import { searchAppointmentsGlobal } from '../../services/agendaService'
import ShareLinkButton from './ShareLinkButton.vue'
import AgendaMonthView from './AgendaMonthView.vue'
import AgendaYearView from './AgendaYearView.vue'
import type { Cita } from '../../types/cita'

const route = useRoute()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))
const businessId = computed(() => authStore.businessId)
const currentBranchId = computed(() => businessStore.currentBranchId)

const props = defineProps<{
  initialDate?: string
}>()

const emit = defineEmits<{
  eventClick: [event: { id: string; title: string; start: Date; end: Date; status?: string; citaData?: Omit<Cita, 'paymentStatus' | 'statusLabel' | 'statusColor'> }]
  statusChange: [payload: { id: string; status: 'pending' | 'confirmed' | 'paid' }]
  eventChange: [payload: { id: string; start: string; end: string; employeeId?: string }]
  slotSelect: [payload: { start: Date; end: Date; employeeId?: string }]
  checkout: [appointmentId: string]
  delete: [id: string]
}>()

const { selectedEmployeeId, setDateRange, employees, loadingEmployees, services, appointments, appointmentsError, schedules } = useAgenda()

const shareLinkEmployees = computed(() =>
  (employees.value ?? [])
    .filter((e: any) => e.show_in_public_booking !== false)
    .map((e: any) => ({ id: e.id, label: e.full_name }))
)

const serviceMap = computed(() => new Map((services.value ?? []).map((s: any) => [s.id, s])))
const employeeMap = computed(() => new Map((employees.value ?? []).map((e: any) => [e.id, e])))

// One consistent color per employee (assigned by list order, not a hash, so two
// employees never collide onto the same color while the palette has room) — used
// for the avatar badge on appointment cards so you can tell who's who at a glance
// without reading the name, independent of the status color (border/dot).
const EMPLOYEE_COLOR_PALETTE = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6',
  '#f43f5e', '#14b8a6', '#f97316', '#3b82f6', '#84cc16', '#a855f7',
]
const DEFAULT_EMPLOYEE_COLOR = '#71717a'
const employeeColorMap = computed(() => {
  const map = new Map<string, string>()
  ;(employees.value ?? []).forEach((e: any, i: number) => {
    map.set(e.id, EMPLOYEE_COLOR_PALETTE[i % EMPLOYEE_COLOR_PALETTE.length])
  })
  return map
})

// Una cita de grupo (varios servicios reservados en la misma visita) comparte
// group_id entre varias filas de `appointments` — se juntan en un solo resultado
// del dropdown en vez de mostrar cada servicio como si fuera una cita aparte,
// igual que ya hace la grilla del calendario (buildDisplayAppointments).
const globalSearchRows = computed(() => {
  const raws = globalSearchResults.value ?? []
  const rows: { raw: any; id: string; clientName: string; serviceName: string; dateLabel: string; time: string }[] = []
  const groupRowIndex = new Map<string, number>()
  const groupServiceNames = new Map<string, string[]>()

  for (const a of raws as any[]) {
    const serviceName = serviceMap.value.get(a.service_id)?.name || 'Servicio'
    if (a.group_id && groupRowIndex.has(a.group_id)) {
      const idx = groupRowIndex.get(a.group_id)!
      const names = groupServiceNames.get(a.group_id)!
      names.push(serviceName)
      rows[idx].serviceName = `${names[0]} +${names.length - 1} más`
      continue
    }
    const start = new Date(a.start_time)
    rows.push({
      raw: a,
      id: a.id,
      clientName: a.client?.full_name || a.clients?.full_name || 'Cliente',
      serviceName,
      dateLabel: start.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }),
      time: dateToHHmm12(start),
    })
    if (a.group_id) {
      groupRowIndex.set(a.group_id, rows.length - 1)
      groupServiceNames.set(a.group_id, [serviceName])
    }
  }
  return rows
})

// ---- Constants ----
const START_HOUR = 7
const END_HOUR = 21
const HOUR_HEIGHT = 160
const TIME_COL_WIDTH = 40
const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT
const totalHours = END_HOUR - START_HOUR

const legend = [
  { label: 'Pendiente', color: 'var(--color-danger)' },
  { label: 'Confirmada', color: 'var(--color-warning)' },
  { label: 'Pagada', color: 'var(--color-success)' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'paid', label: 'Pagada' },
] as const

// ---- State ----
const searchQuery = ref('')
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = val }, 250)
})
const searchDropdownOpen = ref(false)
const globalSearchEnabled = computed(() => debouncedSearch.value.trim().length >= 2)
const { data: globalSearchResults, isFetching: globalSearchLoading } = useQuery({
  queryKey: computed(() => ['agenda-search', businessId.value, currentBranchId.value, debouncedSearch.value.trim()]),
  queryFn: () => searchAppointmentsGlobal(businessId.value!, debouncedSearch.value.trim(), currentBranchId.value),
  enabled: computed(() => !!businessId.value && globalSearchEnabled.value),
  staleTime: 15000,
})
const viewMode = ref<'day' | 'week' | 'month' | 'year'>('day')
const selectedDate = ref(toISODate(new Date()))
const gridContainer = ref<HTMLElement | null>(null)
const statusMenu = ref<{ appointmentId: string; currentStatus: string; x: number; y: number } | null>(null)
const empDropdownOpen = ref(false)

// ---- Drag to reschedule (vertical only — same day/employee column, just changes the time) ----
interface DragState {
  apptId: string
  raw: any
  startPointerY: number
  originalTop: number
  height: number
  durationMs: number
  columnDateIso: string
  employeeId: string | undefined
  moved: boolean
  previewTop: number
  snappedStartMs: number
}
const dragState = ref<DragState | null>(null)
const suppressNextClick = ref(false)
const DRAG_THRESHOLD_PX = 5

// Mobile viewport width for responsive decisions
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const gridMinWidth = computed(() => {
  if (viewMode.value === 'week') return Math.max(640, gridColumns.value.length * 90)
  if (viewMode.value === 'day' && gridColumns.value.length > 3) return Math.max(640, gridColumns.value.length * 120)
  return 0
})

const selectedEmployeeName = computed(() => {
  if (selectedEmployeeId.value === 'all') return ''
  return employees.value?.find(e => e.id === selectedEmployeeId.value)?.full_name || ''
})

const viewOptions = [
  { value: 'day' as const, label: 'Día', shortLabel: 'D' },
  { value: 'week' as const, label: 'Semana', shortLabel: 'S' },
  { value: 'month' as const, label: 'Mes', shortLabel: 'M' },
  { value: 'year' as const, label: 'Año', shortLabel: 'A' },
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

function selectGlobalResult(raw: any) {
  const iso = toISODate(new Date(raw.start_time))
  if (selectedEmployeeId.value !== 'all' && selectedEmployeeId.value !== raw.employee_id && selectedEmployeeId.value !== raw.assistant_employee_id) {
    selectedEmployeeId.value = 'all'
  }
  goToDate(iso)
  searchDropdownOpen.value = false
  searchQuery.value = ''
}

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
interface DisplayAppointment { id: string; clientName: string; service: string; time: string; top: number; height: number; startMs: number; endMs: number; left: number; width: number; status: string; employeeInitials: string; employeeName: string; employeeColor: string; raw: any; isGroup?: boolean; groupServices?: string[] }

// Lays overlapping appointments side by side (like Google Calendar) instead of
// letting them stack on top of each other. Groups appointments into clusters of
// mutually-overlapping time ranges, then greedily packs each cluster into the
// fewest columns needed, splitting width evenly among however many columns that
// cluster ended up using.
function layoutOverlaps(appts: DisplayAppointment[]): DisplayAppointment[] {
  const sorted = [...appts].sort((a, b) => a.startMs - b.startMs)
  const clusters: DisplayAppointment[][] = []
  let current: DisplayAppointment[] = []
  let clusterEnd = -Infinity
  for (const appt of sorted) {
    if (current.length && appt.startMs >= clusterEnd) {
      clusters.push(current)
      current = []
      clusterEnd = -Infinity
    }
    current.push(appt)
    clusterEnd = Math.max(clusterEnd, appt.endMs)
  }
  if (current.length) clusters.push(current)

  const result: DisplayAppointment[] = []
  for (const cluster of clusters) {
    const columnEnds: number[] = []
    const columnOf = new Map<DisplayAppointment, number>()
    for (const appt of cluster) {
      let placed = false
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= appt.startMs) {
          columnEnds[c] = appt.endMs
          columnOf.set(appt, c)
          placed = true
          break
        }
      }
      if (!placed) {
        columnEnds.push(appt.endMs)
        columnOf.set(appt, columnEnds.length - 1)
      }
    }
    const numCols = columnEnds.length
    for (const appt of cluster) {
      const col = columnOf.get(appt)!
      result.push({ ...appt, left: (col / numCols) * 100, width: (1 / numCols) * 100 })
    }
  }
  return result
}

function buildDisplayAppointments(appts: any[]): any[] {
  const result: any[] = []
  const groupEmployeeMap = new Map<string, any[]>()

  for (const a of appts) {
    if (!a.group_id) {
      result.push(a)
      continue
    }
    const key = `${a.group_id}:${a.employee_id}`
    const existing = groupEmployeeMap.get(key)
    if (!existing) {
      groupEmployeeMap.set(key, [a])
      result.push(a)
    } else {
      existing.push(a)
    }
  }

  return result
}

function buildGroupMemberMap(appts: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>()
  for (const a of appts) {
    if (!a.group_id) continue
    const existing = map.get(a.group_id)
    if (existing) {
      existing.push(a)
    } else {
      map.set(a.group_id, [a])
    }
  }
  return map
}

function mapAppt(a: any, svcMap: Map<string, any>, empName: string, groupMemberMap: Map<string, any[]>, colorMap: Map<string, string>): DisplayAppointment {
  const start = new Date(a.start_time); const end = new Date(a.end_time)
  const svc = svcMap.get(a.service_id)
  const topMin = (start.getHours() * 60 + start.getMinutes()) - (START_HOUR * 60)
  const groupAllMembers = a.group_id ? (groupMemberMap.get(a.group_id) ?? []) : []
  const isGroup = groupAllMembers.length > 1
  const groupServices = isGroup
    ? groupAllMembers.map((m: any) => svcMap.get(m.service_id)?.name || 'Servicio')
    : undefined
  return {
    id: a.id,
    clientName: a.client?.full_name || a.clients?.full_name || 'Cliente',
    service: svc?.name || 'Servicio',
    time: dateToHHmm12(start),
    top: Math.max(0, (topMin / 60) * HOUR_HEIGHT + 1),
    height: ((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT,
    startMs: start.getTime(),
    endMs: end.getTime(),
    left: 0,
    width: 100,
    status: normalizeAppointmentStatus(a),
    employeeInitials: getInitials(empName),
    employeeName: empName,
    employeeColor: colorMap.get(a.employee_id) || DEFAULT_EMPLOYEE_COLOR,
    raw: a,
    isGroup,
    groupServices,
  }
}

const gridColumns = computed<GridColumn[]>(() => {
  if (viewMode.value === 'month' || viewMode.value === 'year') return []

  const emps = employees.value ?? []
  const empId = selectedEmployeeId.value
  const appts = buildDisplayAppointments(appointments.value ?? [])
  const svcMap = serviceMap.value
  const empMap = employeeMap.value
  const colorMap = employeeColorMap.value
  const groupMemberMap = buildGroupMemberMap(appointments.value ?? [])
  const q = debouncedSearch.value.toLowerCase()

  // Parse each appointment's date once instead of re-parsing it per day column / per employee column below.
  const isoDateByAppt = new Map<any, string>()
  for (const a of appts) {
    isoDateByAppt.set(a, toISODate(new Date(a.start_time)))
  }

  if (viewMode.value === 'week') {
    const sel = new Date(selectedDate.value + 'T12:00:00')
    const sow = new Date(sel); sow.setDate(sel.getDate() - sel.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sow); d.setDate(sow.getDate() + i)
      const iso = toISODate(d)
      const dayAppts = layoutOverlaps(appts
        .filter(a => isoDateByAppt.get(a) === iso && (empId === 'all' || a.employee_id === empId) && (!q || ((a.client?.full_name || a.clients?.full_name) || '').toLowerCase().includes(q)))
        .map(a => mapAppt(a, svcMap, empMap.get(a.employee_id)?.full_name || '', groupMemberMap, colorMap)))
      const isT = iso === todayIso.value
      return { key: iso, label: dayNames[d.getDay()], number: d.getDate(), isToday: isT, widthPercent: 100 / 7, appointments: dayAppts }
    })
  }

  let cols = empId !== 'all' ? emps.filter(e => e.id === empId).map(e => ({ id: e.id, name: e.full_name })) : emps.map(e => ({ id: e.id, name: e.full_name }))
  if (!cols.length) cols = [{ id: '__default__', name: 'Citas' }]

  return cols.map(c => {
    const cAppts = layoutOverlaps(appts
      .filter(a => (c.id === '__default__' || (isoDateByAppt.get(a) === selectedDate.value && a.employee_id === c.id)) && (!q || ((a.client?.full_name || a.clients?.full_name) || '').toLowerCase().includes(q)))
      .map(a => mapAppt(a, svcMap, c.name, groupMemberMap, colorMap)))
    return { key: c.id, label: c.id === '__default__' ? 'Citas' : c.name.split(' ')[0], avatar: c.id === '__default__' ? undefined : getInitials(c.name), widthPercent: 100 / cols.length, appointments: cAppts }
  })
})

// ---- Occupancy / gaps panel ----
const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const occupancyOpen = ref(false)

const selectedDayLabel = computed(() => {
  const d = parseLocalDate(selectedDate.value, 12, 0, 0)
  return `${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES_FULL[d.getMonth()]}`
})

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatMinutesAsClock(totalMin: number): string {
  const h24 = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`
}

interface OccupancyGap { label: string; minutes: number }
interface OccupancyRow { id: string; name: string; pctBooked: number; gaps: OccupancyGap[] }

const occupancyRows = computed<OccupancyRow[]>(() => {
  const emps = employees.value ?? []
  const weekday = parseLocalDate(selectedDate.value, 12, 0, 0).getDay()
  const gridWindow = { start: START_HOUR * 60, end: END_HOUR * 60 }

  const schedMap = new Map<string, { start: number; end: number }>()
  for (const s of (schedules.value ?? []) as any[]) {
    if (s.weekday === weekday && s.employee_id) {
      schedMap.set(s.employee_id, { start: timeStrToMinutes(s.start_time), end: timeStrToMinutes(s.end_time) })
    }
  }

  const dayAppts = (appointments.value ?? []).filter((a: any) => {
    const status = normalizeAppointmentStatus(a)
    if (status === 'cancelled' || status === 'no_show') return false
    return toISODate(new Date(a.start_time)) === selectedDate.value
  })

  return emps.map((emp: any) => {
    const win = schedMap.get(emp.id) ?? gridWindow
    const winMinutes = Math.max(0, win.end - win.start)

    const busy: [number, number][] = []
    for (const a of dayAppts) {
      if (a.employee_id !== emp.id && a.assistant_employee_id !== emp.id) continue
      const s = new Date(a.start_time); const e = new Date(a.end_time)
      const sMin = Math.max(win.start, s.getHours() * 60 + s.getMinutes())
      const eMin = Math.min(win.end, e.getHours() * 60 + e.getMinutes())
      if (eMin > sMin) busy.push([sMin, eMin])
    }
    busy.sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const [s, e] of busy) {
      const last = merged[merged.length - 1]
      if (last && s <= last[1]) last[1] = Math.max(last[1], e)
      else merged.push([s, e])
    }
    const bookedMinutes = merged.reduce((sum, [s, e]) => sum + (e - s), 0)
    const pctBooked = winMinutes > 0 ? Math.round((bookedMinutes / winMinutes) * 100) : 100

    const gaps: OccupancyGap[] = []
    let cursor = win.start
    for (const [s, e] of merged) {
      if (s - cursor >= 15) gaps.push({ label: `${formatMinutesAsClock(cursor)} – ${formatMinutesAsClock(s)}`, minutes: s - cursor })
      cursor = Math.max(cursor, e)
    }
    if (win.end - cursor >= 15) gaps.push({ label: `${formatMinutesAsClock(cursor)} – ${formatMinutesAsClock(win.end)}`, minutes: win.end - cursor })

    return { id: emp.id, name: emp.full_name, pctBooked, gaps }
  }).sort((a, b) => a.pctBooked - b.pctBooked)
})

// ---- Card styling ----
const statusColors: Record<string, { bg: string; dot: string; stripe: string; checkout: string }> = {
  confirmed: { bg: 'bg-amber-50/80 dark:bg-amber-950/30', dot: 'bg-warning', stripe: 'bg-warning', checkout: 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white' },
  pending: { bg: 'bg-red-50/70 dark:bg-red-950/30', dot: 'bg-danger', stripe: 'bg-danger', checkout: 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white' },
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

function isDraggable(appt: DisplayAppointment): boolean {
  return appt.status !== 'paid' && appt.status !== 'cancelled' && !appt.isGroup
}

function onCardPointerDown(appt: DisplayAppointment, col: GridColumn, e: PointerEvent) {
  if (e.button > 0) return
  if ((e.target as HTMLElement).closest('button')) return
  if (!isDraggable(appt)) return
  dragState.value = {
    apptId: appt.id,
    raw: appt.raw,
    startPointerY: e.clientY,
    originalTop: appt.top,
    height: appt.height,
    durationMs: new Date(appt.raw.end_time).getTime() - new Date(appt.raw.start_time).getTime(),
    columnDateIso: viewMode.value === 'week' ? col.key : selectedDate.value,
    employeeId: appt.raw.employee_id,
    moved: false,
    previewTop: appt.top,
    snappedStartMs: new Date(appt.raw.start_time).getTime(),
  }
  window.addEventListener('pointermove', onDragPointerMove)
  window.addEventListener('pointerup', onDragPointerEnd, { once: true })
}

function onDragPointerMove(e: PointerEvent) {
  const ds = dragState.value
  if (!ds) return
  const deltaY = e.clientY - ds.startPointerY
  if (!ds.moved && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return
  ds.moved = true

  let newTop = ds.originalTop + deltaY
  newTop = Math.max(0, Math.min(newTop, totalGridHeight - ds.height))
  const minsFromStart = (newTop / HOUR_HEIGHT) * 60
  const snappedMins = Math.round(minsFromStart / 15) * 15
  ds.previewTop = (snappedMins / 60) * HOUR_HEIGHT

  const newStart = parseLocalDate(ds.columnDateIso, 0, 0, 0)
  newStart.setMinutes(START_HOUR * 60 + snappedMins)
  ds.snappedStartMs = newStart.getTime()
}

function onDragPointerEnd() {
  window.removeEventListener('pointermove', onDragPointerMove)
  const ds = dragState.value
  if (!ds) return
  if (ds.moved) {
    suppressNextClick.value = true
    const newStart = new Date(ds.snappedStartMs)
    const newEnd = new Date(ds.snappedStartMs + ds.durationMs)
    emit('eventChange', { id: ds.apptId, start: newStart.toISOString(), end: newEnd.toISOString(), employeeId: ds.employeeId })
  }
  dragState.value = null
}

function dragPreviewLabel(): string {
  const ds = dragState.value
  if (!ds) return ''
  const start = new Date(ds.snappedStartMs)
  const end = new Date(ds.snappedStartMs + ds.durationMs)
  return `${dateToHHmm12(start)} - ${dateToHHmm12(end)}`
}

function emitEventClick(raw: any) {
  const start = new Date(raw.start_time); const end = new Date(raw.end_time)
  const status = normalizeAppointmentStatus(raw)
  const citaData = mapAppointmentToCita(raw)
  emit('eventClick', {
    id: raw.id, title: raw.client?.full_name || raw.clients?.full_name || 'Cliente', start, end, status,
    citaData,
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
  emit('statusChange', { id, status: s as 'pending' | 'confirmed' | 'paid' })
  statusMenu.value = null
}

function onDocClick(e: MouseEvent) { if (statusMenu.value && !(e.target as HTMLElement)?.closest('.fixed')) statusMenu.value = null; if (empDropdownOpen.value && !(e.target as HTMLElement)?.closest('.relative')) empDropdownOpen.value = false; if (occupancyOpen.value && !(e.target as HTMLElement)?.closest('.relative')) occupancyOpen.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('pointermove', onDragPointerMove)
  window.removeEventListener('pointerup', onDragPointerEnd)
})

// ---- Detail Popup ----
const detailPopup = ref<{ appt: DisplayAppointment; x: number; y: number } | null>(null)

const POPUP_HEIGHT = 260

function getPopupWidth(): number {
  return Math.min(288, window.innerWidth - 16)
}

function showDetailPopup(appt: DisplayAppointment, e: MouseEvent) {
  if (suppressNextClick.value) { suppressNextClick.value = false; return }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = getPopupWidth()
  let x = e.clientX - w / 2
  let y = e.clientY + 12

  // Right edge: anchor to right of screen
  if (x + w > vw - 8) x = vw - w - 8
  // Left edge: anchor to left
  if (x < 8) x = 8

  // Bottom edge: open above the click
  if (y + POPUP_HEIGHT > vh - 8) y = e.clientY - POPUP_HEIGHT - 12
  if (y < 8) y = 8

  detailPopup.value = { appt, x, y }
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
    confirmed: 'text-warning', pending: 'text-danger', paid: 'text-success',
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
