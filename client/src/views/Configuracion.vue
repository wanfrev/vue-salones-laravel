<template>
  <header class="mb-5 lg:mb-8">
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
      </div>
    </div>
  </header>

  <!-- Apariencia -->
  <SectionCard
    class="mb-6"
    title="Apariencia"
    subtitle="Personaliza el tema visual de la aplicación"
    icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
  >
    <div class="flex items-center gap-4">
      <button
        v-for="opt in themeOptions" :key="opt.value"
        @click="themeStore.setMode(opt.value)"
        class="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-theme cursor-pointer min-w-[100px]"
        :class="themeStore.mode === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong'"
      >
        <component :is="opt.icon" class="h-6 w-6" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text-muted'" />
        <span class="text-sm font-medium" :class="themeStore.mode === opt.value ? 'text-primary' : 'text-text'">{{ opt.label }}</span>
      </button>
    </div>
  </SectionCard>

  <!-- Notificaciones Push -->
  <SectionCard
    v-if="pushSupported"
    class="mb-6"
    title="Notificaciones Push"
    subtitle="Recibe alertas en tu teléfono incluso con la app cerrada"
    icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
  >
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-text-secondary">
          <template v-if="pushPermission === 'granted'">
            Las notificaciones push están <span class="font-semibold text-green-600">activadas</span>. Recibirás alertas de nuevas citas y recordatorios en tu teléfono.
          </template>
          <template v-else-if="pushPermission === 'denied'">
            Las notificaciones están <span class="font-semibold text-red-500">bloqueadas</span>. Para activarlas, ve a Ajustes &gt; Safari &gt; Notificaciones en tu iPhone y permite las notificaciones para este sitio.
          </template>
          <template v-else>
            Activa las alertas para recibir notificaciones de nuevas citas y recordatorios directamente en tu teléfono, incluso con la pantalla bloqueada.
          </template>
        </p>
      </div>
      <div class="shrink-0">
        <button
          v-if="pushPermission === 'granted'"
          @click="handleDisablePush"
          :disabled="pushLoading"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50"
        >
          <svg v-if="pushLoading" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span v-else>Desactivar</span>
        </button>
        <button
          v-else-if="pushPermission === 'denied'"
          disabled
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted cursor-not-allowed opacity-50"
        >
          Bloqueado
        </button>
        <button
          v-else
          @click="handleEnablePush"
          :disabled="pushLoading"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20 disabled:opacity-50"
        >
          <svg v-if="pushLoading" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Activar notificaciones
        </button>
      </div>
    </div>
  </SectionCard>

  <!-- Permisos del Negocio -->
  <SectionCard
    v-if="isAdmin"
    class="mb-6"
    title="Permisos de Encargados"
    subtitle="Configura qué acciones pueden realizar los empleados con rol de Encargado"
    icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  >
    <div class="space-y-4">
      <FormToggle
        :model-value="businessStore.hasFeature('encargados_change_exchange_rate')"
        label="Permitir a Encargados cambiar la Tasa del Día"
        hint="Los empleados con nivel de acceso de Encargado podrán modificar la tasa de cambio USD/VES en el POS y Finanzas"
        :disabled="updatingFeatures"
        @update:model-value="handleToggleEncargadoExchangeRate"
      />
      <FormToggle
        :model-value="businessStore.hasFeature('encargados_change_employee_rate')"
        label="Permitir a Encargados cambiar la Tasa de Empleados"
        hint="Los empleados con nivel de acceso de Encargado podrán modificar la tasa exclusiva para empleados en la sección de Equipo"
        :disabled="updatingFeatures"
        @update:model-value="handleToggleEncargadoEmployeeRate"
      />
    </div>
  </SectionCard>

  <!-- Not enabled gate -->
  <div v-if="!businessStore.isMultiBranch" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary mb-4">
      <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 class="text-lg font-semibold text-text">Múltiples sucursales no disponible</h2>
    <p class="mt-1 text-sm text-text-muted max-w-md">Esta funcionalidad no está habilitada para tu plan actual. Contacta al administrador del sistema para activarla.</p>
  </div>

  <template v-else>
    <!-- Sucursales -->
    <SectionCard
      title="Sucursales"
      subtitle="Gestiona las ubicaciones físicas de tu negocio"
      icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    >
      <template #header-actions>
        <button
          @click="branchesCtx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva sucursal
        </button>
      </template>

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
          class="group rounded-lg border border-border bg-bg-secondary/50 p-4 transition-theme hover:border-border-strong"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text truncate">{{ branch.name }}</p>
                <p v-if="branch.address" class="text-xs text-text-muted truncate">{{ branch.address }}</p>
              </div>
            </div>
            <span v-if="branch.is_default" class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span>
          </div>
          <p v-if="branch.phone" class="text-xs text-text-muted mb-3">{{ branch.phone }}</p>
          <div class="flex gap-2">
            <button
              @click="branchesCtx.openEdit(branch)"
              class="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text"
            >
              Editar
            </button>
            <button
              v-if="!branch.is_default"
              @click="branchesCtx.handleDelete(branch.id)"
              :disabled="branchesCtx.deleteMutation.isPending.value"
              class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50"
              title="Eliminar sucursal"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </SectionCard>

    <!-- Branch Form Modal -->
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
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { useBranches } from '../composables/common/useBranches'
import { useNotification } from '../composables/common/useNotification'
import { useThemeStore, type ThemeMode } from '../store/theme'
import { SectionCard, EmptyState } from '../components/common'
import { FormToggle } from '../components/forms'
import { BranchFormModal } from '../components/modals'
import { requestNotificationPermission } from '../composables/common/useNotifications'
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '../services/pushService'
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

</script>
