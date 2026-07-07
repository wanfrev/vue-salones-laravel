<template>
  <aside
    :class="[
      'fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-border shadow-xl transition-theme transition-transform duration-300 lg:translate-x-0 flex flex-col',
      isOpen ? 'z-40 translate-x-0' : 'z-40 -translate-x-full lg:z-40'
    ]"
  >
    <nav class="flex-1 overflow-y-auto px-3 pt-4 pb-2">
      <template v-for="section in visibleSections" :key="section.title ?? 'main'">
        <p v-if="section.title" class="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted/70">
          {{ section.title }}
        </p>

        <router-link
          v-for="link in section.links"
          :key="link.to"
          :to="link.to"
          :class="[
            'group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-theme',
            isActive(link.to)
              ? 'bg-primary text-text-inverse shadow-sm'
              : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
          ]"
        >
          <span :class="[
            'flex h-7 w-7 items-center justify-center rounded-md transition-theme',
            isActive(link.to) ? 'bg-white/20' : 'bg-bg-secondary group-hover:bg-border'
          ]">
            <component :is="link.icon" class="h-4 w-4" />
          </span>
          <span class="flex-1">{{ resolveLabel(link) }}</span>
          <span
            v-if="link.badge && !isActive(link.to)"
            class="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary"
          >
            {{ link.badge }}
          </span>
        </router-link>
      </template>
    </nav>

    <div class="border-t border-border bg-bg-secondary p-3 shrink-0">
      <div class="flex items-center gap-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-xs font-bold text-text-inverse shadow-sm">
          {{ getInitials(authStore.profile?.full_name) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="truncate text-sm font-medium text-text leading-tight">{{ authStore.profile?.full_name || 'Usuario' }}</p>
          <p class="text-[10px] text-text-muted capitalize">{{ authStore.role }}</p>
        </div>
        <button @click="logout" :disabled="loading" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-border hover:text-text disabled:opacity-40 disabled:cursor-not-allowed" title="Cerrar sesión">
          <svg v-if="!loading" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole } from '../../constants/roles'
import { getInitials } from '../../lib/formatters'
import { sidebarSections } from './sidebarLinks'
import type { SidebarLink } from './sidebarLinks'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const { logout, loading, authStore } = useAuth()
const businessStore = useBusinessStore()

const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))
const agendaDisabled = computed(() => authStore.profile?.disable_agenda ?? false)

const visibleSections = computed(() =>
  sidebarSections
    .map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.adminOnly && !isAdmin.value) return false
        if (link.employeeOnly && isAdmin.value) return false
        if (link.requiresFeature && !businessStore.hasFeature(link.requiresFeature as any)) return false
        if (link.hideIfAgendaDisabled && agendaDisabled.value) return false
        return true
      }),
    }))
    .filter(section => !section.adminOnly || isAdmin.value)
    .filter(section => section.links.length > 0)
)

const isActive = (path: string): boolean => route.path === path

const resolveLabel = (link: SidebarLink): string => {
  if (link.labelKey) {
    const term = (businessStore.terminology as Record<string, string>)[link.labelKey]
    return `${term || link.label}s`
  }
  return link.label
}


</script>
