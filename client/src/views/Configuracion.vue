<template>
  <header class="mb-6 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Configuración</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Ajustes del Negocio</h1>
        <p class="mt-1 text-sm text-text-muted">Personaliza la experiencia de tu equipo y clientes</p>
      </div>
    </div>
  </header>

  <div class="space-y-5 lg:space-y-6">

    <!-- ═══════════ GENERAL ═══════════ -->
    <section class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-text">General</h2>
          <p class="text-xs text-text-muted">Apariencia, seguridad y preferencias básicas</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Tema -->
        <div class="rounded-xl border border-border-subtle bg-bg-secondary/40 p-5">
          <h3 class="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <svg class="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Tema
          </h3>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="opt in themeOptions" :key="opt.value"
              @click="themeStore.setMode(opt.value)"
              class="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-3.5 transition-all duration-200 cursor-pointer min-w-[90px]"
              :class="themeStore.mode === opt.value ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-border hover:border-border-strong hover:bg-surface'"
            >
              <component :is="opt.icon" class="h-6 w-6 transition-colors" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text-muted'" />
              <span class="text-xs font-semibold" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text'">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Cambiar clave -->
        <div class="rounded-xl border border-border-subtle bg-bg-secondary/40 p-5">
          <h3 class="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <svg class="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Cambiar clave
          </h3>
          <form @submit.prevent="handleChangePassword" class="space-y-3">
            <div class="space-y-2.5">
              <div class="relative">
                <input
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  required
                  placeholder="Contraseña actual"
                  class="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted disabled:opacity-50"
                  :disabled="passwordLoading"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <button type="button" @click="showCurrentPassword = !showCurrentPassword"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:text-text transition-colors"
                  :disabled="passwordLoading" tabindex="-1">
                  <svg v-if="!showCurrentPassword" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required minlength="6"
                  placeholder="Nueva clave (mín. 6 caracteres)"
                  class="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted disabled:opacity-50"
                  :disabled="passwordLoading"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                <button type="button" @click="showNewPassword = !showNewPassword"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:text-text transition-colors"
                  :disabled="passwordLoading" tabindex="-1">
                  <svg v-if="!showNewPassword" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
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
    </section>

    <!-- ═══════════ WHATSAPP ═══════════ -->
    <section v-if="businessStore.features.whatsapp_reminders_enabled" class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-text">WhatsApp</h2>
          <p class="text-xs text-text-muted">Configuración de WhatsApp para recordatorios automáticos</p>
        </div>
      </div>
      <WhatsAppSettings />
    </section>

    <!-- ═══════════ PERMISOS Y FUNCIONALIDADES (admin) ═══════════ -->
    <section v-if="isAdmin" class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-text">Permisos y Funcionalidades</h2>
          <p class="text-xs text-text-muted">Controla qué pueden hacer tus encargados y empleados</p>
        </div>
      </div>

      <div class="space-y-8">
        <!-- Subcategoría: Encargados -->
        <div>
          <div class="flex items-center gap-2.5 mb-2 px-1">
            <svg class="h-4 w-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span class="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Encargados</span>
          </div>
          <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
            <FormToggle
              :model-value="!!businessStore.features.disable_manager_inventory_edit"
              @update:model-value="toggleManagerInventoryEdit"
              label="Desactivar edición de inventario"
              hint="Los encargados solo podrán ver el inventario y vender en el POS, sin ajustar cantidades ni costos."
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
            <FormToggle
              :model-value="!!businessStore.features.encargados_change_exchange_rate"
              @update:model-value="handleToggleEncargadoExchangeRate"
              label="Permitir cambiar la tasa del día"
              hint="Los encargados podrán modificar la tasa de cambio principal Bs/$"
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
            <FormToggle
              :model-value="!!businessStore.features.encargados_change_employee_rate"
              @update:model-value="handleToggleEncargadoEmployeeRate"
              label="Permitir cambiar tasa de empleados"
              hint="Los encargados podrán modificar la tasa Bs asignada a cada empleado"
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
            <FormToggle
              :model-value="!!businessStore.features.disable_employee_commission_edit"
              @update:model-value="handleToggleDisableCommissionEdit"
              label="Bloquear edición de comisiones"
              hint="Encargados y empleados NO podrán modificar porcentajes de ganancia en las citas"
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
          </div>
        </div>

        <!-- Subcategoría: Empleados -->
        <div>
          <div class="flex items-center gap-2.5 mb-2 px-1">
            <svg class="h-4 w-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span class="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Empleados</span>
          </div>
          <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
            <FormToggle
              :model-value="!!businessStore.features.employees_see_clients"
              @update:model-value="handleToggleEmployeesSeeClients"
              label="Permitir módulo de clientes"
              hint="Los empleados tendrán acceso al módulo de Clientes en su menú lateral"
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
            <FormToggle
              :model-value="!!businessStore.features.hide_client_phone_from_employees"
              @update:model-value="handleToggleHideClientPhone"
              label="Ocultar teléfono y email de clientes"
              hint="Los empleados no verán datos de contacto de clientes. No impedirá crear citas."
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
          </div>
        </div>

        <!-- Subcategoría: POS y Ventas -->
        <div>
          <div class="flex items-center gap-2.5 mb-2 px-1">
            <svg class="h-4 w-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span class="text-[11px] font-bold text-text-secondary uppercase tracking-widest">POS y Ventas</span>
          </div>
          <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
            <FormToggle
              :model-value="!!businessStore.features.pos_direct_service_sale"
              @update:model-value="handleToggleDirectServiceSale"
              label="Cobro directo de servicios en POS"
              hint="Permite cobrar servicios al instante sin necesidad de agendar una cita previamente"
              :disabled="updatingFeatures"
              class="px-5 py-5"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ NOTIFICACIONES ═══════════ -->
    <section class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-text">Notificaciones y recordatorios</h2>
          <p class="text-xs text-text-muted">Configura alertas, recordatorios automáticos y reservas públicas</p>
        </div>
      </div>

      <div class="rounded-xl border border-border-subtle bg-bg-secondary/40 p-5 space-y-1 divide-y divide-border-subtle">

        <!-- Recordatorios internos 24h y 1h -->
        <div class="py-4 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-text">Recordatorios internos de cita</label>
            <button
              @click="handleToggleFeature('reminder_24h_enabled')"
              :disabled="updatingFeatures"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="businessStore.features.reminder_24h_enabled ? 'bg-primary' : 'bg-border-subtle'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="businessStore.features.reminder_24h_enabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <p class="text-xs text-text-muted">Notifica en la campanita 24h y 1h antes de cada cita. No requiere WhatsApp.</p>
        </div>

        <!-- Recordatorios por WhatsApp -->
        <div class="py-4 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-text">Recordatorios por WhatsApp</label>
            <button
              @click="handleToggleFeature('whatsapp_reminders_enabled')"
              :disabled="updatingFeatures"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="businessStore.features.whatsapp_reminders_enabled ? 'bg-primary' : 'bg-border-subtle'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="businessStore.features.whatsapp_reminders_enabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <p class="text-xs text-text-muted">Envía recordatorios 24h y 1h antes por WhatsApp. Requiere conectar WhatsApp en la sección de abajo.</p>
        </div>

        <!-- Recordatorios de citas pendientes -->
        <div class="py-4 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-text">Recordatorio de citas sin confirmar</label>
            <button
              @click="togglePendingNotifications(!businessStore.features.pending_notifications_enabled)"
              :disabled="updatingFeatures"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="businessStore.features.pending_notifications_enabled ? 'bg-primary' : 'bg-border-subtle'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="businessStore.features.pending_notifications_enabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <p class="text-xs text-text-muted mb-1">Recibe un resumen diario de las citas que aún no han sido confirmadas</p>

          <div v-if="businessStore.features.pending_notifications_enabled" class="mt-3">
            <label class="text-xs font-medium text-text-secondary mb-1.5 block">Recibir resumen de citas pendientes a las:</label>
            <div class="flex items-center gap-2">
              <select
                v-model.number="pendingNotificationHour12"
                @change="handlePendingHourSelect"
                :disabled="updatingFeatures"
                class="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none"
                style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;12&quot; height=&quot;12&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;%236b7280&quot; stroke-width=&quot;2&quot;><path d=&quot;M6 9l6 6 6-6&quot;/></svg>'); background-repeat: no-repeat; background-position: right 8px center;"
              >
                <option v-for="h in hours12" :key="h.value" :value="h.value">{{ h.label }}</option>
              </select>
              <button
                @click="toggleAmPm"
                :disabled="updatingFeatures"
                class="rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-bg-secondary min-w-[44px]"
                :class="isPM ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-secondary'"
              >
                {{ isPM ? 'PM' : 'AM' }}
              </button>
            </div>
            <p class="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Todos los días a las {{ displayNotificationHour }}
            </p>
          </div>
        </div>

        <!-- Reservas públicas / Invitaciones -->
        <div class="py-4 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-text">Reservas públicas por link</label>
            <button
              @click="handleToggleFeature('enable_public_booking')"
              :disabled="updatingFeatures"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="businessStore.features.enable_public_booking ? 'bg-primary' : 'bg-border-subtle'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="businessStore.features.enable_public_booking ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <p class="text-xs text-text-muted">Permite que clientes agenden citas mediante un link compartible. Los empleados podrán enviar invitaciones desde su agenda.</p>
        </div>

        <!-- Recordatorio de citas pendientes -->
    </section>

    <!-- ═══════════ SUCURSALES ═══════════ -->
    <template v-if="businessStore.isMultiBranch">

      <section class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-text">Sucursales</h2>
            <p class="text-xs text-text-muted">Gestiona las ubicaciones físicas de tu negocio</p>
          </div>
          <button
            @click="branchesCtx.openNew()"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
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
            class="group rounded-xl border border-border bg-bg-secondary/50 p-4 transition-all duration-200 hover:border-border-strong hover:shadow-sm"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
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
                class="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-surface hover:text-text"
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
        <!-- Notificaciones Push -->
        <div v-if="pushSupported" class="py-4 first:pt-0 last:pb-0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-text">Notificaciones Push</label>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="pushPermission === 'granted' ? 'bg-success/10 text-success' : pushPermission === 'denied' ? 'bg-danger/10 text-danger' : 'bg-bg-secondary text-text-muted'"
              >
                {{ pushPermission === 'granted' ? 'Activadas' : pushPermission === 'denied' ? 'Bloqueadas' : 'No configuradas' }}
              </span>
              <button
                v-if="pushPermission === 'granted'"
                @click="handleDisablePush" :disabled="pushLoading"
                class="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50 transition-colors"
              >
                <svg v-if="pushLoading" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <span v-else>Desactivar</span>
              </button>
              <button
                v-else-if="pushPermission === 'denied'"
                disabled
                class="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted cursor-not-allowed opacity-50"
              >Bloqueado</button>
              <button
                v-else
                @click="handleEnablePush" :disabled="pushLoading"
                class="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                <svg v-if="pushLoading" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <span v-else>Activar</span>
              </button>
            </div>
          </div>
          <p class="text-xs text-text-muted">
            <template v-if="pushPermission === 'granted'">
              Recibirás alertas de nuevas citas y recordatorios aunque tengas la app en segundo plano.
            </template>
            <template v-else-if="pushPermission === 'denied'">
              Las notificaciones están bloqueadas. Ve a Ajustes del navegador para permitirlas.
            </template>
            <template v-else>
              Recibe recordatorios y alertas directamente en tu pantalla, incluso con la app cerrada.
            </template>
          </p>
        </div>

      </div>
    </section>

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
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { useBranches } from '../composables/common/useBranches'
import { useNotification } from '../composables/common/useNotification'
import { useThemeStore, type ThemeMode } from '../store/theme'
import { SectionCard, EmptyState } from '../components/common'
import { FormToggle } from '../components/forms'
import { BranchFormModal } from '../components/modals'
import WhatsAppSettings from '../components/settings/WhatsAppSettings.vue'
import { requestNotificationPermission } from '../composables/common/useNotifications'
import { unsubscribeFromPush, isPushSupported } from '../services/pushService'
import { apiRequest } from '../lib/api'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const themeStore = useThemeStore()
const { success, error: showError } = useNotification()
const businessId = computed(() => authStore.businessId)
const isAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')
const branchesCtx = useBranches(businessId)
const updatingFeatures = ref(false)

