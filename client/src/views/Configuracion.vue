<template>
  <header class="mb-6 lg:mb-8">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
      <SettingsIcon class="h-3.5 w-3.5" />
      <span>Configuración</span>
    </div>
  </header>

  <div class="flex flex-col gap-6 lg:flex-row lg:gap-10">

    <!-- Desktop: in-page side nav -->
    <nav class="hidden lg:block w-56 shrink-0">
      <p class="mb-3 px-2.5 text-[10.5px] font-bold uppercase tracking-widest text-text-muted">Secciones</p>
      <button
        v-for="s in sections" :key="s.id"
        @click="activeSection = s.id"
        class="mb-0.5 flex w-full items-center gap-2.5 rounded-lg border-l-2 py-2.5 pr-3 pl-2.5 text-left text-[13.5px] font-medium transition-theme"
        :class="activeSection === s.id ? [s.activeBorder, s.activeBg, 'text-text font-semibold'] : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text'"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" :class="s.iconBg">
          <svg class="h-3.5 w-3.5" :class="s.iconText" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="s.icon" />
          </svg>
        </span>
        {{ s.label }}
      </button>
    </nav>

    <!-- Mobile / tablet: horizontal pill row -->
    <div class="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      <button
        v-for="s in sections" :key="s.id"
        @click="activeSection = s.id"
        class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-theme"
        :class="activeSection === s.id ? [s.activeBorderSolid, s.activeBg, 'text-text'] : 'border-border text-text-secondary'"
      >
        <svg class="h-3.5 w-3.5" :class="activeSection === s.id ? s.iconText : 'text-text-muted'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="s.icon" />
        </svg>
        {{ s.shortLabel || s.label }}
      </button>
    </div>

    <!-- Content -->
    <div class="min-w-0 flex-1 pb-8">

      <!-- ═══════════ GENERAL ═══════════ -->
      <div v-if="activeSection === 'general'">
        <div class="mb-7">
          <h1 class="text-lg font-bold text-text">General</h1>
          <p class="text-xs text-text-muted mt-0.5">Apariencia, seguridad y preferencias básicas de tu cuenta.</p>
        </div>

        <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <!-- Tema -->
          <div>
            <h3 class="text-sm font-semibold text-text mb-1">Tema</h3>
            <p class="text-xs text-text-muted mb-3.5">Elige cómo se ve el sistema en este dispositivo.</p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="opt in themeOptions" :key="opt.value"
                @click="themeStore.setMode(opt.value)"
                class="card-hairline flex flex-1 flex-col items-center gap-2 rounded-xl p-3.5 transition-all duration-200 cursor-pointer min-w-[90px]"
                :class="themeStore.mode === opt.value ? 'border-primary' : 'hover:border-border-strong'"
                :style="themeStore.mode === opt.value ? { backgroundColor: 'rgba(134, 156, 132, 0.1)' } : {}"
              >
                <component :is="opt.icon" class="h-6 w-6 transition-colors" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text-muted'" />
                <span class="text-xs font-semibold" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text'">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- Cambiar clave -->
          <div>
            <h3 class="text-sm font-semibold text-text mb-1">Cambiar contraseña</h3>
            <p class="text-xs text-text-muted mb-3.5">Usa al menos 6 caracteres.</p>
            <form @submit.prevent="handleChangePassword" class="space-y-3">
              <div class="space-y-2.5">
                <div class="relative">
                  <input
                    v-model="passwordForm.currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    required
                    placeholder="Contraseña actual"
                    class="w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-9 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted disabled:opacity-50"
                    :disabled="passwordLoading"
                  />
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <button type="button" @click="showCurrentPassword = !showCurrentPassword"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:text-text transition-colors"
                    :disabled="passwordLoading" tabindex="-1">
                    <EyeIcon v-if="!showCurrentPassword" class="h-4 w-4" />
                    <EyeClosedIcon v-else class="h-4 w-4" />
                  </button>
                </div>
                <div class="relative">
                  <input
                    v-model="passwordForm.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required minlength="6"
                    placeholder="Nueva clave (mín. 6 caracteres)"
                    class="w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-9 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted disabled:opacity-50"
                    :disabled="passwordLoading"
                  />
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  <button type="button" @click="showNewPassword = !showNewPassword"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:text-text transition-colors"
                    :disabled="passwordLoading" tabindex="-1">
                    <EyeIcon v-if="!showNewPassword" class="h-4 w-4" />
                    <EyeClosedIcon v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <p v-if="passwordError" class="text-xs text-danger">{{ passwordError }}</p>
                <p v-else-if="passwordSuccess" class="text-xs text-success font-medium">{{ passwordSuccess }}</p>
                <span v-else></span>
                <button
                  type="submit"
                  :disabled="passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword.length < 6"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg v-if="passwordLoading" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ═══════════ WHATSAPP ═══════════ -->
      <div v-else-if="activeSection === 'whatsapp'">
        <div class="mb-7">
          <h1 class="text-lg font-bold text-text">WhatsApp</h1>
          <p class="text-xs text-text-muted mt-0.5">Configuración de WhatsApp para recordatorios automáticos.</p>
        </div>
        <WhatsAppSettings />
      </div>

      <!-- ═══════════ PERMISOS Y FUNCIONALIDADES ═══════════ -->
      <div v-else-if="activeSection === 'permisos'">
        <div class="mb-7">
          <h1 class="text-lg font-bold text-text">Permisos y funcionalidades</h1>
          <p class="text-xs text-text-muted mt-0.5">Controla qué pueden hacer tus encargados y empleados dentro del sistema.</p>
        </div>

        <div class="space-y-6">
          <!-- Encargados -->
          <div v-if="showEncargadosSection">
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Encargados</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                v-if="businessStore.features.inventario"
                :model-value="!!businessStore.features.disable_manager_inventory_edit"
                @update:model-value="toggleManagerInventoryEdit"
                label="Desactivar edición de inventario"
                hint="Los encargados solo podrán ver el inventario y vender en el POS, sin ajustar cantidades ni costos."
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                v-if="!businessStore.isSingleCurrency"
                :model-value="!!businessStore.features.encargados_change_exchange_rate"
                @update:model-value="handleToggleEncargadoExchangeRate"
                label="Permitir cambiar la tasa del día"
                hint="Los encargados podrán modificar la tasa de cambio principal Bs/$"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                v-if="!businessStore.isSingleCurrency"
                :model-value="!!businessStore.features.encargados_change_employee_rate"
                @update:model-value="handleToggleEncargadoEmployeeRate"
                label="Permitir cambiar tasa de empleados"
                hint="Los encargados podrán modificar la tasa Bs asignada a cada empleado"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                v-if="businessStore.features.agenda"
                :model-value="!!businessStore.features.disable_employee_commission_edit"
                @update:model-value="handleToggleDisableCommissionEdit"
                label="Bloquear edición de comisiones"
                hint="Encargados y empleados NO podrán modificar porcentajes de ganancia en las citas"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                v-if="businessStore.features.pos"
                :model-value="!!businessStore.features.encargado_product_commission_enabled"
                @update:model-value="handleToggleFeature('encargado_product_commission_enabled')"
                label="Comisión por venta de productos"
                hint="Los encargados ganarán el % que les asignes sobre las ventas directas de productos que ellos mismos procesen en el POS"
                :disabled="updatingFeatures"
                class="py-3.5 last:border-b-0"
              />
            </div>
          </div>

          <div v-if="showEncargadosSection" class="h-px bg-border"></div>

          <!-- Empleados -->
          <div>
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Empleados</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                :model-value="!!businessStore.features.employees_see_clients"
                @update:model-value="handleToggleEmployeesSeeClients"
                label="Permitir módulo de clientes"
                hint="Los empleados tendrán acceso al módulo de Clientes en su menú lateral"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                :model-value="!!businessStore.features.hide_client_phone_from_employees"
                @update:model-value="handleToggleHideClientPhone"
                label="Ocultar teléfono y email de clientes"
                hint="Los empleados no verán datos de contacto de clientes. No impedirá crear citas."
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                :model-value="!!businessStore.features.employees_recibo_only"
                @update:model-value="handleToggleFeature('employees_recibo_only')"
                label="Los empleados solo ven su recibo"
                hint="Oculta Agenda, Historial, Comisiones, Clientes y todo lo demás del menú del empleado — solo queda Recibo. No afecta a encargados."
                :disabled="updatingFeatures"
                class="py-3.5 last:border-b-0"
              />
            </div>
          </div>

          <div v-if="showPayrollRateSection" class="h-px bg-border"></div>

          <!-- Nómina -->
          <div v-if="showPayrollRateSection">
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6c1.11 0 2.08.402 2.599 1M12 8V6.5m0 1.5v6m0 0V17m0-1.5c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Nómina</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                :model-value="!!businessStore.features.payroll_locked_exchange_rate"
                @update:model-value="handleTogglePayrollLockedRate"
                label="Pagar a empleados con la tasa del día del servicio"
                hint="Los montos en Bs de comisiones y propinas se calculan con la tasa de cambio del día en que se realizó cada servicio, no la tasa actual."
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                :model-value="!!businessStore.features.payroll_currency_breakdown_enabled"
                @update:model-value="handleToggleFeature('payroll_currency_breakdown_enabled')"
                label="Desglose de comisión por moneda de cobro"
                hint="Al pagar nómina, muestra cuánto generó el empleado en dólares y cuánto en bolívares según cómo le cobraron a cada cliente"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                :model-value="!!businessStore.features.payroll_day_average_rate_enabled"
                @update:model-value="handleToggleFeature('payroll_day_average_rate_enabled')"
                label="Pagos por día y tasa promedio"
                hint="Al pagar nómina, se pide cuántos dólares se le entregan al empleado y a qué tasa, para calcular cuánto se descuenta del saldo pendiente en bolívares."
                :disabled="updatingFeatures"
                class="py-3.5 last:border-b-0"
              />
            </div>
          </div>

          <div v-if="showPosVentasSection" class="h-px bg-border"></div>

          <!-- POS y Ventas -->
          <div v-if="showPosVentasSection">
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">POS y ventas</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                v-if="businessStore.features.agenda"
                :model-value="!!businessStore.features.pos_direct_service_sale"
                @update:model-value="handleToggleDirectServiceSale"
                label="Cobro directo de servicios en POS"
                hint="Permite cobrar servicios al instante sin necesidad de agendar una cita previamente"
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <FormToggle
                v-if="businessStore.features.manual_reports && businessStore.features.pos"
                :model-value="!!businessStore.features.daily_report_autofill_from_pos"
                @update:model-value="handleToggleDailyReportAutofill"
                label="Traer del POS en el Reporte Diario"
                hint="Habilita el botón que llena los montos por método de pago del Reporte Diario con lo cobrado ese día en el POS"
                :disabled="updatingFeatures"
                class="py-3.5 last:border-b-0"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ NOTIFICACIONES ═══════════ -->
      <div v-else-if="activeSection === 'notificaciones'">
        <div class="mb-7">
          <h1 class="text-lg font-bold text-text">Notificaciones y recordatorios</h1>
          <p class="text-xs text-text-muted mt-0.5">Alertas automáticas, recordatorios de citas y reservas públicas por link.</p>
        </div>

        <div class="space-y-6">
          <!-- Recordatorios de citas -->
          <div>
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Recordatorios de citas</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                :model-value="!!businessStore.features.reminder_24h_enabled"
                @update:model-value="handleToggleFeature('reminder_24h_enabled')"
                label="Recordatorios internos de citas"
                hint="Notifica en la campanita con la anticipación que elijas para cada cita. No requiere WhatsApp."
                :disabled="updatingFeatures"
                class="py-3.5 border-b border-border-subtle"
              />
              <div v-if="businessStore.features.reminder_24h_enabled" class="py-3.5 border-b border-border-subtle">
                <span class="text-xs text-text-secondary">Avisar con estas anticipaciones antes de cada cita:</span>
                <div class="mt-2.5 flex flex-wrap items-center gap-2">
                  <span
                    v-for="(offset, idx) in reminderOffsets"
                    :key="idx"
                    class="flex items-center gap-1.5 rounded-full bg-surface-elevated border border-border-strong pl-3 pr-1.5 py-1 text-xs font-bold text-text"
                  >
                    {{ formatOffsetLabel(offset) }}
                    <button
                      type="button"
                      @click="removeReminderOffset(idx)"
                      :disabled="updatingFeatures"
                      class="flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label="Quitar recordatorio"
                    >
                      ×
                    </button>
                  </span>
                  <span v-if="reminderOffsets.length === 0" class="text-xs text-text-muted italic">Sin recordatorios configurados — no se enviará ninguno.</span>
                </div>
                <div class="mt-2.5 flex items-center gap-2">
                  <input
                    v-model="newOffsetValue"
                    type="number"
                    min="0.1"
                    max="720"
                    step="0.5"
                    placeholder="Ej. 24"
                    class="w-20 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary"
                  />
                  <select
                    v-model="newOffsetUnit"
                    class="rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary"
                  >
                    <option value="hours">horas antes</option>
                    <option value="minutes">minutos antes</option>
                  </select>
                  <button
                    type="button"
                    @click="addReminderOffset"
                    :disabled="updatingFeatures || !newOffsetValue"
                    class="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
              <FormToggle
                v-if="businessStore.features.whatsapp_available"
                :model-value="!!businessStore.features.whatsapp_reminders_enabled"
                @update:model-value="handleToggleFeature('whatsapp_reminders_enabled')"
                label="Recordatorios por WhatsApp"
                hint="Envía los mismos recordatorios por WhatsApp. Requiere conectarlo en la sección WhatsApp."
                :disabled="updatingFeatures"
              />
            </div>
          </div>

          <div class="h-px bg-border"></div>

          <!-- Reservas públicas -->
          <div>
            <div class="flex items-center gap-2 mb-1">
              <svg class="h-3.5 w-3.5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Reservas públicas</span>
            </div>
            <div class="pl-[22px]">
              <FormToggle
                :model-value="!!businessStore.features.enable_public_booking"
                @update:model-value="handleToggleFeature('enable_public_booking')"
                label="Reservas por link público"
                hint="Permite que clientes agenden citas mediante un link compartible. Los empleados podrán enviar invitaciones desde su agenda."
                :disabled="updatingFeatures"
                class="py-3.5"
              />
            </div>
          </div>

          <template v-if="pushSupported">
            <div class="h-px bg-border"></div>

            <!-- Push -->
            <div>
              <div class="flex items-center gap-2 mb-1">
                <svg class="h-3.5 w-3.5 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span class="text-[10.5px] font-bold text-text-muted uppercase tracking-widest">Notificaciones push</span>
              </div>
              <div class="pl-[22px] py-3.5 flex items-start justify-between gap-3 flex-wrap">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <p class="text-sm font-semibold text-text">En este navegador</p>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold border"
                      :class="pushPermission === 'granted' ? 'bg-success/10 border-success/30 text-success' : pushPermission === 'denied' ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-bg-secondary border-border text-text-muted'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                      {{ pushPermission === 'granted' ? 'Activadas' : pushPermission === 'denied' ? 'Bloqueadas' : 'No configuradas' }}
                    </span>
                  </div>
                  <p class="text-xs text-text-muted max-w-md">
                    <template v-if="pushPermission === 'granted'">Recibirás alertas de nuevas citas y recordatorios aunque tengas la app en segundo plano.</template>
                    <template v-else-if="pushPermission === 'denied'">Las notificaciones están bloqueadas. Ve a Ajustes del navegador para permitirlas.</template>
                    <template v-else>Recibe recordatorios y alertas directamente en tu pantalla, incluso con la app cerrada.</template>
                  </p>
                </div>
                <button
                  v-if="pushPermission === 'granted'"
                  @click="handleDisablePush" :disabled="pushLoading"
                  class="shrink-0 rounded-lg border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50 transition-colors"
                >
                  <svg v-if="pushLoading" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span v-else>Desactivar</span>
                </button>
                <button
                  v-else-if="pushPermission === 'denied'"
                  disabled
                  class="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-muted cursor-not-allowed opacity-50"
                >Bloqueado</button>
                <button
                  v-else
                  @click="handleEnablePush" :disabled="pushLoading"
                  class="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-text-inverse hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <svg v-if="pushLoading" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span v-else>Activar</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ═══════════ SUCURSALES ═══════════ -->
      <div v-else-if="activeSection === 'sucursales'">
        <div class="mb-7 flex items-start justify-between gap-3">
          <div>
            <h1 class="text-lg font-bold text-text">Sucursales</h1>
            <p class="text-xs text-text-muted mt-0.5">Gestiona las ubicaciones físicas de tu negocio.</p>
          </div>
          <button
            @click="branchesCtx.openNew()"
            class="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20"
          >
            <AddCircleIcon class="h-3.5 w-3.5" />
            Nueva
          </button>
        </div>

        <div v-if="branchesCtx.isLoading.value" class="flex items-center justify-center py-8">
          <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else-if="branchesCtx.branches.value.length === 0" class="py-8 text-center">
          <EmptyState
            icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            title="No hay sucursales"
            subtitle="Agrega tu primera ubicación física"
            action-label="Nueva sucursal"
            @action="branchesCtx.openNew()"
          />
        </div>

        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="branch in branchesCtx.branches.value"
            :key="branch.id"
            class="card-hairline group rounded-xl p-4 transition-all duration-200 hover:border-border-strong"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5a7.5 7.5 0 1115 0c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5z" />
                    <circle cx="12" cy="10.5" r="3" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text truncate">{{ branch.name }}</p>
                  <p v-if="branch.address" class="text-xs text-text-muted truncate">{{ branch.address }}</p>
                </div>
              </div>
              <span v-if="branch.is_default" class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span>
            </div>
            <p v-if="branch.phone" class="text-xs text-text-muted mb-3 flex items-center gap-1.5">
              <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              {{ branch.phone }}
            </p>
            <div class="flex gap-2">
              <button
                @click="branchesCtx.openEdit(branch)"
                class="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-surface-elevated hover:text-text"
              >Editar</button>
              <button
                v-if="!branch.is_default"
                @click="branchesCtx.handleDelete(branch.id)"
                :disabled="branchesCtx.deleteMutation.isPending.value"
                class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50"
                title="Eliminar sucursal"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <ModalBase
    :is-open="showPayrollRateWarning"
    title="Vas a cambiar el tipo de nómina"
    subtitle="Este cambio afecta cómo se calculan los bolívares que se le deben a tus empleados"
    variant="warning"
    icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    confirm-text="Sí, cambiar tipo de nómina"
    cancel-text="Cancelar"
    :is-loading="updatingFeatures"
    @confirm="confirmPayrollRateWarning"
    @cancel="cancelPayrollRateWarning"
    @close="cancelPayrollRateWarning"
  >
    <p class="text-sm text-text-secondary">
      A partir de ahora, los montos en bolívares de las comisiones y propinas de tus empleados se calcularán usando la tasa de cambio del día en que se realizó cada servicio, en lugar de la tasa actual. Esto también aplica a las comisiones ya generadas que aún no se han pagado, así que el saldo en Bs que ves hoy puede cambiar.
    </p>
    <p class="mt-3 text-sm text-text-secondary">
      Puedes desactivar esta opción cuando quieras para volver al cálculo con la tasa actual.
    </p>
  </ModalBase>

  <BranchFormModal
    :is-open="branchesCtx.showModal.value"
    :is-editing="!!branchesCtx.editingId.value"
    :form="branchesCtx.form.value"
    :save-error="branchesCtx.saveError.value"
    :save-mutation="branchesCtx.saveMutation"
    @close="branchesCtx.closeModal()"
    @save="branchesCtx.handleSave()"
  />
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { useBranches } from '../composables/common/useBranches'
import { useNotification } from '../composables/common/useNotification'
import { SettingsIcon, EyeIcon, EyeClosedIcon, AddCircleIcon } from '@solar-icons/vue/linear'
import { useThemeStore, type ThemeMode } from '../store/theme'
import { EmptyState, ModalBase } from '../components/common'
import { FormToggle } from '../components/forms'
import { BranchFormModal } from '../components/modals'
import WhatsAppSettings from '../components/settings/WhatsAppSettings.vue'
import { requestNotificationPermission } from '../composables/common/useNotifications'
import { unsubscribeFromPush, isPushSupported } from '../services/pushService'
import { apiRequest } from '../lib/api'
import { isTiendaNiche, isStaffingNiche } from '../config/niches'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const themeStore = useThemeStore()
const { success, error: showError } = useNotification()
const businessId = computed(() => authStore.businessId)
const isAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')
const branchesCtx = useBranches(businessId)
const updatingFeatures = ref(false)

