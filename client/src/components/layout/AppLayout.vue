<template>
  <div class="min-h-screen bg-bg">
    <!-- Top Header -->
    <header class="fixed left-0 right-0 top-0 z-50 bg-surface border-b border-border pt-[var(--safe-top)]">
      <div class="flex h-16 items-center justify-between px-1.5 sm:px-4">
      <div class="flex items-center gap-1 sm:gap-2 min-w-0">
        <button @click="isSidebarOpen = !isSidebarOpen" class="rounded-lg p-2 text-text-secondary transition-theme hover:bg-bg-secondary shrink-0 lg:hidden">
          <HamburgerMenuIcon :size="24" />
        </button>
        <img :src="lumaLogo" alt="Luma" class="-ml-1 h-7 w-auto object-contain shrink-0" />
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-semibold text-text leading-tight truncate max-w-[84px] sm:max-w-[200px]">{{ businessName }}</span>
          <span class="text-[10px] text-text-muted uppercase tracking-wide">{{ roleLabel }}</span>
        </div>
        <BranchSwitcher v-if="businessStore.isMultiBranch && !isEmployee && !isEncargado" class="shrink-0" />
        <BusinessSwitcher v-if="!isEmployee && !isEncargado" class="shrink-0" />
      </div>
      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <slot name="header-actions" />
        <button @click="refresh" :disabled="isRefreshing" title="Recargar datos" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed">
          <RefreshIcon :size="18" :class="{ 'animate-spin': isRefreshing }" />
        </button>
        <InvitationsButton />
        <NotificationBell v-if="!(isEmployee && businessStore.features.employees_recibo_only)" />
        <div class="relative">
          <button @click="profileOpen = !profileOpen" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-[10px] font-bold text-text-inverse shadow-sm">
              {{ getInitials(authStore.profile?.full_name) }}
            </div>
          </button>
          <div v-if="profileOpen" class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
            <div class="px-4 py-3 border-b border-border">
              <p class="text-sm font-medium text-text truncate">{{ authStore.profile?.full_name || 'Usuario' }}</p>
              <p class="text-xs text-text-muted capitalize">{{ authStore.role }}</p>
            </div>
            <router-link
              to="/admin/configuracion"
              @click="profileOpen = false"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text border-b border-border"
            >
              <SettingsIcon :size="16" />
              Configuración
            </router-link>
            <button @click="logout" :disabled="loading" class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <LogoutIcon :size="16" />
              Cerrar sesión
            </button>
          </div>
          <div v-if="profileOpen" class="fixed inset-0 z-40" @click="profileOpen = false" />
        </div>
      </div>
      </div>
    </header>

    <Sidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 top-[var(--header-total)] z-30 bg-black/50 lg:hidden"></div>

    <main class="ml-0 min-h-screen pt-[var(--header-total)] lg:ml-64">
      <GlobalLoading />
      <div class="p-4 lg:p-6">
        <slot />
      </div>
    </main>

    <DailyExchangeRateModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/common/useAuth'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { useBusinessStore } from '../../store/business'
import { HamburgerMenuIcon, RefreshIcon, LogoutIcon, SettingsIcon } from '@solar-icons/vue/linear'
import { db } from '../../lib/api'
import { useRealtime } from '../../composables/realtime/useRealtime'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import InvitationsButton from '../agenda/InvitationsButton.vue'
import { BranchSwitcher, BusinessSwitcher } from '../common'
import GlobalLoading from '../common/GlobalLoading.vue'
import DailyExchangeRateModal from '../common/DailyExchangeRateModal.vue'
import { getInitials } from '../../lib/formatters'

const { logout, loading } = useAuth()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

useRealtime()

const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const isSidebarOpen = ref(false)
const profileOpen = ref(false)

const businessName = computed(() => businessStore.business?.name ?? '')

const isEmployee = computed(() => authStore.role === 'empleado')
const isEncargado = computed(() => authStore.role === 'encargado')

const roleLabel = computed(() => {
  const role = authStore.role
  if (role === 'admin') return 'Admin'
  if (role === 'encargado') return 'Encargado'
  if (role === 'empleado') return 'Empleado'
  if (role === 'superadmin') return 'Superadmin'
  return ''
})

const isRefreshing = ref(false)

async function refresh() {
  isRefreshing.value = true
  try {
    await queryClient.refetchQueries({ type: 'active' })
  } finally {
    isRefreshing.value = false
  }
}

onMounted(async () => {
  if (isEncargado.value && authStore.profile?.branch_id) {
    businessStore.setBranch(authStore.profile.branch_id)
    return
  }

  if (!isEmployee.value || !businessStore.isMultiBranch || !authStore.profile?.id) return
  if (authStore.profile.branch_id) {
    businessStore.setBranch(authStore.profile.branch_id)
    return
  }
  const { data } = await db
    .from('employee_schedules')
    .select('branch_id')
    .eq('employee_id', authStore.profile.id)
    .limit(1)
    .maybeSingle()
  if (data?.branch_id) {
    businessStore.setBranch(data.branch_id)
  }
})
</script>
