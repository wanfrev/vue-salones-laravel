<template>
  <div class="min-h-screen bg-bg">
    <!-- Top Header -->
    <header class="fixed left-0 right-0 top-0 z-50 bg-surface border-b border-border pt-[var(--safe-top)]">
      <div class="flex h-16 items-center justify-between px-2 sm:px-4">
      <div class="flex items-center gap-1 sm:gap-2 min-w-0">
        <button @click="isSidebarOpen = !isSidebarOpen" class="rounded-lg p-2 text-text-secondary transition-theme hover:bg-bg-secondary shrink-0 lg:hidden">
          <HamburgerMenuIcon :size="24" />
        </button>
        <div class="flex flex-col shrink-0">
          <img :src="lumaLogo" alt="Luma" class="h-7 w-auto object-contain" />
        </div>
        <BranchSwitcher v-if="businessStore.isMultiBranch && !isEncargado" class="shrink-0" />
        <button @click="refresh" :disabled="isRefreshing" title="Recargar datos" class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
          <RefreshIcon :size="16" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>
      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <InvitationsButton />
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
        <router-view />
      </div>
    </main>

    <DailyExchangeRateModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/common/useAuth'
import { useThemeStore } from '../../store/theme'
import { HamburgerMenuIcon, RefreshIcon, LogoutIcon } from '@solar-icons/vue/linear'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import InvitationsButton from '../agenda/InvitationsButton.vue'
import { BranchSwitcher } from '../common'
import GlobalLoading from '../common/GlobalLoading.vue'
import DailyExchangeRateModal from '../common/DailyExchangeRateModal.vue'
import { useBusinessStore } from '../../store/business'
import { getInitials } from '../../lib/formatters'

const { logout, loading, authStore } = useAuth()
const themeStore = useThemeStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const isSidebarOpen = ref(false)
const profileOpen = ref(false)
const isRefreshing = ref(false)
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))
const isEncargado = computed(() => authStore.role === 'encargado')

async function refresh() {
  isRefreshing.value = true
  try {
    await queryClient.refetchQueries({ type: 'active' })
  } finally {
    isRefreshing.value = false
  }
}

onMounted(() => {
  if (isEncargado.value && authStore.profile?.branch_id) {
    businessStore.setBranch(authStore.profile.branch_id)
  }
})
</script>