const activeSection = ref('general')

const SECTION_ICONS = {
  general: 'M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  whatsapp: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  permisos: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  notificaciones: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  sucursales: 'M4.5 10.5a7.5 7.5 0 1115 0c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5zM15 10.5a3 3 0 11-6 0 3 3 0 016 0z',
} as const

// Cada punto de acceso a la izquierda lleva un color de identidad propio, tomado de la
// misma paleta que ya usa el resto del sistema (semánticos + índigo, ya en uso en KpiCards).
const SECTION_STYLES: Record<string, { iconBg: string; iconText: string; activeBorder: string; activeBorderSolid: string; activeBg: string }> = {
  general: { iconBg: 'bg-primary/10', iconText: 'text-primary', activeBorder: 'border-primary', activeBorderSolid: 'border-primary', activeBg: 'bg-primary/10' },
  whatsapp: { iconBg: 'bg-success/10', iconText: 'text-success', activeBorder: 'border-success', activeBorderSolid: 'border-success', activeBg: 'bg-success/10' },
  permisos: { iconBg: 'bg-warning/10', iconText: 'text-warning', activeBorder: 'border-warning', activeBorderSolid: 'border-warning', activeBg: 'bg-warning/10' },
  notificaciones: { iconBg: 'bg-info/10', iconText: 'text-info', activeBorder: 'border-info', activeBorderSolid: 'border-info', activeBg: 'bg-info/10' },
  sucursales: { iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-500', activeBorder: 'border-indigo-500', activeBorderSolid: 'border-indigo-500', activeBg: 'bg-indigo-500/10' },
}

// Each toggle below only means something for niches with the matching capability — a
// tienda/staffing business has no agenda, no dual currency, etc. Hiding the whole
// subcategory (not just the individual toggles) avoids leaving an empty bordered box.
const showEncargadosSection = computed(() =>
  businessStore.features.inventario || !businessStore.isSingleCurrency || businessStore.features.agenda || businessStore.features.pos
)
const showPosVentasSection = computed(() =>
  businessStore.features.agenda || (businessStore.features.manual_reports && businessStore.features.pos)
)
const showPayrollRateSection = computed(() =>
  !isTiendaNiche(businessStore.nicheType) && !isStaffingNiche(businessStore.nicheType) && !businessStore.isSingleCurrency
)

const sections = computed(() => {
  const list = [
    { id: 'general', label: 'General', shortLabel: 'General', visible: true },
    { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WhatsApp', visible: businessStore.features.whatsapp_available && businessStore.features.agenda },
    { id: 'permisos', label: 'Permisos y funcionalidades', shortLabel: 'Permisos', visible: isAdmin.value },
    { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'Notif.', visible: businessStore.features.agenda },
    { id: 'sucursales', label: 'Sucursales', shortLabel: 'Sucursales', visible: businessStore.isMultiBranch },
  ]
  return list.filter(s => s.visible).map(s => ({ ...s, icon: SECTION_ICONS[s.id as keyof typeof SECTION_ICONS], ...SECTION_STYLES[s.id] }))
})

async function handleToggleEncargadoExchangeRate(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, encargados_change_exchange_rate: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: Los encargados ya pueden modificar la tasa del día' : 'Permiso desactivado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleEncargadoEmployeeRate(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, encargados_change_employee_rate: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: Los encargados ya pueden modificar la tasa de empleados' : 'Permiso desactivado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

const showPayrollRateWarning = ref(false)

function handleTogglePayrollLockedRate(val: boolean) {
  if (!val) {
    savePayrollLockedRate(false)
    return
  }
  showPayrollRateWarning.value = true
}

function cancelPayrollRateWarning() {
  showPayrollRateWarning.value = false
}

async function confirmPayrollRateWarning() {
  await savePayrollLockedRate(true)
  showPayrollRateWarning.value = false
}

async function savePayrollLockedRate(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, payroll_locked_exchange_rate: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Tipo de nómina actualizado: se usará la tasa del día de cada servicio' : 'Tipo de nómina actualizado: se usará la tasa actual')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleDisableCommissionEdit(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, disable_employee_commission_edit: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: encargados y empleados no pueden editar comisiones' : 'Permiso desactivado: pueden editar comisiones')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleDirectServiceSale(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, pos_direct_service_sale: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: Se permite el cobro directo de servicios en el POS' : 'Permiso desactivado: Cobro directo de servicios deshabilitado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleDailyReportAutofill(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, daily_report_autofill_from_pos: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: El Reporte Diario puede traer los montos del POS' : 'Permiso desactivado: Traer del POS deshabilitado')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleEmployeesSeeClients(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, employees_see_clients: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Módulo de clientes activado para empleados' : 'Módulo de clientes desactivado para empleados (seguirán viendo nombres en sus citas)')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleHideClientPhone(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, hide_client_phone_from_employees: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Teléfono y email ocultos para empleados' : 'Teléfono y email visibles para empleados')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

const SunIcon = () =>
  h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' }),
  ])

const MoonIcon = () =>
  h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' }),
  ])

const MonitorIcon = () =>
  h('svg', { class: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }),
  ])

