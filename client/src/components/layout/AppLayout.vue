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
        <ThemeToggle />
        <NotificationBell />
        <button @click="logout" :disabled="loading" class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>

    <Sidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 top-16 z-30 bg-black/50 lg:hidden"></div>

    <main class="ml-0 min-h-screen pt-16 lg:ml-64">
      <div class="p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/useAuth'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { useBusinessStore } from '../../store/business'
import { supabase } from '../../lib/supabase'
import { useRealtimeSync } from '../../composables/useRealtimeSync'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import ThemeToggle from '../common/ThemeToggle.vue'
import { BranchSwitcher } from '../common'

const { logout, loading } = useAuth()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

useRealtimeSync(() => authStore.businessId)

const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const isSidebarOpen = ref(false)

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
    await queryClient.invalidateQueries()
    await queryClient.refetchQueries({ type: 'active' })
  } finally {
    isRefreshing.value = false
  }
}

onMounted(async () => {
  if (!isEmployee.value || !businessStore.isMultiBranch || !authStore.profile?.id) return
  const { data } = await supabase
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
