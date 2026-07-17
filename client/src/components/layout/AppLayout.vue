<template>
  <div class="min-h-screen bg-bg">
    <!-- Top Header -->
    <header class="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-surface border-b border-border px-4">
      <div class="flex items-center gap-2">
        <button @click="isSidebarOpen = !isSidebarOpen" class="rounded-lg p-2 text-text-secondary transition-theme hover:bg-bg-secondary lg:hidden">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img :src="lumaLogo" alt="Luma" class="-ml-1 h-7 w-auto object-contain" />
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-text leading-tight">{{ businessName }}</span>
          <span class="text-[10px] text-text-muted uppercase tracking-wide">{{ roleLabel }}</span>
        </div>
          <BranchSwitcher v-if="businessStore.isMultiBranch && !isEmployee" />
      </div>
      <div class="flex items-center gap-2">
        <slot name="header-actions" />
        <button @click="refresh" :disabled="isRefreshing" title="Recargar datos" class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <NotificationBell />
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
            <button @click="logout" :disabled="loading" class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
          <div v-if="profileOpen" class="fixed inset-0 z-40" @click="profileOpen = false" />
        </div>
      </div>
    </header>

    <Sidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 top-16 z-30 bg-black/50 lg:hidden"></div>

    <main class="ml-0 min-h-screen pt-16 lg:ml-64">
      <GlobalLoading />
      <div class="p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/common/useAuth'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { useBusinessStore } from '../../store/business'
import { db } from '../../lib/api'
import { useRealtime } from '../../composables/realtime/useRealtime'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import { BranchSwitcher } from '../common'
import GlobalLoading from '../common/GlobalLoading.vue'
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

const roleLabel = computed(() => {
  const role = authStore.role
  if (role === 'admin') return 'Admin'
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