const themeOptions = [
  { value: 'light' as ThemeMode, label: 'Claro', icon: SunIcon },
  { value: 'dark' as ThemeMode, label: 'Oscuro', icon: MoonIcon },
  { value: 'system' as ThemeMode, label: 'Sistema', icon: MonitorIcon },
]

const pushSupported = isPushSupported()
const pushPermission = ref<NotificationPermission>('default')
const pushLoading = ref(false)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
})
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

const reminderOffsets = ref<number[]>(
  Array.isArray(businessStore.features.appointment_reminder_offsets_hours)
    ? [...businessStore.features.appointment_reminder_offsets_hours].sort((a: number, b: number) => b - a)
    : [24, 1]
)
const newOffsetValue = ref<string>('')
const newOffsetUnit = ref<'hours' | 'minutes'>('hours')

function formatOffsetLabel(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} antes`
  }
  if (Number.isInteger(hours)) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} antes`
  }
  return `${hours} horas antes`
}

async function saveReminderOffsets() {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, appointment_reminder_offsets_hours: reminderOffsets.value }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success('Recordatorios de citas actualizados')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar los recordatorios')
  } finally {
    updatingFeatures.value = false
  }
}

function addReminderOffset() {
  const raw = parseFloat(newOffsetValue.value)
  if (isNaN(raw) || raw <= 0) return
  const hours = newOffsetUnit.value === 'minutes' ? raw / 60 : raw
  const rounded = Math.round(hours * 100) / 100
  if (rounded > 720) {
    showError('La anticipación máxima es de 720 horas (30 días).')
    return
  }
  if (reminderOffsets.value.some(o => Math.abs(o - rounded) < 0.001)) {
    newOffsetValue.value = ''
    return
  }
  reminderOffsets.value = [...reminderOffsets.value, rounded].sort((a, b) => b - a)
  newOffsetValue.value = ''
  saveReminderOffsets()
}

