<template>
  <div class="min-h-screen bg-bg">
    <!-- Top Header -->
    <header v-if="!hideHeaderAndSidebar" class="fixed left-0 right-0 top-0 z-50 bg-surface border-b border-border pt-[var(--safe-top)]">
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

    <!-- Minimal Employee Header when hideHeaderAndSidebar is active -->
    <header v-else class="fixed left-0 right-0 top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border pt-[var(--safe-top)] px-4 py-3">
      <div class="flex items-center justify-between">
        <button
          @click="goBackToDashboard"
          class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-xs transition-theme hover:bg-bg-secondary hover:border-border-strong cursor-pointer"
        >
          <ArrowLeftIcon :size="16" />
          <span>Volver al panel</span>
        </button>
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs font-semibold text-text truncate max-w-[150px] sm:max-w-[300px]">{{ businessStore.business?.name }}</span>
          <span class="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Finanzas</span>
        </div>
      </div>
    </header>

    <Sidebar v-if="!hideHeaderAndSidebar" :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div v-if="!hideHeaderAndSidebar && isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 top-[var(--header-total)] z-30 bg-black/50 lg:hidden"></div>

    <main :class="['min-h-screen', hideHeaderAndSidebar ? 'ml-0 pt-16' : 'ml-0 pt-[var(--header-total)] lg:ml-64']">
      <GlobalLoading />
      <div class="p-4 lg:p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../composables/common/useAuth'
import { useThemeStore } from '../../store/theme'
import { HamburgerMenuIcon, RefreshIcon, LogoutIcon, ArrowLeftIcon } from '@solar-icons/vue/linear'
import lumaLogoLight from '../../assets/Luma.svg'
import lumaLogoDark from '../../assets/Luma blanco.svg'
import Sidebar from './Sidebar.vue'
import NotificationBell from '../common/NotificationBell.vue'
import { BranchSwitcher } from '../common'
import GlobalLoading from '../common/GlobalLoading.vue'
import { useBusinessStore } from '../../store/business'
import { getInitials } from '../../lib/formatters'
import { isTiendaNiche } from '../../config/niches'
import { isAdminPanelRole, resolveHomeByRole } from '../../constants/roles'

const route = useRoute()
const router = useRouter()
const { logout, loading, authStore } = useAuth()
const themeStore = useThemeStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const isSidebarOpen = ref(false)
const profileOpen = ref(false)
const isRefreshing = ref(false)
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))
const isEncargado = computed(() => authStore.role === 'encargado')
const isEmployee = computed(() => !isAdminPanelRole(authStore.role ?? undefined))
const isTienda = computed(() => isTiendaNiche(businessStore.nicheType))

const hideHeaderAndSidebar = computed(() => {
  return isTienda.value && isEmployee.value && route.path.includes('/finanzas')
})

function goBackToDashboard() {
  const home = resolveHomeByRole(authStore.role ?? undefined, authStore.profile?.disable_agenda, businessStore.features.agenda, businessStore.features.pos)
  router.push(home)
}

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