async function handleToggleEncargadoExchangeRate(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, encargados_change_exchange_rate: val }
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(val ? 'Permiso activado: Los encargados ya pueden modificar la tasa de empleados' : 'Permiso desactivado')
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(val ? 'Permiso activado: Se permite el cobro directo de servicios en el POS' : 'Permiso desactivado: Cobro directo de servicios deshabilitado')
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
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

const pendingNotificationHour = ref<number | null>(businessStore.features.pending_notifications_hour ?? 9)

const hours12 = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}:00`,
}))

const isPM = computed(() => (pendingNotificationHour.value ?? 9) >= 12)
const pendingNotificationHour12 = computed({
  get: () => {
    const h = pendingNotificationHour.value ?? 9
    if (h === 0 || h === 12) return 12
    return h > 12 ? h - 12 : h
  },
  set: (val: number) => { /* noop — synced via handlePendingHourSelect */ },
})

const displayNotificationHour = computed(() => {
  const h = pendingNotificationHour.value ?? 9
  const h12 = h === 0 || h === 12 ? 12 : h > 12 ? h - 12 : h
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h12}:00 ${ampm}`
})

function toggleAmPm() {
  if (pendingNotificationHour.value === null) return
  const current = pendingNotificationHour.value
  if (current >= 12) {
    pendingNotificationHour.value = current - 12
  } else {
    pendingNotificationHour.value = current + 12
  }
  handlePendingNotificationHourChange()
}

