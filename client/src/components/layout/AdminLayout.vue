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
        <div class="flex flex-col">
          <img :src="lumaLogo" alt="Luma" class="-ml-1 h-7 w-auto object-contain" />
          <span class="text-[10px] text-text-muted uppercase tracking-wide">Admin</span>
        </div>
        <BranchSwitcher v-if="businessStore.isMultiBranch" />
      </div>
      <div class="flex items-center gap-2">
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
        <router-view />
      </div>
    </main>
    <GlobalLoading />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/common/useAuth'
import { useThemeStore } from '../../store/theme'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import ThemeToggle from '../common/ThemeToggle.vue'
import { BranchSwitcher } from '../common'
import GlobalLoading from '../common/GlobalLoading.vue'
import { useBusinessStore } from '../../store/business'

const { logout, loading } = useAuth()
const themeStore = useThemeStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const isSidebarOpen = ref(false)
const isRefreshing = ref(false)
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

async function refresh() {
  isRefreshing.value = true
  try {
    await queryClient.refetchQueries({ type: 'active' })
  } finally {
    isRefreshing.value = false
  }
}
</script>
