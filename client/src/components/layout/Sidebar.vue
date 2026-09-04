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

        <template v-for="link in section.links" :key="link.to">
          <!-- Expandable group (e.g. Configuración) — the header toggles, sub-links navigate. -->
          <div v-if="link.children && link.children.length">
            <button
              type="button"
              @click="toggleExpanded(link.to)"
              :class="[
                'group mb-0.5 flex w-full items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-2 text-left text-sm font-medium transition-theme',
                isGroupActive(link)
                  ? 'border-primary bg-bg-secondary text-text'
                  : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text'
              ]"
            >
              <span :class="[
                'flex h-7 w-7 items-center justify-center rounded-md transition-theme',
                isGroupActive(link) ? 'text-primary' : 'bg-bg-secondary group-hover:bg-border'
              ]">
                <component :is="link.icon" class="h-4 w-4" />
              </span>
              <span class="flex-1">{{ resolveLabel(link) }}</span>
              <svg
                class="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded(link.to) }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="isExpanded(link.to)" class="mb-1 ml-4 space-y-0.5 border-l border-border pl-3">
              <router-link
                v-for="child in link.children"
                :key="child.to"
                :to="child.to"
                :class="[
                  'flex items-center gap-2.5 rounded-lg py-2 pr-3 pl-2 text-[13px] font-medium transition-theme',
                  isActive(child.to)
                    ? 'bg-bg-secondary text-text font-semibold'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
                ]"
              >
                <component :is="child.icon" class="h-3.5 w-3.5 shrink-0" />
                {{ resolveLabel(child) }}
              </router-link>
            </div>
          </div>

          <router-link
            v-else
            :to="link.to"
            :class="[
              'group mb-0.5 flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-2 text-sm font-medium transition-theme',
              isActive(link.to)
                ? 'border-primary bg-bg-secondary text-text'
                : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text'
            ]"
          >
            <span :class="[
              'flex h-7 w-7 items-center justify-center rounded-md transition-theme',
              isActive(link.to) ? 'text-primary' : 'bg-bg-secondary group-hover:bg-border'
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
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole, isEncargado } from '../../constants/roles'
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
// Stricter than isAdmin (which also lets an encargado through) — admin/superadmin only, for
// links whose page content is itself gated that strictly (e.g. Configuración's sub-pages).
const isStrictAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')

const isLinkVisible = (link: SidebarLink): boolean => {
  if (link.strictAdminOnly && !isStrictAdmin.value) return false
  if (link.adminOnly && !isAdmin.value) {
    // Empleados de tienda con permisos
    if (link.to === '/admin/pos' && authStore.profile?.can_access_pos) return true
    if (link.to === '/admin/inventario' && authStore.profile?.can_access_inventory) return true
    if (link.to === '/admin/proveedores' && authStore.profile?.can_access_suppliers) return true
    if (link.to === '/admin/requerimientos' && authStore.profile?.can_access_requirements) return true
    return false
  }
  if (link.employeeOnly && isAdmin.value) {
    // Encargados earn commissions/salary like empleados, so they keep access to their own report.
    const isEncargadoReport = isEncargado(authStore.role ?? undefined) &&
      (link.to === '/dashboard/comisiones' || link.to === '/dashboard/recibo')
    if (!isEncargadoReport) return false
  }
  if (link.employeeOnly && authStore.role === 'empleado' && businessStore.features.employees_recibo_only && link.to !== '/dashboard/recibo') {
    return false
  }
  return evaluateGate(link.gate, {
    profile: authStore.profile,
    hasFeature: (key) => businessStore.hasFeature(key),
    hasCapability: (capability) => businessStore.hasCapability(capability),
  })
}

const visibleSections = computed(() =>
  sidebarSections
    .map(section => ({
      ...section,
      links: section.links
        .filter(isLinkVisible)
        .map(link => link.children ? { ...link, children: link.children.filter(isLinkVisible) } : link)
        .filter(link => !link.children || link.children.length > 0),
    }))
    .filter(section => {
      return !section.adminOnly || isAdmin.value || section.links.some(l =>
        ['/admin/pos', '/admin/inventario', '/admin/proveedores', '/admin/requerimientos'].includes(l.to)
      )
    })
    .filter(section => section.links.length > 0)
)

const isActive = (path: string): boolean => route.path === path
const isGroupActive = (link: SidebarLink): boolean =>
  !!link.children?.some(child => isActive(child.to))

// Auto-open a group when the current route is one of its children; a manual toggle overrides
// that default (in either direction) until toggled again.
const expandedOverrides = ref<Record<string, boolean>>({})
const isExpanded = (to: string): boolean => {
  const link = sidebarSections.flatMap(s => s.links).find(l => l.to === to)
  const autoOpen = !!link?.children?.some(child => isActive(child.to))
  return expandedOverrides.value[to] ?? autoOpen
}
const toggleExpanded = (to: string) => {
  expandedOverrides.value = { ...expandedOverrides.value, [to]: !isExpanded(to) }
}

const resolveLabel = (link: SidebarLink): string => {
  if (link.labelKey) {
    const term = (businessStore.terminology as Record<string, string>)[link.labelKey]
    return term || link.label
  }
  return link.label
}


</script>