function handlePendingHourSelect() {
  const hour12 = pendingNotificationHour12.value
  const base = isPM.value ? 12 : 0
  if (hour12 === 12) {
    pendingNotificationHour.value = isPM.value ? 12 : 0
  } else {
    pendingNotificationHour.value = base + hour12
  }
  handlePendingNotificationHourChange()
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
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(val ? 'Permiso activado: Desactivada edición de inventario para encargados' : 'Permiso desactivado: Permitida edición de inventario')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar el permiso')
  } finally {
    updatingFeatures.value = false
  }
}

async function togglePendingNotifications(val: boolean) {
  if (!businessId.value) return
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, pending_notifications_enabled: val }
    if (!val) {
      pendingNotificationHour.value = null
    } else if (pendingNotificationHour.value === null) {
      pendingNotificationHour.value = 9
    }
    updatedFeatures.pending_notifications_hour = pendingNotificationHour.value
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(val ? 'Notificaciones de citas pendientes activadas' : 'Notificaciones de citas pendientes desactivadas')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar las notificaciones')
  } finally {
    updatingFeatures.value = false
  }
}

async function handlePendingNotificationHourChange() {
  if (!businessId.value || pendingNotificationHour.value === null) return
  updatingFeatures.value = true
  try {
    const hour = Math.max(0, Math.min(23, pendingNotificationHour.value))
    pendingNotificationHour.value = hour
    const updatedFeatures = { ...businessStore.features, pending_notifications_hour: hour }
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(`Hora de notificación actualizada a las ${String(hour).padStart(2, '0')}:00`)
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar la hora')
  } finally {
    updatingFeatures.value = false
  }
}

async function handleToggleFeature(featureKey: string) {
  if (!businessId.value) return
  const current = businessStore.features[featureKey]
  const newVal = !current
  updatingFeatures.value = true
  try {
    const updatedFeatures = { ...businessStore.features, [featureKey]: newVal }
    await apiRequest('PUT', `/businesses/${businessId.value}`, {
      features: updatedFeatures,
    })
    businessStore.updateBusiness({ features: updatedFeatures } as any)
    success(newVal ? 'Configuración activada' : 'Configuración desactivada')
  } catch (err: any) {
    showError(err?.message ?? 'Error al actualizar la configuración')
  } finally {
    updatingFeatures.value = false
  }
}

</script>