function removeReminderOffset(idx: number) {
  reminderOffsets.value = reminderOffsets.value.filter((_, i) => i !== idx)
  saveReminderOffsets()
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (passwordForm.newPassword.length < 6) {
    passwordError.value = 'La nueva clave debe tener al menos 6 caracteres.'
    return
  }

  passwordLoading.value = true
  try {
    await apiRequest('POST', '/auth/change-password', {
      current_password: passwordForm.currentPassword,
      new_password: passwordForm.newPassword,
    })
    passwordSuccess.value = 'Contraseña actualizada correctamente.'
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    showCurrentPassword.value = false
    showNewPassword.value = false
    setTimeout(() => { passwordSuccess.value = '' }, 4000)
  } catch (err: any) {
    passwordError.value = err?.message ?? 'Error al cambiar la contraseña.'
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  if (pushSupported) {
    pushPermission.value = Notification.permission
  }
})

async function handleEnablePush() {
  pushLoading.value = true
  try {
    await requestNotificationPermission()
    pushPermission.value = Notification.permission
  } finally {
    pushLoading.value = false
  }
}

async function handleDisablePush() {
  pushLoading.value = true
  try {
    await unsubscribeFromPush()
    pushPermission.value = Notification.permission
  } finally {
    pushLoading.value = false
  }
}

async function toggleManagerInventoryEdit(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, disable_manager_inventory_edit: val }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    success(val ? 'Permiso activado: Desactivada edición de inventario para encargados' : 'Permiso desactivado: Permitida edición de inventario')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

const featureLabels: Record<string, string> = {
  reminder_24h_enabled: 'Recordatorios internos',
  whatsapp_reminders_enabled: 'Recordatorios por WhatsApp',
  encargado_product_commission_enabled: 'Comisión por venta de productos',
  payroll_currency_breakdown_enabled: 'Desglose de comisión por moneda de cobro',
  employees_recibo_only: 'Empleados solo ven su recibo',
  enable_public_booking: 'Reservas públicas',
}

async function handleToggleFeature(featureKey: string) {
  if (!businessId.value) return
  const current = businessStore.features[featureKey]
  const newVal = !current
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, [featureKey]: newVal }
    const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness(res as any)
    const label = featureLabels[featureKey] || featureKey
    success(`${label}: ${newVal ? 'Activado' : 'Desactivado'}`)
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar la configuración')
  } finally {
    updatingFeatures.value = false
  }
}
</script>
