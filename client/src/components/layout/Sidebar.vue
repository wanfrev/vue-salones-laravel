<template>
  <aside
    :class="[
      'fixed left-0 top-[var(--header-total)] h-[calc(100dvh-var(--header-total))] w-64 bg-surface border-r border-border shadow-xl transition-theme transition-transform duration-300 lg:translate-x-0 flex flex-col',
      isOpen ? 'z-40 translate-x-0' : 'z-40 -translate-x-full lg:z-40'
    ]"
  >
    <nav class="flex-1 overflow-y-auto px-3 pt-4 pb-2 touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
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
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole } from '../../constants/roles'
import { evaluateGate } from '../../router/gate'
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
const { authStore } = useAuth()
const businessStore = useBusinessStore()

const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))

const visibleSections = computed(() =>
  sidebarSections
    .map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.adminOnly && !isAdmin.value) {
          // Empleados de tienda con permisos
          if (link.to === '/admin/pos' && authStore.profile?.can_access_pos) return true
          if (link.to === '/admin/inventario' && authStore.profile?.can_access_inventory) return true
          if (link.to === '/admin/proveedores' && authStore.profile?.can_access_suppliers) return true
          return false
        }
        if (link.employeeOnly && isAdmin.value) return false
        return evaluateGate(link.gate, {
          profile: authStore.profile,
          hasFeature: (key) => businessStore.hasFeature(key),
          hasCapability: (capability) => businessStore.hasCapability(capability),
        })
      }),
    }))
    .filter(section => {
      return !section.adminOnly || isAdmin.value || section.links.some(l => 
        ['/admin/pos', '/admin/inventario', '/admin/proveedores'].includes(l.to)
      )
    })
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
